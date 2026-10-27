-- =============================================================================
-- Gestão Inteligente · Schema "fut" · 01 — Tipos e tabelas
-- Execute no SQL Editor do Supabase (ou via `supabase db push`), nesta ordem:
--   01_tables → 02_auth_functions → 03_rls → 04_storage → 05_views_realtime
-- =============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

create schema if not exists fut;

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
create type fut.player_position as enum ('GOL', 'FIX', 'ALA', 'PIV');   -- Goleiro, Fixo, Ala, Pivô
create type fut.membership_type as enum ('mensalista', 'avulso');     -- Mensalista (mensal) ou Avulso (diarista/convidado)
create type fut.request_status  as enum ('pending', 'approved', 'rejected');
create type fut.session_status  as enum ('open', 'drawn', 'finished');
create type fut.match_status    as enum ('scheduled', 'live', 'paused', 'finished');
create type fut.event_type      as enum ('goal', 'save');

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function fut.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — dados pessoais, editáveis pelo próprio jogador (nome, posição, foto)
-- Criado automaticamente quando a conta é criada em auth.users (ver script 02).
-- -----------------------------------------------------------------------------
create table fut.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  position    fut.player_position,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_touch_updated_at
  before update on fut.profiles
  for each row execute function fut.touch_updated_at();

-- -----------------------------------------------------------------------------
-- join_requests — pedido de entrada no futebol (uma linha por usuário)
-- -----------------------------------------------------------------------------
create table fut.join_requests (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references fut.profiles (id) on delete cascade,
  status        fut.request_status not null default 'pending',
  message       text check (char_length(message) <= 280),
  requested_at  timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid references fut.profiles (id) on delete set null
);

create index join_requests_status_idx on fut.join_requests (status);

-- -----------------------------------------------------------------------------
-- players — jogadores aprovados. A NOTA é definida somente pelo admin.
-- keeper_slot: goleiros fixos (1 = lado esquerdo, 2 = lado direito).
--              A UNIQUE garante no máximo 2 goleiros. Goleiros não entram no sorteio.
-- -----------------------------------------------------------------------------
create table fut.players (
  user_id      uuid primary key references fut.profiles (id) on delete cascade,
  rating       smallint not null default 3 check (rating between 1 and 5),
  keeper_slot  smallint unique check (keeper_slot in (1, 2)),
  membership   fut.membership_type not null default 'mensalista',
  is_active    boolean not null default true,
  joined_at    timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger players_touch_updated_at
  before update on fut.players
  for each row execute function fut.touch_updated_at();

-- -----------------------------------------------------------------------------
-- sessions — cada "pelada" (dia de jogo)
-- -----------------------------------------------------------------------------
create table fut.sessions (
  id            uuid primary key default gen_random_uuid(),
  scheduled_at  timestamptz not null,
  location      text not null default 'Society',
  status        fut.session_status not null default 'open',
  created_by    uuid references fut.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index sessions_status_idx on fut.sessions (status, scheduled_at desc);

-- -----------------------------------------------------------------------------
-- attendance — confirmação de presença (máx. 20 jogadores de linha por pelada)
-- -----------------------------------------------------------------------------
create table fut.attendance (
  session_id  uuid not null references fut.sessions (id) on delete cascade,
  user_id     uuid not null references fut.players (user_id) on delete cascade,
  confirmed   boolean not null default true,
  updated_at  timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index attendance_user_idx on fut.attendance (user_id);

create trigger attendance_touch_updated_at
  before update on fut.attendance
  for each row execute function fut.touch_updated_at();

-- -----------------------------------------------------------------------------
-- teams / team_players — resultado do sorteio (gravado pela função fut.save_draw)
-- rating_snapshot guarda a nota no momento do sorteio (histórico imutável).
-- -----------------------------------------------------------------------------
create table fut.teams (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references fut.sessions (id) on delete cascade,
  letter        char(1) not null check (letter in ('A', 'B', 'C', 'D')),
  total_rating  smallint not null default 0,
  created_at    timestamptz not null default now(),
  unique (session_id, letter),
  unique (id, session_id)
);

create table fut.team_players (
  team_id          uuid not null,
  session_id       uuid not null,
  user_id          uuid not null references fut.players (user_id) on delete cascade,
  rating_snapshot  smallint not null check (rating_snapshot between 1 and 5),
  primary key (team_id, user_id),
  unique (session_id, user_id),                       -- um jogador por time na pelada
  foreign key (team_id, session_id) references fut.teams (id, session_id) on delete cascade
);

create index team_players_user_idx on fut.team_players (user_id);

-- -----------------------------------------------------------------------------
-- matches — partidas da pelada (confronto entre dois times, com goleiros fixos)
-- elapsed_seconds + started_at permitem sincronizar o cronômetro entre aparelhos.
-- -----------------------------------------------------------------------------
create table fut.matches (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid not null references fut.sessions (id) on delete cascade,
  home_team_id     uuid not null references fut.teams (id) on delete cascade,
  away_team_id     uuid not null references fut.teams (id) on delete cascade,
  home_keeper_id   uuid references fut.players (user_id) on delete set null,
  away_keeper_id   uuid references fut.players (user_id) on delete set null,
  status           fut.match_status not null default 'scheduled',
  elapsed_seconds  integer not null default 0 check (elapsed_seconds >= 0),
  started_at       timestamptz,          -- preenchido enquanto status = 'live'
  ended_at         timestamptz,
  created_at       timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create index matches_session_idx on fut.matches (session_id, created_at desc);

-- -----------------------------------------------------------------------------
-- match_events — gols (com assistência) e defesas. Base das estatísticas.
-- -----------------------------------------------------------------------------
create table fut.match_events (
  id                uuid primary key default gen_random_uuid(),
  match_id          uuid not null references fut.matches (id) on delete cascade,
  type              fut.event_type not null default 'goal',
  team_id           uuid not null references fut.teams (id) on delete cascade,
  player_id         uuid not null references fut.players (user_id) on delete cascade,
  assist_player_id  uuid references fut.players (user_id) on delete cascade,
  minute            smallint not null default 1 check (minute >= 0),
  created_by        uuid references fut.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  check (assist_player_id is null or assist_player_id <> player_id),
  check (type = 'goal' or assist_player_id is null)
);

create index match_events_match_idx   on fut.match_events (match_id, created_at desc);
create index match_events_player_idx  on fut.match_events (player_id);
create index match_events_assist_idx  on fut.match_events (assist_player_id) where assist_player_id is not null;
