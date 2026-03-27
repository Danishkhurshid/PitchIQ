create extension if not exists pgcrypto;

create table if not exists teams (
  team_id text primary key,
  team_name text not null unique,
  slug text not null unique,
  short_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists players (
  player_id text primary key,
  cricsheet_id text unique,
  canonical_name text not null,
  slug text not null unique,
  source text not null,
  aliases jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists venues (
  venue_id text primary key,
  venue_name text not null,
  city text,
  slug text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists matches (
  match_id bigint primary key,
  source text not null default 'cricsheet',
  source_file text not null,
  competition text not null,
  event_name text,
  event_stage text,
  season text not null,
  match_date date not null,
  match_type text not null,
  gender text not null,
  team_type text not null,
  balls_per_over integer not null,
  overs_limit integer,
  city text,
  venue_id text references venues (venue_id),
  team_1_id text references teams (team_id),
  team_2_id text references teams (team_id),
  toss_winner_team_id text references teams (team_id),
  toss_decision text,
  winner_team_id text references teams (team_id),
  eliminator_team_id text references teams (team_id),
  result_type text,
  result_margin integer,
  result_label text,
  method text,
  player_of_match_ids text[] not null default '{}',
  player_of_match_names text[] not null default '{}',
  umpires text[] not null default '{}',
  tv_umpires text[] not null default '{}',
  reserve_umpires text[] not null default '{}',
  match_referees text[] not null default '{}',
  raw_outcome jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists matches_season_idx on matches (season);
create index if not exists matches_date_idx on matches (match_date desc);
create index if not exists matches_competition_idx on matches (competition, season);

create table if not exists match_players (
  match_id bigint not null references matches (match_id) on delete cascade,
  player_id text not null references players (player_id),
  team_id text not null references teams (team_id),
  is_playing_xi boolean not null default false,
  is_replacement_in boolean not null default false,
  is_replacement_out boolean not null default false,
  primary key (match_id, player_id)
);

create index if not exists match_players_team_idx on match_players (team_id, match_id);

create table if not exists innings (
  match_id bigint not null references matches (match_id) on delete cascade,
  innings_number integer not null,
  batting_team_id text not null references teams (team_id),
  bowling_team_id text references teams (team_id),
  target_runs integer,
  target_overs numeric(4, 1),
  total_runs integer not null,
  total_wickets integer not null,
  legal_balls integer not null,
  overs_bowled numeric(4, 1) not null,
  primary key (match_id, innings_number)
);

create table if not exists powerplays (
  powerplay_id bigint generated always as identity primary key,
  match_id bigint not null references matches (match_id) on delete cascade,
  innings_number integer not null,
  batting_team_id text not null references teams (team_id),
  powerplay_type text not null,
  from_ball text not null,
  to_ball text not null
);

create index if not exists powerplays_match_idx on powerplays (match_id, innings_number);

create table if not exists deliveries (
  delivery_id bigint generated always as identity primary key,
  match_id bigint not null references matches (match_id) on delete cascade,
  innings_number integer not null,
  innings_ball_index integer not null,
  batting_team_id text not null references teams (team_id),
  bowling_team_id text references teams (team_id),
  over_number integer not null,
  ball_in_over integer not null,
  ball_label text not null,
  phase text not null check (phase in ('powerplay', 'middle', 'death')),
  striker_player_id text not null references players (player_id),
  non_striker_player_id text not null references players (player_id),
  bowler_player_id text not null references players (player_id),
  batter_runs integer not null,
  extras_runs integer not null,
  total_runs integer not null,
  wides integer not null default 0,
  noballs integer not null default 0,
  byes integer not null default 0,
  legbyes integer not null default 0,
  penalty_runs integer not null default 0,
  is_legal_ball boolean not null,
  is_boundary boolean not null default false,
  is_dot_ball boolean not null default false,
  wicket_count integer not null default 0,
  review_count integer not null default 0,
  replacement_count integer not null default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  unique (match_id, innings_number, innings_ball_index)
);

create index if not exists deliveries_match_idx on deliveries (match_id, innings_number, innings_ball_index);
create index if not exists deliveries_striker_idx on deliveries (striker_player_id, match_id);
create index if not exists deliveries_bowler_idx on deliveries (bowler_player_id, match_id);
create index if not exists deliveries_phase_idx on deliveries (phase, match_id);

create table if not exists wickets (
  wicket_id bigint generated always as identity primary key,
  match_id bigint not null references matches (match_id) on delete cascade,
  innings_number integer not null,
  innings_ball_index integer not null,
  batting_team_id text not null references teams (team_id),
  bowling_team_id text references teams (team_id),
  over_number integer not null,
  ball_in_over integer not null,
  ball_label text not null,
  player_out_id text not null references players (player_id),
  dismissal_kind text not null,
  counts_as_dismissal boolean not null,
  credited_to_bowler boolean not null,
  bowler_player_id text references players (player_id),
  fielder_ids text[] not null default '{}',
  fielder_names text[] not null default '{}',
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists wickets_match_idx on wickets (match_id, innings_number);
create index if not exists wickets_player_idx on wickets (player_out_id, match_id);

create table if not exists reviews (
  review_id bigint generated always as identity primary key,
  match_id bigint not null references matches (match_id) on delete cascade,
  innings_number integer not null,
  innings_ball_index integer not null,
  team_id text references teams (team_id),
  over_number integer not null,
  ball_in_over integer not null,
  ball_label text not null,
  review_type text,
  decision text,
  umpire text,
  batter_player_id text references players (player_id),
  umpires_call boolean,
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists reviews_match_idx on reviews (match_id, innings_number);

create table if not exists replacements (
  replacement_id bigint generated always as identity primary key,
  match_id bigint not null references matches (match_id) on delete cascade,
  innings_number integer not null,
  innings_ball_index integer not null,
  replacement_scope text not null,
  team_id text references teams (team_id),
  over_number integer not null,
  ball_in_over integer not null,
  ball_label text not null,
  player_in_id text references players (player_id),
  player_out_id text references players (player_id),
  replacement_reason text,
  raw_payload jsonb not null default '{}'::jsonb
);

create index if not exists replacements_match_idx on replacements (match_id, innings_number);

create table if not exists player_match_batting (
  match_id bigint not null references matches (match_id) on delete cascade,
  player_id text not null references players (player_id),
  team_id text not null references teams (team_id),
  opposition_team_id text references teams (team_id),
  season text not null,
  matches integer not null,
  innings integer not null,
  runs integer not null,
  balls_faced integer not null,
  dismissals integer not null,
  fours integer not null,
  sixes integer not null,
  dot_balls integer not null,
  strike_rate numeric(7, 2),
  batting_average numeric(7, 2),
  dot_ball_pct numeric(7, 2),
  boundary_ball_pct numeric(7, 2),
  primary key (match_id, player_id)
);

create index if not exists player_match_batting_player_idx on player_match_batting (player_id, match_id desc);

create table if not exists player_match_bowling (
  match_id bigint not null references matches (match_id) on delete cascade,
  player_id text not null references players (player_id),
  team_id text not null references teams (team_id),
  opposition_team_id text references teams (team_id),
  season text not null,
  matches integer not null,
  innings integer not null,
  balls_bowled integer not null,
  runs_conceded integer not null,
  wickets integer not null,
  dot_balls integer not null,
  economy numeric(7, 2),
  bowling_average numeric(7, 2),
  bowling_strike_rate numeric(7, 2),
  dot_ball_pct numeric(7, 2),
  primary key (match_id, player_id)
);

create index if not exists player_match_bowling_player_idx on player_match_bowling (player_id, match_id desc);

create table if not exists player_phase_batting (
  player_id text not null references players (player_id),
  team_id text not null references teams (team_id),
  season text not null,
  phase text not null check (phase in ('powerplay', 'middle', 'death')),
  matches integer not null,
  innings integer not null,
  runs integer not null,
  balls_faced integer not null,
  dismissals integer not null,
  fours integer not null,
  sixes integer not null,
  dot_balls integer not null,
  strike_rate numeric(7, 2),
  batting_average numeric(7, 2),
  dot_ball_pct numeric(7, 2),
  boundary_ball_pct numeric(7, 2),
  primary key (player_id, team_id, season, phase)
);

create index if not exists player_phase_batting_phase_idx on player_phase_batting (phase, season);

create table if not exists player_phase_bowling (
  player_id text not null references players (player_id),
  team_id text not null references teams (team_id),
  season text not null,
  phase text not null check (phase in ('powerplay', 'middle', 'death')),
  matches integer not null,
  innings integer not null,
  balls_bowled integer not null,
  runs_conceded integer not null,
  wickets integer not null,
  dot_balls integer not null,
  economy numeric(7, 2),
  bowling_average numeric(7, 2),
  bowling_strike_rate numeric(7, 2),
  dot_ball_pct numeric(7, 2),
  primary key (player_id, team_id, season, phase)
);

create index if not exists player_phase_bowling_phase_idx on player_phase_bowling (phase, season);
