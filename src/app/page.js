import Link from "next/link";

import { RecentMatchList } from "@/components/recent-match-list";
import { SeasonFilter } from "@/components/season-filter";
import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatMetric, formatNumber } from "@/lib/format";
import { normalizeSeasonParam, seasonLabel } from "@/lib/season";
import { buildPath } from "@/lib/url";

function storyCards({ deathBatters, powerplayBowlers, teams, selectedSeason }) {
  const bestDeathBatter = deathBatters[0];
  const bestPowerplayBowler = powerplayBowlers[0];
  const bestTeam = teams[0];
  const contextLabel =
    selectedSeason === "all" ? "across the PSL archive" : `in the ${selectedSeason} PSL season`;

  return [
    {
      eyebrow: "Hot zone",
      title: `${bestDeathBatter.player.name} owns the death overs`,
      body: `${bestDeathBatter.batting.runs} runs at a strike rate of ${formatMetric(bestDeathBatter.batting.strikeRate)} ${contextLabel}.`,
      href: buildPath(`/players/${bestDeathBatter.player.id}`, { season: selectedSeason })
    },
    {
      eyebrow: "New-ball pressure",
      title: `${bestPowerplayBowler.player.name} is setting the tone up front`,
      body: `${bestPowerplayBowler.bowling.wickets} wickets in the powerplay with ${formatMetric(bestPowerplayBowler.bowling.dotBallPct)}% dots.`,
      href: buildPath(`/players/${bestPowerplayBowler.player.id}`, { season: selectedSeason })
    },
    {
      eyebrow: "Team pulse",
      title: `${bestTeam.team.name} looks like the most complete side`,
      body: `${bestTeam.summary.wins} wins and a net run rate of ${formatMetric(bestTeam.summary.netRunRate)} make them the cleanest dashboard story right now.`,
      href: buildPath(`/teams/${bestTeam.team.id}`, { season: selectedSeason })
    }
  ];
}

export default async function HomePage({ searchParams }) {
  const repository = await getCricketRepository();
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );

  const [teams, deathBatters, powerplayBowlers, recentMatches, players] =
    await Promise.all([
      repository.listTeams({ season: selectedSeason }),
      repository.getTopBatters({
        season: selectedSeason,
        limit: 5,
        phase: "death",
        minBalls: 30
      }),
      repository.getTopBowlers({
        season: selectedSeason,
        limit: 5,
        phase: "powerplay",
        minBalls: 24
      }),
      repository.listMatches({
        season: selectedSeason,
        limit: 6
      }),
      repository.listPlayers({
        season: selectedSeason,
        sort: "runs",
        limit: 8
      })
    ]);

  const stories = storyCards({
    deathBatters,
    powerplayBowlers,
    teams,
    selectedSeason
  });

  return (
    <main className="page-shell">
      <SeasonFilter pathname="/" seasons={manifest.seasons} currentSeason={selectedSeason} />

      <section className="hero-grid">
        <article className="hero-panel hero-panel-primary">
          <p className="kicker">Dashboard</p>
          <h1>Build cricket coverage around insight cards, not article headlines.</h1>
          <p className="hero-copy">
            This front page is the product spine: league pulse, standout players,
            recent matches, and drill-down links into explainable player and team
            analytics.
          </p>

          <div className="stat-grid">
            <div className="stat-tile">
              <span>PSL matches</span>
              <strong>{formatNumber(manifest.match_count)}</strong>
            </div>
            <div className="stat-tile">
              <span>Deliveries tracked</span>
              <strong>{formatNumber(manifest.delivery_count)}</strong>
            </div>
            <div className="stat-tile">
              <span>Players covered</span>
              <strong>{formatNumber(manifest.player_count)}</strong>
            </div>
            <div className="stat-tile">
              <span>Current lens</span>
              <strong>{seasonLabel(selectedSeason)}</strong>
            </div>
          </div>
        </article>

        <article className="hero-panel hero-panel-side">
          <p className="kicker">Explore</p>
          <div className="shortcut-stack">
            <Link className="shortcut-card" href={buildPath("/players", { season: selectedSeason })}>
              <strong>Players</strong>
              <span>Form, phase splits, dismissal profile, recent matches</span>
            </Link>
            <Link className="shortcut-card" href={buildPath("/teams", { season: selectedSeason })}>
              <strong>Teams</strong>
              <span>Standings, leaders, phase identity, recent results</span>
            </Link>
            <Link className="shortcut-card" href={buildPath("/matches", { season: selectedSeason })}>
              <strong>Matches</strong>
              <span>Scorecards, wicket events, reviews, replacements</span>
            </Link>
          </div>
        </article>
      </section>

      <section className="story-grid">
        {stories.map((story) => (
          <Link key={story.title} className="story-card" href={story.href}>
            <p className="kicker">{story.eyebrow}</p>
            <h2>{story.title}</h2>
            <p>{story.body}</p>
          </Link>
        ))}
      </section>

      <section className="content-grid">
        <article className="surface surface-span-7">
          <div className="surface-header">
            <div>
              <p className="kicker">Standings lens</p>
              <h2>{seasonLabel(selectedSeason)} team dashboard</h2>
            </div>
            <Link className="text-link" href={buildPath("/teams", { season: selectedSeason })}>
              All teams
            </Link>
          </div>

          <div className="table-list">
            {teams.map((entry, index) => (
              <Link
                key={entry.team.id}
                className="table-row"
                href={buildPath(`/teams/${entry.team.id}`, { season: selectedSeason })}
              >
                <div className="table-rank">{index + 1}</div>
                <div className="table-primary">
                  <strong>{entry.team.name}</strong>
                  <span>
                    {entry.summary.wins}-{entry.summary.losses} · NRR{" "}
                    {formatMetric(entry.summary.netRunRate)}
                  </span>
                </div>
                <div className="table-secondary">
                  <span>Bat RR {formatMetric(entry.summary.battingRunRate)}</span>
                  <span>Bowl RR {formatMetric(entry.summary.bowlingRunRate)}</span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="surface surface-span-5">
          <div className="surface-header">
            <div>
              <p className="kicker">Player radar</p>
              <h2>{seasonLabel(selectedSeason)} batting board</h2>
            </div>
            <Link className="text-link" href={buildPath("/players", { season: selectedSeason })}>
              All players
            </Link>
          </div>

          <div className="feed-list compact">
            {players.map((entry) => (
              <Link
                key={entry.player.id}
                className="feed-row"
                href={buildPath(`/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <div>
                  <p className="feed-title">{entry.player.name}</p>
                  <p className="feed-meta">
                    {entry.teams.map((team) => team.name).join(", ")}
                  </p>
                </div>
                <div className="feed-metric">
                  <span>{entry.batting.runs} runs</span>
                  <span>SR {formatMetric(entry.batting.strikeRate)}</span>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="surface surface-span-6 accent-surface">
          <div className="surface-header">
            <div>
              <p className="kicker">Impact preview</p>
              <h2>Death-overs hitters</h2>
            </div>
            <Link className="text-link" href={buildPath("/api/insights/top-batters", { season: selectedSeason, phase: "death" })}>
              Raw API
            </Link>
          </div>

          <div className="leader-list">
            {deathBatters.map((entry, index) => (
              <Link
                key={entry.player.id}
                className="leader-row"
                href={buildPath(`/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <span className="leader-rank">0{index + 1}</span>
                <div className="leader-copy">
                  <strong>{entry.player.name}</strong>
                  <span>
                    {entry.batting.runs} runs · SR {formatMetric(entry.batting.strikeRate)} · Boundary %{" "}
                    {formatMetric(entry.batting.boundaryBallPct)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="surface surface-span-6">
          <div className="surface-header">
            <div>
              <p className="kicker">Pressure bowlers</p>
              <h2>Powerplay wicket-takers</h2>
            </div>
          </div>

          <div className="leader-list">
            {powerplayBowlers.map((entry, index) => (
              <Link
                key={entry.player.id}
                className="leader-row"
                href={buildPath(`/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <span className="leader-rank">0{index + 1}</span>
                <div className="leader-copy">
                  <strong>{entry.player.name}</strong>
                  <span>
                    {entry.bowling.wickets} wickets · Econ {formatMetric(entry.bowling.economy)} · Dot %{" "}
                    {formatMetric(entry.bowling.dotBallPct)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <div className="surface surface-span-12">
          <RecentMatchList
            title="Latest match thread"
            items={recentMatches.map((match) => ({ match }))}
          />
        </div>
      </section>
    </main>
  );
}
