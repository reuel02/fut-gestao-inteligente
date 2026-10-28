-- =============================================================================
-- Gestão Inteligente · Schema "fut" · 08 — Múltiplos Juízes, Períodos e Ações
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Suporte a múltiplos juízes por pelada (fut.session_referees)
-- -----------------------------------------------------------------------------
create table if not exists fut.session_referees (
  session_id uuid not null references fut.sessions(id) on delete cascade,
  user_id    uuid not null references fut.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

-- Habilita RLS em fut.session_referees
alter table fut.session_referees enable row level security;

create policy "session_referees_select"
  on fut.session_referees for select to authenticated
  using (true);

create policy "session_referees_write_manager"
  on fut.session_referees for all to authenticated
  using (fut.is_manager())
  with check (fut.is_manager());

-- Atualiza is_referee para aceitar múltiplos árbitros
create or replace function fut.is_referee(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select fut.is_manager() or exists (
    select 1
    from fut.session_referees sr
    where sr.session_id = p_session_id
      and sr.user_id = (select auth.uid())
  ) or exists (
    select 1
    from fut.sessions s
    where s.id = p_session_id
      and s.referee_id = (select auth.uid())
  );
$$;

-- RPC para Admin/Gestor definir a lista de árbitros da pelada
create or replace function fut.set_session_referees(
  p_session_id   uuid,
  p_referee_ids  uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
begin
  if not fut.is_manager() then
    raise exception 'Apenas o Administrador ou Gestor pode definir os árbitros.' using errcode = '42501';
  end if;

  -- Limpa árbitros anteriores
  delete from fut.session_referees where session_id = p_session_id;

  -- Insere novos árbitros
  if p_referee_ids is not null and array_length(p_referee_ids, 1) > 0 then
    foreach v_uid in array p_referee_ids loop
      insert into fut.session_referees (session_id, user_id)
      values (p_session_id, v_uid)
      on conflict (session_id, user_id) do nothing;
    end loop;

    -- Mantém retrocompatibilidade com fut.sessions.referee_id (primeiro árbitro)
    update fut.sessions
       set referee_id = p_referee_ids[1]
     where id = p_session_id;
  else
    update fut.sessions
       set referee_id = null
     where id = p_session_id;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Confirmação com Comprovante ou Dinheiro para Avulsos
-- -----------------------------------------------------------------------------
alter table fut.attendance
  add column if not exists payment_method text check (payment_method in ('pix', 'cash', 'monthly')) default 'monthly',
  add column if not exists receipt_url text;

-- Storage bucket para comprovantes (receipts)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  true,
  5242880,                                           -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Políticas de Storage para receipts
do $$ begin
  create policy "receipts_select_auth"
    on storage.objects for select to authenticated
    using (bucket_id = 'receipts');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create policy "receipts_insert_own"
    on storage.objects for insert to authenticated
    with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
exception
  when duplicate_object then null;
end $$;

-- RPC para o próprio jogador confirmar presença
create or replace function fut.confirm_attendance(
  p_session_id     uuid,
  p_payment_method text default 'monthly',
  p_receipt_url    text default null
)
returns fut.attendance
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := auth.uid();
  v_membership  fut.membership_type;
  v_res         fut.attendance;
  v_approved    boolean;
  v_paid        boolean;
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;

  select membership into v_membership
    from fut.players
   where user_id = v_uid and is_active;

  if not found then
    raise exception 'Jogador não encontrado ou inativo.' using errcode = 'P0002';
  end if;

  if v_membership = 'mensalista' then
    v_approved := true;
    v_paid     := true;
  else
    -- Avulso requer aprovação manual do gestor e confirmação do pagamento
    v_approved := false;
    v_paid     := false;
  end if;

  insert into fut.attendance (
    session_id,
    user_id,
    confirmed,
    is_approved,
    payment_confirmed,
    payment_method,
    receipt_url
  )
  values (
    p_session_id,
    v_uid,
    true,
    v_approved,
    v_paid,
    case when v_membership = 'mensalista' then 'monthly' else coalesce(p_payment_method, 'cash') end,
    p_receipt_url
  )
  on conflict (session_id, user_id) do update
    set confirmed         = true,
        is_approved       = excluded.is_approved,
        payment_confirmed = excluded.payment_confirmed,
        payment_method    = excluded.payment_method,
        receipt_url       = coalesce(excluded.receipt_url, fut.attendance.receipt_url)
  returning * into v_res;

  return v_res;
end;
$$;

-- RPC para o jogador cancelar sua confirmação de presença
create or replace function fut.cancel_attendance(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Não autenticado.' using errcode = '42501';
  end if;

  delete from fut.attendance
   where session_id = p_session_id
     and user_id = v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Histórico de Últimas Ações por Jogador (Gols, Assistências e Defesas)
-- -----------------------------------------------------------------------------
create or replace function fut.get_player_recent_actions(
  p_user_id uuid default null,
  p_limit   int default 50
)
returns table (
  id              uuid,
  action_type     text,     -- 'GOL', 'ASSISTÊNCIA', 'DEFESA'
  action_label    text,     -- 'GOL! 02/11 23:11'
  player_id       uuid,
  player_name     text,
  partner_name    text,     -- assistido ou assistente
  session_id      uuid,
  match_id        uuid,
  created_at      timestamptz,
  formatted_time  text,     -- '23:11'
  formatted_date  text      -- '02/11'
)
language sql
stable
security definer
set search_path = ''
as $$
  with actions as (
    -- Gols
    select
      e.id,
      'GOL' as action_type,
      'GOL! ' || to_char(e.created_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as action_label,
      e.player_id,
      p.name as player_name,
      pa.name as partner_name,
      m.session_id,
      e.match_id,
      e.created_at,
      to_char(e.created_at at time zone 'America/Sao_Paulo', 'HH24:MI') as formatted_time,
      to_char(e.created_at at time zone 'America/Sao_Paulo', 'DD/MM') as formatted_date
    from fut.match_events e
    join fut.matches m on m.id = e.match_id
    join fut.profiles p on p.id = e.player_id
    left join fut.profiles pa on pa.id = e.assist_player_id
    where e.type = 'goal'
      and (p_user_id is null or e.player_id = p_user_id)

    union all

    -- Assistências
    select
      e.id,
      'ASSISTÊNCIA' as action_type,
      'ASSISTÊNCIA! ' || to_char(e.created_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as action_label,
      e.assist_player_id as player_id,
      pa.name as player_name,
      p.name as partner_name,
      m.session_id,
      e.match_id,
      e.created_at,
      to_char(e.created_at at time zone 'America/Sao_Paulo', 'HH24:MI') as formatted_time,
      to_char(e.created_at at time zone 'America/Sao_Paulo', 'DD/MM') as formatted_date
    from fut.match_events e
    join fut.matches m on m.id = e.match_id
    join fut.profiles p on p.id = e.player_id
    join fut.profiles pa on pa.id = e.assist_player_id
    where e.type = 'goal' and e.assist_player_id is not null
      and (p_user_id is null or e.assist_player_id = p_user_id)

    union all

    -- Defesas de Goleiro
    select
      e.id,
      'DEFESA' as action_type,
      'DEFESA! ' || to_char(e.created_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') as action_label,
      e.player_id,
      p.name as player_name,
      null::text as partner_name,
      m.session_id,
      e.match_id,
      e.created_at,
      to_char(e.created_at at time zone 'America/Sao_Paulo', 'HH24:MI') as formatted_time,
      to_char(e.created_at at time zone 'America/Sao_Paulo', 'DD/MM') as formatted_date
    from fut.match_events e
    join fut.matches m on m.id = e.match_id
    join fut.profiles p on p.id = e.player_id
    where e.type = 'save'
      and (p_user_id is null or e.player_id = p_user_id)
  )
  select * from actions
  order by created_at desc
  limit p_limit;
$$;

-- -----------------------------------------------------------------------------
-- 4. Estatísticas por Período Mensal (Ciclos renovados dia 10 de cada mês)
-- -----------------------------------------------------------------------------
create or replace function fut.get_period_stats(
  p_start timestamptz,
  p_end   timestamptz
)
returns table (
  user_id     uuid,
  name        text,
  position    fut.player_position,
  avatar_url  text,
  keeper_slot smallint,
  membership  fut.membership_type,
  role        fut.app_role,
  goals       int,
  assists     int,
  saves       int,
  matches     int
)
language sql
stable
security definer
set search_path = ''
as $$
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
    coalesce(m.matches, 0)::int as matches
  from fut.players p
  join fut.profiles pr on pr.id = p.user_id
  left join (
    select player_id, count(*) as goals
      from fut.match_events
     where type = 'goal'
       and created_at >= p_start and created_at < p_end
     group by player_id
  ) g on g.player_id = p.user_id
  left join (
    select assist_player_id, count(*) as assists
      from fut.match_events
     where assist_player_id is not null
       and created_at >= p_start and created_at < p_end
     group by assist_player_id
  ) a on a.assist_player_id = p.user_id
  left join (
    select player_id, count(*) as saves
      from fut.match_events
     where type = 'save'
       and created_at >= p_start and created_at < p_end
     group by player_id
  ) s on s.player_id = p.user_id
  left join (
    select user_id, count(distinct session_id) as matches
    from (
      select tp.user_id, s.id as session_id
        from fut.team_players tp
        join fut.sessions s on s.id = tp.session_id
       where s.status = 'finished'
         and s.scheduled_at >= p_start and s.scheduled_at < p_end
      union
      select m.home_keeper_id as user_id, s.id as session_id
        from fut.matches m
        join fut.sessions s on s.id = m.session_id
       where s.status = 'finished' and m.home_keeper_id is not null
         and s.scheduled_at >= p_start and s.scheduled_at < p_end
      union
      select m.away_keeper_id as user_id, s.id as session_id
        from fut.matches m
        join fut.sessions s on s.id = m.session_id
       where s.status = 'finished' and m.away_keeper_id is not null
         and s.scheduled_at >= p_start and s.scheduled_at < p_end
    ) x
    group by user_id
  ) m on m.user_id = p.user_id
  where p.is_active;
$$;

-- -----------------------------------------------------------------------------
-- 5. Permissões de Execução (Grant)
-- -----------------------------------------------------------------------------
grant select on fut.session_referees to authenticated;
grant insert, delete on fut.session_referees to authenticated;
grant execute on function fut.set_session_referees(uuid, uuid[])               to authenticated;
grant execute on function fut.confirm_attendance(uuid, text, text)             to authenticated;
grant execute on function fut.cancel_attendance(uuid)                          to authenticated;
grant execute on function fut.get_player_recent_actions(uuid, int)             to authenticated;
grant execute on function fut.get_period_stats(timestamptz, timestamptz)       to authenticated;

-- Realtime
alter publication supabase_realtime add table fut.session_referees;
