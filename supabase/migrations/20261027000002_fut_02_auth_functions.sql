-- =============================================================================
-- Gestão Inteligente · Schema "fut" · 02 — Autenticação, admin e funções (RPC)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Admin único. Para trocar o admin, altere o e-mail abaixo.
-- -----------------------------------------------------------------------------
create or replace function fut.admin_email()
returns text
language sql
immutable
as $$ select 'ferreirareuel3@gmail.com'::text $$;

-- É admin quem tem o e-mail acima E já confirmou esse e-mail no Supabase Auth.
-- (security definer: lê auth.users, que o usuário comum não pode consultar)
create or replace function fut.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and lower(u.email) = lower(fut.admin_email())
      and u.email_confirmed_at is not null
  );
$$;

-- Membro = jogador aprovado e ativo, ou o admin.
-- (security definer: evita recursão de RLS nas policies que usam esta função)
create or replace function fut.is_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select fut.is_admin()
      or exists (
        select 1
        from fut.players p
        where p.user_id = (select auth.uid())
          and p.is_active
      );
$$;

-- -----------------------------------------------------------------------------
-- Criação automática do perfil quando alguém cria conta (e-mail + senha)
-- O nome pode vir em raw_user_meta_data->>'name' (enviado pelo app no cadastro).
-- -----------------------------------------------------------------------------
create or replace function fut.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
  if v_name is null then
    v_name := split_part(new.email, '@', 1);
  end if;
  if char_length(v_name) < 2 then
    v_name := 'Jogador';
  end if;

  insert into fut.profiles (id, email, name)
  values (new.id, new.email, left(v_name, 60))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function fut.handle_new_user();

-- Mantém o e-mail do perfil sincronizado se o usuário trocar de e-mail
create or replace function fut.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update fut.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function fut.handle_user_email_change();

-- Usuários que já existiam antes deste script
insert into fut.profiles (id, email, name)
select
  u.id,
  u.email,
  left(
    case
      when char_length(coalesce(nullif(btrim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1))) < 2
        then 'Jogador'
      else coalesce(nullif(btrim(u.raw_user_meta_data ->> 'name'), ''), split_part(u.email, '@', 1))
    end,
    60
  )
from auth.users u
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- RPC: jogador pede para entrar no futebol
-- Pode pedir de novo se foi recusado (ou se foi removido depois de aprovado).
-- -----------------------------------------------------------------------------
create or replace function fut.request_join(p_message text default null)
returns fut.join_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_req fut.join_requests;
begin
  if v_uid is null then
    raise exception 'Faça login para pedir entrada.' using errcode = '28000';
  end if;

  if exists (select 1 from fut.players where user_id = v_uid and is_active) then
    raise exception 'Você já faz parte do futebol.' using errcode = 'P0001';
  end if;

  select * into v_req from fut.join_requests where user_id = v_uid;

  if not found then
    insert into fut.join_requests (user_id, message)
    values (v_uid, nullif(btrim(p_message), ''))
    returning * into v_req;
  elsif v_req.status = 'pending' then
    return v_req;
  else
    update fut.join_requests
       set status       = 'pending',
           message      = nullif(btrim(p_message), ''),
           requested_at = now(),
           decided_at   = null,
           decided_by   = null
     where id = v_req.id
    returning * into v_req;
  end if;

  return v_req;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC (admin): aprovar ou recusar um pedido. Ao aprovar, cria o jogador com nota.
-- -----------------------------------------------------------------------------
create or replace function fut.review_join_request(
  p_request_id  uuid,
  p_approve     boolean,
  p_rating      smallint default 3,
  p_membership  fut.membership_type default 'mensalista'
)
returns fut.join_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_req fut.join_requests;
begin
  if not fut.is_admin() then
    raise exception 'Apenas o administrador pode analisar pedidos.' using errcode = '42501';
  end if;

  select * into v_req from fut.join_requests where id = p_request_id for update;
  if not found then
    raise exception 'Pedido não encontrado.' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'Este pedido já foi analisado.' using errcode = 'P0001';
  end if;

  update fut.join_requests
     set status     = case when p_approve then 'approved'::fut.request_status
                                          else 'rejected'::fut.request_status end,
         decided_at = now(),
         decided_by = (select auth.uid())
   where id = p_request_id
  returning * into v_req;

  if p_approve then
    insert into fut.players (user_id, rating, membership)
    values (v_req.user_id, coalesce(p_rating, 3), coalesce(p_membership, 'mensalista'))
    on conflict (user_id) do update
      set is_active  = true,
          rating     = excluded.rating,
          membership = excluded.membership;
  end if;

  return v_req;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC (admin): define o goleiro fixo de um lado (slot 1 ou 2). NULL remove.
-- -----------------------------------------------------------------------------
create or replace function fut.set_keeper(p_user_id uuid, p_slot smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not fut.is_admin() then
    raise exception 'Apenas o administrador pode definir goleiros.' using errcode = '42501';
  end if;
  if p_slot is not null and p_slot not in (1, 2) then
    raise exception 'O slot de goleiro deve ser 1 ou 2.' using errcode = '22023';
  end if;

  if p_slot is not null then
    update fut.players set keeper_slot = null
     where keeper_slot = p_slot and user_id <> p_user_id;
  end if;

  update fut.players set keeper_slot = p_slot where user_id = p_user_id;
  if not found then
    raise exception 'Jogador não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- RPC (admin): grava o sorteio de forma atômica.
-- p_teams = [{"letter":"A","players":["<uuid>", ... 5 ids]}, ...]  (2 a 4 times de 5)
-- Refazer o sorteio apaga times/partidas anteriores da pelada.
-- Goleiros fixos e jogadores inativos são rejeitados.
-- -----------------------------------------------------------------------------
create or replace function fut.save_draw(p_session_id uuid, p_teams jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_team_size constant int := 5;
  v_team      jsonb;
  v_team_id   uuid;
  v_uid       text;
  v_count     int;
begin
  if not fut.is_admin() then
    raise exception 'Apenas o administrador pode sortear.' using errcode = '42501';
  end if;

  if not exists (select 1 from fut.sessions where id = p_session_id and status <> 'finished') then
    raise exception 'Pelada não encontrada ou já encerrada.' using errcode = 'P0002';
  end if;

  v_count := coalesce(jsonb_array_length(p_teams), 0);
  if v_count not between 2 and 4 then
    raise exception 'O sorteio precisa de 2 a 4 times.' using errcode = '22023';
  end if;

  delete from fut.teams where session_id = p_session_id;

  for v_team in select * from jsonb_array_elements(p_teams) loop
    if jsonb_array_length(v_team -> 'players') <> c_team_size then
      raise exception 'Cada time precisa ter % jogadores.', c_team_size using errcode = '22023';
    end if;

    insert into fut.teams (session_id, letter)
    values (p_session_id, (v_team ->> 'letter')::char(1))
    returning id into v_team_id;

    for v_uid in select jsonb_array_elements_text(v_team -> 'players') loop
      insert into fut.team_players (team_id, session_id, user_id, rating_snapshot)
      select v_team_id, p_session_id, p.user_id, p.rating
        from fut.players p
       where p.user_id = v_uid::uuid
         and p.is_active
         and p.keeper_slot is null;

      if not found then
        raise exception 'Jogador inválido no sorteio: %', v_uid using errcode = '22023';
      end if;
    end loop;

    update fut.teams t
       set total_rating = (select coalesce(sum(tp.rating_snapshot), 0)
                             from fut.team_players tp where tp.team_id = v_team_id)
     where t.id = v_team_id;
  end loop;

  update fut.sessions set status = 'drawn' where id = p_session_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: no máximo 20 jogadores de linha confirmados por pelada
-- -----------------------------------------------------------------------------
create or replace function fut.enforce_max_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max constant int := 20;
  v_count int;
begin
  if new.confirmed
     and not exists (select 1 from fut.players p
                      where p.user_id = new.user_id and p.keeper_slot is not null) then
    select count(*) into v_count
      from fut.attendance a
      join fut.players p on p.user_id = a.user_id
     where a.session_id = new.session_id
       and a.confirmed
       and p.keeper_slot is null
       and a.user_id <> new.user_id;

    if v_count >= c_max then
      raise exception 'Limite de % jogadores confirmados atingido.', c_max using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger attendance_enforce_max_confirmed
  before insert or update on fut.attendance
  for each row execute function fut.enforce_max_confirmed();

-- -----------------------------------------------------------------------------
-- Permissões de execução: somente usuários logados (nunca anon/public)
-- -----------------------------------------------------------------------------
revoke all on function fut.is_admin()                                   from public;
revoke all on function fut.is_member()                                  from public;
revoke all on function fut.request_join(text)                           from public;
revoke all on function fut.review_join_request(uuid, boolean, smallint) from public;
revoke all on function fut.set_keeper(uuid, smallint)                   from public;
revoke all on function fut.save_draw(uuid, jsonb)                       from public;

grant usage on schema fut to authenticated;
grant execute on function fut.is_admin()                                   to authenticated;
grant execute on function fut.is_member()                                  to authenticated;
grant execute on function fut.request_join(text)                           to authenticated;
grant execute on function fut.review_join_request(uuid, boolean, smallint) to authenticated;
grant execute on function fut.set_keeper(uuid, smallint)                   to authenticated;
grant execute on function fut.save_draw(uuid, jsonb)                       to authenticated;
