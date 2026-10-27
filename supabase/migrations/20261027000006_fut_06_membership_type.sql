-- =============================================================================
-- Gestão Inteligente · Schema "fut" · 06 — Mensalista vs Avulso
-- Execute este script no SQL Editor do Supabase se você já rodou os scripts 01 a 05.
-- =============================================================================

-- 1. Cria o tipo enum 'mensalista' / 'avulso' (se ainda não existir)
do $$ begin
  create type fut.membership_type as enum ('mensalista', 'avulso');
exception
  when duplicate_object then null;
end $$;

-- 2. Adiciona a coluna 'membership' na tabela fut.players (padrão 'mensalista')
alter table fut.players
  add column if not exists membership fut.membership_type not null default 'mensalista';

-- 3. Permite que o admin atualize a coluna membership
grant update (membership) on fut.players to authenticated;

-- 4. Função RPC para o admin alternar o tipo de adesão de um jogador
create or replace function fut.set_membership(
  p_user_id     uuid,
  p_membership  fut.membership_type
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not fut.is_admin() then
    raise exception 'Apenas o administrador pode alterar o tipo de jogador (mensalista/avulso).' using errcode = '42501';
  end if;

  update fut.players
     set membership = p_membership
   where user_id = p_user_id;

  if not found then
    raise exception 'Jogador não encontrado.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function fut.set_membership(uuid, fut.membership_type) from public;
grant execute on function fut.set_membership(uuid, fut.membership_type) to authenticated;

-- 5. Atualiza a função de aprovação de pedidos para aceitar o tipo de adesão
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

revoke all on function fut.review_join_request(uuid, boolean, smallint, fut.membership_type) from public;
grant execute on function fut.review_join_request(uuid, boolean, smallint, fut.membership_type) to authenticated;

-- 6. Atualiza a view fut.player_stats para incluir a coluna membership
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
