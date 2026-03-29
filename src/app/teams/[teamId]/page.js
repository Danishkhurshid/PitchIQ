import Link from "next/link";
import { notFound } from "next/navigation";

import { PhaseTable } from "@/components/phase-table";
import { PowerplayMasteryPanel } from "@/components/powerplay-mastery-panel";
import { RecentMatchList } from "@/components/recent-match-list";
import { SeasonFilter } from "@/components/season-filter";
import { TeamIdentityPanel } from "@/components/team-identity-panel";
import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatMetric } from "@/lib/format";
import { normalizeSeasonParam, seasonLabel } from "@/lib/season";
import { buildPath } from "@/lib/url";

export async function generateMetadata({ params, searchParams }) {
  const { teamId } = await params;
  const repository = await getCricketRepository();
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );
  const team = await repository.getTeam(teamId, {
    season: selectedSeason
  });

  return {
    title: team ? `${team.team.name} | PitchIQ` : "Team | PitchIQ"
  };
}

export default async function TeamDetailPage({ params, searchParams }) {
  const { teamId } = await params;
  const repository = await getCricketRepository();
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );
  const team = await repository.getTeam(teamId, {
    season: selectedSeason,
    matchLimit: 8
  });

  if (!team) {
    notFound();
  }

  return (
    <main className="page-shell">
      <SeasonFilter
        pathname={`/teams/${teamId}`}
        seasons={manifest.seasons}
        currentSeason={selectedSeason}
      />

      <section className="detail-hero">
        <div className="detail-copy">
          <p className="kicker">Team dashboard</p>
          <h1>{team.team.name}</h1>
          <p className="page-copy">
            {seasonLabel(team.season)} profile built from results, team run-rates, player leaders,
            and phase-by-phase production.
          </p>
        </div>

        <div className="insight-stack">
          <article className="insight-card">
            <p className="insight-label">Win rate</p>
            <strong>{formatMetric(team.summary?.winPct)}%</strong>
          </article>
          <article className="insight-card">
            <p className="insight-label">Batting run rate</p>
            <strong>{formatMetric(team.summary?.battingRunRate)}</strong>
          </article>
          <article className="insight-card">
            <p className="insight-label">Net run rate</p>
            <strong>{formatMetric(team.summary?.netRunRate)}</strong>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <TeamIdentityPanel 
          title="League comparisons" 
          identity={team.identity} 
        />
      </section>

      <section className="content-grid">
        <PowerplayMasteryPanel 
          title="Powerplay mastery"
          identity={team.identity}
          leaders={team.leaders}
          season={selectedSeason}
        />
      </section>

      <section className="content-grid">
        <article className="surface surface-span-6">
          <div className="surface-header">
            <div>
              <p className="kicker">Leaders</p>
              <h2>Batting engine room</h2>
            </div>
          </div>
          <div className="leader-list">
            {team.leaders.batting.map((entry, index) => (
              <Link
                key={entry.player.id}
                className="leader-row"
                href={buildPath(`/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <span className="leader-rank">0{index + 1}</span>
                <div className="leader-copy">
                  <strong>{entry.player.name}</strong>
                  <span>
                    {entry.batting.runs} runs · SR {formatMetric(entry.batting.strikeRate)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="surface surface-span-6">
          <div className="surface-header">
            <div>
              <p className="kicker">Leaders</p>
              <h2>Bowling spine</h2>
            </div>
          </div>
          <div className="leader-list">
            {team.leaders.bowling.map((entry, index) => (
              <Link
                key={entry.player.id}
                className="leader-row"
                href={buildPath(`/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <span className="leader-rank">0{index + 1}</span>
                <div className="leader-copy">
                  <strong>{entry.player.name}</strong>
                  <span>
                    {entry.bowling.wickets} wickets · Econ {formatMetric(entry.bowling.economy)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <div className="surface surface-span-6">
          <PhaseTable
            title="Batting identity by phase"
            items={team.phaseProfile.batting}
            mode="batting"
          />
        </div>
        <div className="surface surface-span-6">
          <PhaseTable
            title="Bowling pressure by phase"
            items={team.phaseProfile.bowling}
            mode="bowling"
          />
        </div>
      </section>

      <section className="content-grid">
        <article className="surface surface-span-4">
          <div className="surface-header">
            <div>
              <p className="kicker">Context records</p>
              <h2>Best venues</h2>
            </div>
          </div>

          <div className="feed-list compact">
            {team.venues && team.venues.length > 0 ? (
              team.venues.slice(0, 5).map((entry) => (
                <Link
                  key={entry.venue.id}
                  className="feed-row"
                  href={buildPath(`/venues/${entry.venue.id}`, { season: selectedSeason })}
                >
                  <div>
                    <p className="feed-title">{entry.venue.name}</p>
                    <p className="feed-meta">
                      {entry.wins}W - {entry.losses}L
                    </p>
                  </div>
                  <div className="feed-metric">
                    <span>{formatMetric(entry.winPct)}%</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty-state">
                <p className="kicker">No data</p>
                <strong>No venue records found.</strong>
              </div>
            )}
          </div>
        </article>

        <div className="surface surface-span-8">
          <RecentMatchList
            title="Recent matches"
            items={team.recentMatches.map((match) => ({ match }))}
            season={selectedSeason}
          />
        </div>
      </section>
    </main>
  );
}
