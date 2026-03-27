import Link from "next/link";

import { SeasonFilter } from "@/components/season-filter";
import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatMetric } from "@/lib/format";
import { normalizeSeasonParam, seasonLabel } from "@/lib/season";
import { buildPath } from "@/lib/url";

export const metadata = {
  title: "Teams | PitchIQ"
};

export default async function TeamsPage({ searchParams }) {
  const repository = await getCricketRepository();
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );
  const teams = await repository.listTeams({
    season: selectedSeason
  });

  return (
    <main className="page-shell">
      <SeasonFilter pathname="/teams" seasons={manifest.seasons} currentSeason={selectedSeason} />

      <section className="page-headline">
        <p className="kicker">Teams</p>
        <h1>Read a side through run-rate shape and phase identity.</h1>
        <p className="page-copy">
          Team pages should tell users how a side wins, where it applies pressure,
          and which players are driving that profile. Current lens: {seasonLabel(selectedSeason)}.
        </p>
      </section>

      <section className="card-grid">
        {teams.map((entry, index) => (
          <Link
            key={entry.team.id}
            className="profile-card"
            href={buildPath(`/teams/${entry.team.id}`, { season: selectedSeason })}
          >
            <div className="profile-topline">
              <p className="profile-eyebrow">Rank #{index + 1}</p>
              <h2>{entry.team.name}</h2>
            </div>

            <div className="profile-metrics">
              <div>
                <span>Record</span>
                <strong>
                  {entry.summary.wins}-{entry.summary.losses}
                </strong>
              </div>
              <div>
                <span>Win %</span>
                <strong>{formatMetric(entry.summary.winPct)}</strong>
              </div>
              <div>
                <span>Bat RR</span>
                <strong>{formatMetric(entry.summary.battingRunRate)}</strong>
              </div>
              <div>
                <span>Net RR</span>
                <strong>{formatMetric(entry.summary.netRunRate)}</strong>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
