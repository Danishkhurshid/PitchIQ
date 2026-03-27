# PitchIQ MVP Roadmap

## Goal

Make the product feel like a cricket intelligence platform, not a stats dump.
Every major page should answer one of these questions:

- Why is this player good?
- Why does this player fail?
- How does this team win?
- What happened in this match beyond the score?
- Which matchup should I care about before the next game?

## Current Baseline

The app already has:

- A league dashboard
- Player directory and player profile pages
- Team pages
- Match pages
- Season filtering across the archive
- JSONL-backed API routes

That is enough to move from "working data app" to "interesting product" without
adding a new data source yet.

## What The Current Dataset Can Support

These should become first-class product features now:

- Phase splits for batters and bowlers
- Recent form over the last 5 or 10 matches
- Dismissal modes
- Bowlers who dismiss a batter most often
- Matchup history by player, team, and venue
- Team batting and bowling identity
- Venue scoring patterns
- Chase vs defend performance
- Toss impact by venue and season
- Match turning-point summaries from wicket clusters and phase scoring

These are not reliable yet and should not be promised in the first release:

- Wagon wheels
- Shot maps
- Strong areas on the ground
- Bowling style splits such as leg-spin vs left-arm pace
- Delivery variation splits such as yorker, slower ball, or bouncer

## Product Pillars

### 1. Dashboard

The home page should not just summarize the league. It should surface stories.

Core modules:

- `League pulse`: standings, net run rate, current season lens
- `Trend rail`: hottest batters, hottest bowlers, most improved teams
- `Story cards`: generated headlines such as "best death-over hitters" or
  "team losing wickets fastest in middle overs"
- `Upcoming focus`: next matches, recent results, rivalry context
- `Quick links`: players, teams, venues, insights

### 2. Discovery

This is where users browse and compare.

Core browse pages:

- `Players`
- `Teams`
- `Matches`
- `Venues`
- `Insights`

Each browse page should support filters and should explain what users are seeing,
not just list rows.

### 3. Explanation

This is the real differentiator.

Core detail pages:

- Player profile
- Team profile
- Match detail
- Venue detail

Every detail page should contain:

- A summary statement
- A strengths section
- A weaknesses section
- A recent context section
- A "why this matters" section

## Exact Build Order

### Phase 1: Make Existing Pages Worth Returning To

Build these next in this order:

1. `Venue pages`
2. `Player recent-form modules`
3. `Player matchup modules`
4. `Team identity modules`
5. `Match turning-point modules`
6. `Insight landing page`

Reason:

- Venue pages unlock reusable context across players, teams, and matches.
- Form and matchup features make player pages sticky.
- Team identity and match explanation make the platform feel editorial.
- Insight pages create shareable and searchable content.

## Phase 1 Features

### A. Venue Pages

Add:

- `src/app/venues/page.js`
- `src/app/venues/[venueId]/page.js`

Show:

- Total matches
- Average first-innings score
- Average winning score
- Chase win percentage
- Toss decision frequency
- Best batting teams at venue
- Best bowling teams at venue
- Best batters and bowlers at venue
- Recent matches at venue

Why it matters:

- Venue context makes every player and team page more useful.
- It creates natural search pages and story angles.

### B. Player Form

Extend player profiles with:

- Last 5 batting returns
- Last 10 batting returns
- Last 5 bowling returns
- Career vs season comparison
- Form delta: recent strike rate or economy vs career baseline

Show as:

- Mini trend cards
- Sparkline or simple trend bars
- "Heating up" or "cooling off" language

Why it matters:

- Fans care about current form more than career totals.

### C. Player Matchups

Add to player pages:

- Most faced bowlers
- Most troublesome bowlers
- Teams faced most often
- Best opposition
- Worst opposition
- Best venues
- Weak venues

Show:

- Runs, balls, strike rate, dismissals vs bowler
- Runs, average, strike rate vs team
- Runs, average, strike rate vs venue

Why it matters:

- This is where your product starts answering preview questions.

### D. Team Identity

Extend team pages with:

- Powerplay scoring rank
- Middle-over collapse rate
- Death-over hitting rank
- Powerplay wicket-taking rank
- Death-over economy rank
- Chase record
- Defend record
- Venue-specific record

Editorial cards:

- "This team wins by front-loading runs"
- "This team controls middle overs"
- "This team leaks at the death"

Why it matters:

- Team pages become about style, not only results.

### E. Match Turning Points

Extend match detail pages with:

- Phase-by-phase score comparison
- Wicket cluster detection
- Biggest over of the innings
- Collapse window
- Recovery partnership marker
- "Match flipped here" summary card

Why it matters:

- This turns scorecards into shareable recaps.

### F. Insight Pages

Add:

- `src/app/insights/page.js`
- optional detail pages later under `src/app/insights/[slug]/page.js`

Initial cards:

- Best death-over hitters
- Most reliable chasers
- Best powerplay bowlers
- Batters most vulnerable in the middle overs
- Teams with the strongest death bowling
- Venue batting index leaderboard

Why it matters:

- This is your Bleacher Report layer.
- These pages are also your best SEO and social-entry points.

## Components To Build

Create reusable components instead of hardcoding each module.

Recommended components:

- `src/components/trend-strip.js`
- `src/components/insight-card-grid.js`
- `src/components/player-form-panel.js`
- `src/components/matchup-table.js`
- `src/components/venue-summary-panel.js`
- `src/components/team-identity-panel.js`
- `src/components/turning-point-card.js`
- `src/components/comparison-stat-block.js`

## Repository Methods To Add

Keep UI separate from storage so Supabase can replace JSONL later.

Recommended repository additions:

- `listVenues`
- `getVenue`
- `getPlayerOpponentSplits`
- `getPlayerVenueSplits`
- `getPlayerBowlerMatchups`
- `getTeamVenueRecord`
- `getTeamOutcomeProfile`
- `getMatchTurningPoints`
- `getInsightCards`

## MVP Release Scope

If you want a sharp first public version, ship this and stop:

- Dashboard with story cards
- Player pages with form, phase splits, dismissal analysis, matchup cards
- Team pages with identity and venue context
- Match pages with turning-point explanation
- Venue pages
- Insight index page

Do not add premium ideas, auth, subscriptions, or live data complexity until
this version feels clearly useful.

## What Makes This Interesting Enough To Matter

The product gets interesting when it stops saying:

- "Babar Azam scored 3792 runs"

and starts saying:

- "Babar is safest in the middle overs, but his dismissals cluster against a
  small group of bowlers and spike when innings slow down."

That is the standard every page should meet.

## After MVP

Only after the above is live and coherent:

1. Move the analytics layer from JSONL to Supabase/Postgres
2. Add live fixture and score ingestion
3. Add player metadata enrichment for bowling styles and roles
4. Expand to IPL, BBL, and international cricket
5. Add comparison tools and premium-grade analytics
