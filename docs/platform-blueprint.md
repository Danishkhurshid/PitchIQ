# PSL Intelligence Platform Blueprint

## Current Starting Point

This workspace currently contains raw Cricsheet PSL JSON files in
`data/psl/raw` for 314 matches covering the PSL from the 2015/16 season
through the 2025 season. That is enough to build the analytics layer
immediately, even before wiring in a live API for current fixtures and
scorecards.

For the concrete page and feature build order, see `docs/mvp-roadmap.md`.

## Product Positioning

The product should behave like a cricket intelligence layer, not a stat dump.
The differentiation is the interpretation layer:

- Split performance by match phase: powerplay, middle overs, death overs.
- Show trends instead of only season totals.
- Turn ball-by-ball data into player strengths, weaknesses, and context.
- Publish insight-led pages that can rank in search and double as editorial.

## MVP Shape

The first version should stay narrow and do a few things well:

- `Home`: latest season snapshot, standings, top performers, trending insights.
- `Teams`: squad, recent form, venue splits, batting and bowling profiles.
- `Players`: recent form, phase splits, venue splits, dismissal modes.
- `Matches`: scorecard, win context, partnership flow, standout spells.
- `Insights`: curated cards such as "best death-over finishers" or
  "which teams lose wickets fastest in the middle overs?"

## Data Strategy

Use two layers from day one.

### 1. Live Layer

Purpose:

- Upcoming fixtures
- Live scorecards
- Current season standings
- Recently completed match metadata

Suggested storage pattern:

- Poll external cricket API into cache tables in Supabase.
- Treat this layer as mutable and refreshable.
- Keep only the fields needed for live experiences.

### 2. Analytics Layer

Purpose:

- Historical ball-by-ball analysis
- Phase splits
- Form curves
- Venue patterns
- Matchup analysis

Suggested storage pattern:

- Normalize Cricsheet JSON into warehouse-style tables.
- Build derived tables for player-match and player-phase summaries.
- Recompute derived outputs on ingest, not on every page request.

## Core Insight Definitions

These definitions should stay fixed unless you intentionally version them.

- `Powerplay`: overs 1-6
- `Middle overs`: overs 7-16
- `Death overs`: overs 17-20

Primary batting metrics:

- Runs
- Balls faced
- Strike rate
- Dismissals
- Dot-ball percentage
- Boundary-ball percentage

Primary bowling metrics:

- Balls bowled
- Runs conceded
- Wickets
- Economy
- Bowling strike rate
- Bowling average
- Dot-ball percentage

## Recommended Data Model

Base tables:

- `teams`
- `players`
- `venues`
- `matches`
- `match_players`
- `innings`
- `deliveries`
- `wickets`
- `reviews`
- `replacements`
- `powerplays`

Derived tables:

- `player_match_batting`
- `player_match_bowling`
- `player_phase_batting`
- `player_phase_bowling`

This split keeps the product fast while preserving the raw delivery layer for
future work such as matchup models and impact scores.

## MVP Analytics That Are Already Feasible

With the data in this repo, you can ship:

- Batter phase splits by season and career
- Bowler phase splits by season and career
- Recent form over the last 5 or 10 matches
- Venue performance patterns
- Dismissal mode breakdowns
- Team batting and bowling profiles
- Match scorecards and delivery timelines

Not yet reliable from this dataset alone:

- Bowling-type matchup splits, unless you enrich player metadata elsewhere
- Win probability models, unless you add a model layer
- Impact scores, unless you define a weighting framework

## Delivery Plan

### Phase 1: Data Foundation

- Normalize Cricsheet PSL JSON into queryable records.
- Load the SQL schema into Supabase.
- Import raw and derived JSONL outputs into Postgres.

### Phase 2: App Foundation

- Build Next.js routes for teams, players, matches, and insights.
- Expose typed API routes backed by Supabase.
- Add cached summary endpoints for the homepage.

### Phase 3: Insight Layer

- Add player form charts.
- Add phase comparison cards.
- Add venue and opposition splits.
- Add editorial insight pages built from the same data marts.

### Phase 4: Expansion

- Add live API ingestion for current season updates.
- Enrich player metadata for bowling styles and roles.
- Expand to IPL, BBL, and international cricket using the same schema.

## Build Order I Would Use

1. Land the schema and ingestion pipeline.
2. Load normalized PSL data into Supabase.
3. Build the `Players` and `Teams` pages first because they unlock the most
   reusable analytics.
4. Add `Matches` pages next to support storytelling and SEO.
5. Add `Insights` pages last, once reusable stats endpoints are stable.

## Reference App Note

The Streamlit reference is useful as an aggregation benchmark, but this
platform should not inherit its interaction model. Use it as inspiration for
what can be surfaced, not for how the product should look or behave.
