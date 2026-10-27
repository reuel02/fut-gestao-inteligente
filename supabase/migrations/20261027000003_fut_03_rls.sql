-- =============================================================================
-- Gestão Inteligente · Schema "fut" · 03 — Permissões e RLS
--
-- Regras:
--   • Visitante (anon): nada.
--   • Logado, ainda não aprovado: vê/edita só o próprio perfil e o próprio pedido.
--   • Jogador aprovado (membro): lê tudo do futebol; edita só o próprio perfil;
--     confirma/cancela a própria presença.
--   • Admin (ferreirareuel3@gmail.com): aprova pedidos, dá notas, define goleiros,
--     cria peladas, sorteia e opera a súmula.
-- =============================================================================

-- Nada de acesso por padrão
revoke all on all tables    in schema fut from anon, authenticated;
revoke all on all sequences in schema fut from anon, authenticated;

-- Privilégios por coluna/tabela (a RLS filtra as linhas)
grant select on fut.profiles, fut.join_requests, fut.players, fut.sessions,
                fut.attendance, fut.teams, fut.team_players, fut.matches,
                fut.match_events
  to authenticated;

-- O jogador só altera estes campos do próprio perfil (nunca o e-mail)
grant update (name, position, avatar_url) on fut.profiles to authenticated;

-- Nota, ativação e tipo de adesão (mensalista/avulso): somente admin (policy). Goleiro via fut.set_keeper().
grant update (rating, is_active, membership) on fut.players to authenticated;

grant insert, update, delete on fut.sessions                to authenticated;  -- policy: admin
grant insert, update, delete on fut.attendance              to authenticated;  -- policy: dono/admin
grant insert, update, delete on fut.matches                 to authenticated;  -- policy: admin
grant insert, update, delete on fut.match_events            to authenticated;  -- policy: admin

-- -----------------------------------------------------------------------------
-- Habilitar RLS
-- -----------------------------------------------------------------------------
alter table fut.profiles      enable row level security;
alter table fut.join_requests enable row level security;
alter table fut.players       enable row level security;
alter table fut.sessions      enable row level security;
alter table fut.attendance    enable row level security;
alter table fut.teams         enable row level security;
alter table fut.team_players  enable row level security;
alter table fut.matches       enable row level security;
alter table fut.match_events  enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create policy profiles_select on fut.profiles
  for select to authenticated
  using (id = (select auth.uid()) or fut.is_member());

create policy profiles_update_own on fut.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- (insert é feito pelo trigger fut.handle_new_user; delete cascateia de auth.users)

-- -----------------------------------------------------------------------------
-- join_requests (escrita somente via fut.request_join / fut.review_join_request)
-- -----------------------------------------------------------------------------
create policy join_requests_select on fut.join_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or fut.is_admin());

-- -----------------------------------------------------------------------------
-- players (o jogador enxerga a própria linha mesmo inativo, para o app saber o status)
-- -----------------------------------------------------------------------------
create policy players_select on fut.players
  for select to authenticated
  using (user_id = (select auth.uid()) or fut.is_member());

create policy players_update_admin on fut.players
  for update to authenticated
  using (fut.is_admin())
  with check (fut.is_admin());

-- -----------------------------------------------------------------------------
-- sessions
-- -----------------------------------------------------------------------------
create policy sessions_select on fut.sessions
  for select to authenticated
  using (fut.is_member());

create policy sessions_admin_write on fut.sessions
  for all to authenticated
  using (fut.is_admin())
  with check (fut.is_admin());

-- -----------------------------------------------------------------------------
-- attendance: membro gerencia a PRÓPRIA presença enquanto a pelada está aberta;
-- admin gerencia a de todos.
-- -----------------------------------------------------------------------------
create policy attendance_select on fut.attendance
  for select to authenticated
  using (fut.is_member());

create policy attendance_insert_own on fut.attendance
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and fut.is_member()
    and exists (select 1 from fut.sessions s where s.id = session_id and s.status = 'open')
  );

create policy attendance_update_own on fut.attendance
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from fut.sessions s where s.id = session_id and s.status = 'open')
  )
  with check (user_id = (select auth.uid()));

create policy attendance_delete_own on fut.attendance
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from fut.sessions s where s.id = session_id and s.status = 'open')
  );

create policy attendance_admin_write on fut.attendance
  for all to authenticated
  using (fut.is_admin())
  with check (fut.is_admin());

-- -----------------------------------------------------------------------------
-- teams / team_players (escrita somente via fut.save_draw)
-- -----------------------------------------------------------------------------
create policy teams_select on fut.teams
  for select to authenticated
  using (fut.is_member());

create policy team_players_select on fut.team_players
  for select to authenticated
  using (fut.is_member());

-- -----------------------------------------------------------------------------
-- matches / match_events
-- -----------------------------------------------------------------------------
create policy matches_select on fut.matches
  for select to authenticated
  using (fut.is_member());

create policy matches_admin_write on fut.matches
  for all to authenticated
  using (fut.is_admin())
  with check (fut.is_admin());

create policy match_events_select on fut.match_events
  for select to authenticated
  using (fut.is_member());

create policy match_events_admin_write on fut.match_events
  for all to authenticated
  using (fut.is_admin())
  with check (fut.is_admin());
