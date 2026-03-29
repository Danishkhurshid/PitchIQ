import Link from "next/link";
import { RecentMatchList } from "@/components/recent-match-list";
import { SeasonFilter } from "@/components/season-filter";
import { LeagueFilter } from "@/components/league-filter";
import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatMetric, formatNumber } from "@/lib/format";
import { normalizeSeasonParam, seasonLabel } from "@/lib/season";
import { buildPath } from "@/lib/url";

function storyCards({ league, deathBatters, powerplayBowlers, teams, selectedSeason }) {
  const bestDeathBatter = deathBatters[0];
  const bestPowerplayBowler = powerplayBowlers[0];
  const bestTeam = teams[0];
  const contextLabel =
    selectedSeason === "all" ? `across the ${league.toUpperCase()} archive` : `in the ${selectedSeason} ${league.toUpperCase()} season`;

  return [
    {
      eyebrow: "Hot zone",
      title: `${bestDeathBatter.player.name} owns the death overs`,
      body: `${bestDeathBatter.batting.runs} runs at a strike rate of ${formatMetric(bestDeathBatter.batting.strikeRate)} ${contextLabel}.`,
      href: buildPath(`/${league}/players/${bestDeathBatter.player.id}`, { season: selectedSeason })
    },
    {
      eyebrow: "New-ball pressure",
      title: `${bestPowerplayBowler.player.name} is setting the tone up front`,
      body: `${bestPowerplayBowler.bowling.wickets} wickets in the powerplay with ${formatMetric(bestPowerplayBowler.bowling.dotBallPct)}% dots.`,
      href: buildPath(`/${league}/players/${bestPowerplayBowler.player.id}`, { season: selectedSeason })
    },
    {
      eyebrow: "Team pulse",
      title: `${bestTeam.team.name} looks like the most complete side`,
      body: `${bestTeam.summary.wins} wins and a net run rate of ${formatMetric(bestTeam.summary.netRunRate)} make them the cleanest dashboard story right now.`,
      href: buildPath(`/${league}/teams/${bestTeam.team.id}`, { season: selectedSeason })
    }
  ];
}

export default async function LeagueHomePage({ params, searchParams }) {
  const { league } = await params;
  const repository = await getCricketRepository(league);
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
    league,
    deathBatters,
    powerplayBowlers,
    teams,
    selectedSeason
  });

  return (
    <main className="page-shell">
      <LeagueFilter currentLeague={league} currentSeason={selectedSeason} />
      <SeasonFilter pathname={`/${league}`} seasons={manifest.seasons} currentSeason={selectedSeason} />

      <section className="hero-grid">
        <article className="hero-panel hero-panel-primary">
          <p className="kicker">{league.toUpperCase()} Hub</p>
          <h1>{manifest.competition} Intelligence</h1>
          <p className="hero-copy">
            Bleacher Report style match coverage built on ball-by-ball depth.
            Explore seasonal trends, player phases, and live match threads.
          </p>

          <div className="stat-grid">
            <div className="stat-tile">
              <span>{league.toUpperCase()} matches</span>
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
          <p className="kicker">Quick Access</p>
          <div className="shortcut-stack">
            <Link className="shortcut-card" href={buildPath(`/${league}/players`, { season: selectedSeason })}>
              <strong>Players</strong>
              <span>Form, phase splits, and dismissal profiles</span>
            </Link>
            <Link className="shortcut-card" href={buildPath(`/${league}/teams`, { season: selectedSeason })}>
              <strong>Teams</strong>
              <span>Standings and phase-by-phase identity</span>
            </Link>
            <Link className="shortcut-card" href={buildPath(`/${league}/matches`, { season: selectedSeason })}>
              <strong>Match History</strong>
              <span>Full match scorecards and results archive</span>
            </Link>
          </div>
        </article>
      </section>

      <section className="story-grid" style={{ marginBottom: "40px" }}>
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
              <h2>{league.toUpperCase()} Team Dashboard</h2>
            </div>
          </div>

          <div className="table-list">
            {teams.map((entry, index) => (
              <Link
                key={entry.team.id}
                className="table-row"
                href={buildPath(`/${league}/teams/${entry.team.id}`, { season: selectedSeason })}
              >
                <div className="table-rank">{index + 1}</div>
                <div className="table-primary">
                  <strong>{entry.team.name}</strong>
                  <span>
                    {entry.summary.wins}-{entry.summary.losses} · NRR{" "}
                    {formatMetric(entry.summary.netRunRate)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="surface surface-span-5">
          <div className="surface-header">
            <div>
              <p className="kicker">League Radar</p>
              <h2>Top Batters</h2>
            </div>
          </div>

          <div className="feed-list compact">
            {players.map((entry) => (
              <Link
                key={entry.player.id}
                className="feed-row"
                href={buildPath(`/${league}/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <div>
                  <p className="feed-title">{entry.player.name}</p>
                </div>
                <div className="feed-metric">
                  <span>{entry.batting.runs} runs</span>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
         <div className="surface surface-span-12">
            <RecentMatchList
              title="Recent Match History"
              items={recentMatches.map((match) => ({ match }))}
              season={selectedSeason}
              leaguePrefix={`/${league}`}
            />
         </div>
      </section>
    </main>
  );
}
