import Link from "next/link";

import { SeasonFilter } from "@/components/season-filter";
import { LeagueFilter } from "@/components/league-filter";
import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatMetric, formatNumber } from "@/lib/format";
import { normalizeSeasonParam, seasonLabel } from "@/lib/season";
import { buildPath } from "@/lib/url";

export const metadata = {
  title: "Venues | PitchIQ"
};

function venueEyebrow(venue) {
  return venue.city || "Venue profile";
}

export default async function VenuesPage({ params, searchParams }) {
  const { league } = await params;
  const repository = await getCricketRepository(league);
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );
  const venues = await repository.listVenues({
    season: selectedSeason
  });

  return (
    <main className="page-shell">
      <LeagueFilter currentLeague={league} currentSeason={selectedSeason} />
      <SeasonFilter pathname={`/${league}/venues`} seasons={manifest.seasons} currentSeason={selectedSeason} />

      <section className="page-headline">
        <p className="kicker">Venues</p>
        <h1>Explain the ground before the first ball is bowled.</h1>
        <p className="page-copy">
          Venue pages should tell users whether a ground rewards totals, chasing,
          or pressure bowling, and who has historically owned that environment.
          Current lens: {seasonLabel(selectedSeason)}.
        </p>
      </section>

      <section className="card-grid">
        {venues.map((entry) => (
          <Link
            key={entry.venue.id}
            className="profile-card"
            href={buildPath(`/${league}/venues/${entry.venue.id}`, { season: selectedSeason })}
          >
            <div className="profile-topline">
              <p className="profile-eyebrow">{venueEyebrow(entry.venue)}</p>
              <h2>{entry.venue.name}</h2>
            </div>

            <div className="profile-metrics">
              <div>
                <span>Matches</span>
                <strong>{formatNumber(entry.summary.matches)}</strong>
              </div>
              <div>
                <span>Avg 1st inns</span>
                <strong>{formatMetric(entry.summary.averageFirstInningsScore)}</strong>
              </div>
              <div>
                <span>Chase win %</span>
                <strong>{formatMetric(entry.summary.chaseWinPct)}</strong>
              </div>
              <div>
                <span>High score</span>
                <strong>{formatNumber(entry.summary.highestTotal?.runs)}</strong>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
