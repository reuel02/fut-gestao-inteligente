-- =============================================================================
-- Gestão Inteligente · Schema "fut" · 07 — Roles, Árbitro, Fluxo de Avulso e Súmula
-- =============================================================================

-- 1. Cria tipo enum para Roles (Admin, Gestor, Jogador)
do $$ begin
  create type fut.app_role as enum ('admin', 'gestor', 'player');
exception
  when duplicate_object then null;
end $$;

-- 2. Adiciona valor 'cancelled' ao session_status (se ainda não existir)
alter type fut.session_status add value if not exists 'cancelled';

-- 3. Adiciona coluna 'role' na tabela fut.players (padrão 'player')
alter table fut.players
  add column if not exists role fut.app_role not null default 'player';

-- 4. Adiciona coluna 'referee_id' na tabela fut.sessions
alter table fut.sessions
  add column if not exists referee_id uuid references fut.profiles (id) on delete set null;

-- 5. Adiciona colunas de aprovação e pagamento em fut.attendance
alter table fut.attendance
  add column if not exists is_approved boolean not null default true,
  add column if not exists payment_confirmed boolean not null default false;

-- -----------------------------------------------------------------------------
-- 6. Funções de Verificação de Permissões
-- -----------------------------------------------------------------------------

-- is_admin(): É o e-mail superadmin OU jogador com role 'admin'
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
  ) or exists (
    select 1
    from fut.players p
    where p.user_id = (select auth.uid())
      and p.role = 'admin'
      and p.is_active
  );
$$;

-- is_manager(): Superadmin OU role 'admin' OU role 'gestor'
create or replace function fut.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select fut.is_admin() or exists (
    select 1
    from fut.players p
    where p.user_id = (select auth.uid())
      and p.role in ('admin', 'gestor')
      and p.is_active
  );
$$;

-- is_referee(session_id): É gestor OU foi designado árbitro desta pelada
create or replace function fut.is_referee(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select fut.is_manager() or exists (
    select 1
    from fut.sessions s
    where s.id = p_session_id
      and s.referee_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- 7. RPC: Gestão de Cargos (Super Admin promove para Gestor)
-- -----------------------------------------------------------------------------
create or replace function fut.set_player_role(
  p_user_id uuid,
  p_role    fut.app_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not fut.is_admin() then
    raise exception 'Apenas o Administrador pode promover ou alterar cargos.' using errcode = '42501';
  end if;

  update fut.players
     set role = p_role
   where user_id = p_user_id;

  if not found then
    raise exception 'Jogador não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 8. RPC: Designar Juiz (Árbitro) para a Pelada
-- -----------------------------------------------------------------------------
create or replace function fut.set_session_referee(
  p_session_id  uuid,
  p_referee_id  uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not fut.is_manager() then
    raise exception 'Apenas o Administrador ou Gestor pode definir o árbitro.' using errcode = '42501';
  end if;

  update fut.sessions
     set referee_id = p_referee_id
   where id = p_session_id;

  if not found then
    raise exception 'Pelada não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 9. RPC: Confirmação de Presença Diferenciada (Mensalista vs Avulso)
--    • Mensalistas: confirms = true, is_approved = true automaticamente.
--    • Avulsos: confirms = true, is_approved = false (aguarda aprovação do gestor).
-- -----------------------------------------------------------------------------
create or replace function fut.set_attendance(
  p_session_id uuid,
  p_user_id    uuid,
  p_confirmed  boolean
)
returns fut.attendance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership fut.membership_type;
  v_is_approved boolean;
  v_caller uuid := (select auth.uid());
  v_res fut.attendance;
begin
  -- O próprio jogador ou um gestor pode alterar
  if v_caller <> p_user_id and not fut.is_manager() then
    raise exception 'Você não tem permissão para alterar a presença de outro jogador.' using errcode = '42501';
  end if;

  select membership into v_membership
    from fut.players
   where user_id = p_user_id and is_active;

  if not found then
    raise exception 'Jogador não encontrado ou inativo.' using errcode = 'P0002';
  end if;

  -- Se for admin/gestor alterando, já aprova. Se for mensalista, auto-aprova. Se avulso, aguarda aprovação.
  if fut.is_manager() or v_membership = 'mensalista' then
    v_is_approved := p_confirmed;
  else
    v_is_approved := false; -- Avulso requer aprovação manual do gestor
  end if;

  insert into fut.attendance (session_id, user_id, confirmed, is_approved, payment_confirmed)
  values (p_session_id, p_user_id, p_confirmed, v_is_approved, false)
  on conflict (session_id, user_id) do update
    set confirmed   = excluded.confirmed,
        is_approved = case
          when not excluded.confirmed then false
          when fut.is_manager() or v_membership = 'mensalista' then true
          else fut.attendance.is_approved
        end,
        updated_at  = now()
  returning * into v_res;

  return v_res;
end;
$$;

-- -----------------------------------------------------------------------------
-- 10. RPC: Gestor Aprova/Recusa Avulso e Confirma Pagamento
-- -----------------------------------------------------------------------------
create or replace function fut.approve_avulso_attendance(
  p_session_id         uuid,
  p_user_id            uuid,
  p_approved           boolean,
  p_payment_confirmed  boolean default false
)
returns fut.attendance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res fut.attendance;
begin
  if not fut.is_manager() then
    raise exception 'Apenas o Administrador ou Gestor pode aprovar jogadores avulsos.' using errcode = '42501';
  end if;

  update fut.attendance
     set is_approved        = p_approved,
         payment_confirmed  = coalesce(p_payment_confirmed, payment_confirmed),
         confirmed          = p_approved,
         updated_at         = now()
   where session_id = p_session_id
     and user_id = p_user_id
  returning * into v_res;

  if not found then
    raise exception 'Inscrição de presença não encontrada.' using errcode = 'P0002';
  end if;

  return v_res;
end;
$$;

-- -----------------------------------------------------------------------------
-- 11. RPC: Cancelamento da Pelada
-- -----------------------------------------------------------------------------
create or replace function fut.cancel_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not fut.is_manager() then
    raise exception 'Apenas o Administrador ou Gestor pode cancelar a pelada.' using errcode = '42501';
  end if;

  update fut.sessions
     set status = 'cancelled'
   where id = p_session_id;

  if not found then
    raise exception 'Pelada não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 12. RPC: Finalização de Pelada com Validação Obrigatória de Pagamento de Avulsos
--     Bloqueia se houver qualquer avulso alocado na pelada com pagamento pendente!
-- -----------------------------------------------------------------------------
create or replace function fut.finish_session(
  p_session_id        uuid,
  p_confirmed_avulsos uuid[] default array[]::uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unpaid_count int;
  v_uid uuid;
begin
  if not fut.is_manager() then
    raise exception 'Apenas o Administrador ou Gestor pode finalizar a pelada.' using errcode = '42501';
  end if;

  -- Se foram passados IDs com pagamento confirmado nesta etapa, atualiza a presença
  if p_confirmed_avulsos is not null and array_length(p_confirmed_avulsos, 1) > 0 then
    foreach v_uid in array p_confirmed_avulsos loop
      update fut.attendance
         set payment_confirmed = true
       where session_id = p_session_id
         and user_id = v_uid;
    end loop;
  end if;

  -- Verifica se existe algum jogador avulso EFETIVAMENTE participante (em time ou goleiro)
  -- cujo pagamento ainda esteja pendente (payment_confirmed = false)
  select count(distinct p.user_id) into v_unpaid_count
    from fut.players p
    join fut.attendance a on a.user_id = p.user_id and a.session_id = p_session_id
   where p.membership = 'avulso'
     and not a.payment_confirmed
     and (
       exists (select 1 from fut.team_players tp where tp.session_id = p_session_id and tp.user_id = p.user_id)
       or exists (select 1 from fut.matches m where m.session_id = p_session_id and (m.home_keeper_id = p.user_id or m.away_keeper_id = p.user_id))
     );

  if v_unpaid_count > 0 then
    raise exception 'A pelada não pode ser finalizada. Há % jogador(es) avulso(s) com pagamento pendente.', v_unpaid_count
      using errcode = 'P0001';
  end if;

  -- Finaliza a pelada e encerra quaisquer partidas abertas
  update fut.matches
     set status = 'finished', ended_at = coalesce(ended_at, now())
   where session_id = p_session_id and status <> 'finished';

  update fut.sessions
     set status = 'finished'
   where id = p_session_id;

  if not found then
    raise exception 'Pelada não encontrada.' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 13. RPCs: Correção de Dados (Admin/Gestor remove ou edita gols/assistências/defesas)
-- -----------------------------------------------------------------------------
create or replace function fut.edit_match_event(
  p_event_id          uuid,
  p_player_id         uuid,
  p_assist_player_id  uuid default null,
  p_minute            smallint default 1
)
returns fut.match_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res fut.match_events;
begin
  if not fut.is_manager() then
    raise exception 'Apenas o Administrador ou Gestor pode corrigir eventos da súmula.' using errcode = '42501';
  end if;

  update fut.match_events
     set player_id        = p_player_id,
         assist_player_id = case when type = 'goal' then p_assist_player_id else null end,
         minute           = p_minute
   where id = p_event_id
  returning * into v_res;

  if not found then
    raise exception 'Evento não encontrado.' using errcode = 'P0002';
  end if;

  return v_res;
end;
$$;

create or replace function fut.delete_match_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not fut.is_manager() then
    raise exception 'Apenas o Administrador ou Gestor pode remover eventos da súmula.' using errcode = '42501';
  end if;

  delete from fut.match_events where id = p_event_id;

  if not found then
    raise exception 'Evento não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 14. Atualização da View fut.player_stats
--     • saves: contabiliza EXCLUSIVAMENTE para goleiros (keeper_slot is not null ou position = 'GOL')
--     • matches (presença): contabiliza EXCLUSIVAMENTE peladas FINALIZADAS (status = 'finished')
--       onde o jogador estava efetivamente alocado em um time ou no gol.
-- -----------------------------------------------------------------------------
drop view if exists fut.player_stats cascade;

create view fut.player_stats
with (security_invoker = true) as
select
  p.user_id,
  pr.name,
  pr.position,
  pr.avatar_url,
  p.keeper_slot,
  p.membership,
  p.role,
  coalesce(g.goals,   0)::int as goals,
  coalesce(a.assists, 0)::int as assists,
  -- Apenas goleiros acumulam defesas no ranking
  case
    when p.keeper_slot is not null or pr.position = 'GOL' then coalesce(s.saves, 0)::int
    else 0::int
  end as saves,
  -- Presença só computada de peladas FINALIZADAS e efetivamente jogadas
  coalesce(m.matches, 0)::int as matches
from fut.players p
join fut.profiles pr on pr.id = p.user_id
left join (
  select player_id, count(*) as goals
    from fut.match_events
   where type = 'goal'
   group by player_id
) g on g.player_id = p.user_id
left join (
  select assist_player_id, count(*) as assists
    from fut.match_events
   where assist_player_id is not null
   group by assist_player_id
) a on a.assist_player_id = p.user_id
left join (
  select player_id, count(*) as saves
    from fut.match_events
   where type = 'save'
   group by player_id
) s on s.player_id = p.user_id
left join (
  select user_id, count(distinct session_id) as matches
  from (
    -- Jogadores de linha escalados em times de peladas finalizadas
    select tp.user_id, s.id as session_id
      from fut.team_players tp
      join fut.sessions s on s.id = tp.session_id
     where s.status = 'finished'
    union
    -- Goleiros que atuaram em partidas de peladas finalizadas
    select m.home_keeper_id as user_id, s.id as session_id
      from fut.matches m
      join fut.sessions s on s.id = m.session_id
     where s.status = 'finished' and m.home_keeper_id is not null
    union
    select m.away_keeper_id as user_id, s.id as session_id
      from fut.matches m
      join fut.sessions s on s.id = m.session_id
     where s.status = 'finished' and m.away_keeper_id is not null
  ) x
  group by user_id
) m on m.user_id = p.user_id
where p.is_active;

grant select on fut.player_stats to authenticated;

-- -----------------------------------------------------------------------------
-- 15. Permissões de Execução (Grant)
-- -----------------------------------------------------------------------------
grant execute on function fut.is_manager()                                              to authenticated;
grant execute on function fut.is_referee(uuid)                                         to authenticated;
grant execute on function fut.set_player_role(uuid, fut.app_role)                       to authenticated;
grant execute on function fut.set_session_referee(uuid, uuid)                          to authenticated;
grant execute on function fut.set_attendance(uuid, uuid, boolean)                      to authenticated;
grant execute on function fut.approve_avulso_attendance(uuid, uuid, boolean, boolean)   to authenticated;
grant execute on function fut.cancel_session(uuid)                                     to authenticated;
grant execute on function fut.finish_session(uuid, uuid[])                             to authenticated;
grant execute on function fut.edit_match_event(uuid, uuid, uuid, smallint)             to authenticated;
grant execute on function fut.delete_match_event(uuid)                                 to authenticated;

-- Permite update do referee_id e role
grant update (referee_id) on fut.sessions to authenticated;
grant update (role) on fut.players to authenticated;
grant update (is_approved, payment_confirmed) on fut.attendance to authenticated;

-- -----------------------------------------------------------------------------
-- 16. Atualização de Políticas RLS para Gestor e Árbitro
-- -----------------------------------------------------------------------------

-- Sessions
drop policy if exists sessions_admin_write on fut.sessions;
create policy sessions_manager_write on fut.sessions
  for all to authenticated
  using (fut.is_manager())
  with check (fut.is_manager());

-- Attendance
drop policy if exists attendance_admin_write on fut.attendance;
create policy attendance_manager_write on fut.attendance
  for all to authenticated
  using (fut.is_manager())
  with check (fut.is_manager());

-- Matches: Gestor ou o Árbitro designado para a pelada
drop policy if exists matches_admin_write on fut.matches;
create policy matches_manager_or_referee_write on fut.matches
  for all to authenticated
  using (fut.is_referee(session_id))
  with check (fut.is_referee(session_id));

-- Match Events: Gestor ou o Árbitro designado para a pelada
drop policy if exists match_events_admin_write on fut.match_events;
create policy match_events_manager_or_referee_write on fut.match_events
  for all to authenticated
  using (
    exists (
      select 1 from fut.matches m
      where m.id = fut.match_events.match_id
        and fut.is_referee(m.session_id)
    )
  )
  with check (
    exists (
      select 1 from fut.matches m
      where m.id = fut.match_events.match_id
        and fut.is_referee(m.session_id)
    )
  );

-- Players update: apenas Super Admin ou Gestor
drop policy if exists players_update_admin on fut.players;
create policy players_update_manager on fut.players
  for update to authenticated
  using (fut.is_manager())
  with check (fut.is_manager());

-- -----------------------------------------------------------------------------
-- 17. Permite ao Gestor também sortear, definir goleiros e analisar pedidos
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
  if not fut.is_manager() then
    raise exception 'Apenas o administrador ou gestor pode sortear.' using errcode = '42501';
  end if;

  if not exists (select 1 from fut.sessions where id = p_session_id and status not in ('finished', 'cancelled')) then
    raise exception 'Pelada não encontrada ou já encerrada/cancelada.' using errcode = 'P0002';
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

create or replace function fut.set_keeper(p_user_id uuid, p_slot smallint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not fut.is_manager() then
    raise exception 'Apenas o administrador ou gestor pode definir goleiros.' using errcode = '42501';
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
  if not fut.is_manager() then
    raise exception 'Apenas o administrador ou gestor pode analisar pedidos.' using errcode = '42501';
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

