-- =============================================================================
-- Gestão Inteligente · Schema "fut" · 05 — View de estatísticas e Realtime
-- =============================================================================

-- Ranking: gols, assistências, defesas e jogos por jogador ativo.
-- security_invoker = a RLS de quem consulta é respeitada (só membros enxergam).
create or replace view fut.player_stats
with (security_invoker = true) as
select
  p.user_id,
  pr.name,
  pr.position,
  pr.avatar_url,
  p.keeper_slot,
  p.membership,
  coalesce(g.goals,   0)::int as goals,
  coalesce(a.assists, 0)::int as assists,
  coalesce(s.saves,   0)::int as saves,
  coalesce(m.matches, 0)::int as matches
from fut.players p
join fut.profiles pr on pr.id = p.user_id
left join (
  select player_id, count(*) as goals
    from fut.match_events where type = 'goal' group by player_id
) g on g.player_id = p.user_id
left join (
  select assist_player_id, count(*) as assists
    from fut.match_events where assist_player_id is not null group by assist_player_id
) a on a.assist_player_id = p.user_id
left join (
  select player_id, count(*) as saves
    from fut.match_events where type = 'save' group by player_id
) s on s.player_id = p.user_id
left join (
  select user_id, count(distinct match_id) as matches
  from (
    select tp.user_id, mt.id as match_id
      from fut.team_players tp
      join fut.matches mt on tp.team_id in (mt.home_team_id, mt.away_team_id)
    union all
    select home_keeper_id, id from fut.matches where home_keeper_id is not null
    union all
    select away_keeper_id, id from fut.matches where away_keeper_id is not null
  ) x
  group by user_id
) m on m.user_id = p.user_id
where p.is_active;

grant select on fut.player_stats to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime: súmula e sorteio atualizam ao vivo no celular de todos os jogadores
-- (a RLS continua valendo: só membros recebem os eventos)
-- -----------------------------------------------------------------------------
alter publication supabase_realtime add table
  fut.players, fut.sessions, fut.attendance, fut.teams, fut.team_players,
  fut.matches, fut.match_events, fut.join_requests;

-- -----------------------------------------------------------------------------
-- IMPORTANTE: expor o schema "fut" na API (Data API).
-- Opção 1 (recomendado): Dashboard → Project Settings → Data API → "Exposed schemas"
--                        → adicione "fut" (mantenha os demais).
-- Opção 2: rode abaixo, ajustando a lista se você já expõe outros schemas:
--
--   alter role authenticator set pgrst.db_schemas = 'public, graphql_public, fut';
--   notify pgrst, 'reload config';
-- -----------------------------------------------------------------------------
