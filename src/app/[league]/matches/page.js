import Link from "next/link";

import { SeasonFilter } from "@/components/season-filter";
import { LeagueFilter } from "@/components/league-filter";
import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatDate, formatNumber } from "@/lib/format";
import { normalizeSeasonParam, seasonLabel } from "@/lib/season";
import { buildPath } from "@/lib/url";

export const metadata = {
  title: "Matches | PitchIQ"
};

export default async function MatchesPage({ params, searchParams }) {
  const { league } = await params;
  const repository = await getCricketRepository(league);
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );
  const matches = await repository.listMatches({
    season: selectedSeason,
    limit: "all"
  });

  return (
    <main className="page-shell">
      <LeagueFilter currentLeague={league} currentSeason={selectedSeason} />
      <SeasonFilter pathname={`/${league}/matches`} seasons={manifest.seasons} currentSeason={selectedSeason} />

      <section className="page-headline">
        <p className="kicker">Matches</p>
        <h1>Turn every scorecard into a drill-down story.</h1>
        <p className="page-copy">
          Match pages should combine score context, standout performers, wicket
          events, and eventually narrative cards like turning points and matchup swings.
          Current lens: {seasonLabel(selectedSeason)}.
        </p>
      </section>

      <section className="surface">
        <div className="surface-header">
          <div>
            <p className="kicker">Archive</p>
            <h2>Full {league.toUpperCase()} match log</h2>
          </div>
          <span className="directory-count">{formatNumber(matches.length)} matches listed</span>
        </div>

        <p className="directory-summary">
          Showing all {formatNumber(matches.length)} matches in {seasonLabel(selectedSeason)}.
        </p>

        <div className="feed-list">
          {matches.map((match) => (
            <Link
              key={match.matchId}
              className="feed-row"
              href={buildPath(`/${league}/matches/${match.matchId}`, { season: selectedSeason })}
            >
              <div>
                <p className="feed-title">
                  {match.teams.home?.name} vs {match.teams.away?.name}
                </p>
                <p className="feed-meta">
                  {match.stage || "League match"} · {formatDate(match.matchDate)}
                </p>
              </div>
              <div className="feed-metric">
                <span>{match.result.winner?.name || match.result.label || "No result"}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
