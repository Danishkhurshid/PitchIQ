import Link from "next/link";
import { notFound } from "next/navigation";

import { RecentMatchList } from "@/components/recent-match-list";
import { SeasonFilter } from "@/components/season-filter";
import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatMetric, formatNumber } from "@/lib/format";
import { normalizeSeasonParam, seasonLabel } from "@/lib/season";
import { buildPath } from "@/lib/url";

function formatVenueSubtitle(venue, season) {
  const location = venue.city ? `${venue.city} · ` : "";
  return `${location}${seasonLabel(season)} venue profile`;
}

function getVenueAngles(venue) {
  const { summary } = venue;

  let venueType = "Balanced conditions";
  if ((summary.chaseWinPct || 0) >= 55) {
    venueType = "Chasing has been the cleaner route here";
  } else if ((summary.defendWinPct || 0) >= 55) {
    venueType = "Setting a total has historically mattered here";
  }

  let tossAngle = "Toss decisions are fairly split";
  if ((summary.tossFieldPct || 0) >= 60) {
    tossAngle = "Captains usually want to field first";
  } else if ((summary.tossBatPct || 0) >= 60) {
    tossAngle = "Captains usually want runs on the board";
  }

  const highScore = summary.highestTotal?.team?.name
    ? `${summary.highestTotal.team.name} posted the venue high of ${summary.highestTotal.runs}/${summary.highestTotal.wickets}`
    : "No highest total captured yet";

  return {
    venueType,
    tossAngle,
    highScore
  };
}

export async function generateMetadata({ params, searchParams }) {
  const { venueId } = await params;
  const repository = await getCricketRepository();
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );
  const venue = await repository.getVenue(venueId, {
    season: selectedSeason
  });

  return {
    title: venue ? `${venue.venue.name} | PitchIQ` : "Venue | PitchIQ"
  };
}

export default async function VenueDetailPage({ params, searchParams }) {
  const { venueId } = await params;
  const repository = await getCricketRepository();
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );
  const venue = await repository.getVenue(venueId, {
    season: selectedSeason,
    matchLimit: 8
  });

  if (!venue) {
    notFound();
  }

  const angles = getVenueAngles(venue);

  return (
    <main className="page-shell">
      <SeasonFilter
        pathname={`/venues/${venueId}`}
        seasons={manifest.seasons}
        currentSeason={selectedSeason}
      />

      <section className="detail-hero">
        <div className="detail-copy">
          <p className="kicker">Venue profile</p>
          <h1>{venue.venue.name}</h1>
          <p className="page-copy">{formatVenueSubtitle(venue.venue, venue.season)}</p>
        </div>

        <div className="insight-stack">
          <article className="insight-card">
            <p className="insight-label">Venue read</p>
            <strong>{angles.venueType}</strong>
          </article>
          <article className="insight-card">
            <p className="insight-label">Toss pattern</p>
            <strong>{angles.tossAngle}</strong>
          </article>
          <article className="insight-card">
            <p className="insight-label">High watermark</p>
            <strong>{angles.highScore}</strong>
          </article>
        </div>
      </section>

      <section className="metric-ribbon">
        <article className="metric-panel">
          <span>Matches</span>
          <strong>{formatNumber(venue.summary?.matches)}</strong>
        </article>
        <article className="metric-panel">
          <span>Avg 1st inns</span>
          <strong>{formatMetric(venue.summary?.averageFirstInningsScore)}</strong>
        </article>
        <article className="metric-panel">
          <span>Chase win %</span>
          <strong>{formatMetric(venue.summary?.chaseWinPct)}</strong>
        </article>
        <article className="metric-panel">
          <span>Field first %</span>
          <strong>{formatMetric(venue.summary?.tossFieldPct)}</strong>
        </article>
      </section>

      <section className="content-grid">
        <article className="surface surface-span-6">
          <div className="surface-header">
            <div>
              <p className="kicker">Leaders</p>
              <h2>Batters who own this venue</h2>
            </div>
          </div>

          <div className="leader-list">
            {venue.leaders.batting.map((entry, index) => (
              <Link
                key={entry.player.id}
                className="leader-row"
                href={buildPath(`/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <span className="leader-rank">0{index + 1}</span>
                <div className="leader-copy">
                  <strong>{entry.player.name}</strong>
                  <span>
                    {formatNumber(entry.batting.runs)} runs · SR{" "}
                    {formatMetric(entry.batting.strikeRate)}
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
              <h2>Bowlers who control this venue</h2>
            </div>
          </div>

          <div className="leader-list">
            {venue.leaders.bowling.map((entry, index) => (
              <Link
                key={entry.player.id}
                className="leader-row"
                href={buildPath(`/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <span className="leader-rank">0{index + 1}</span>
                <div className="leader-copy">
                  <strong>{entry.player.name}</strong>
                  <span>
                    {formatNumber(entry.bowling.wickets)} wickets · Econ{" "}
                    {formatMetric(entry.bowling.economy)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="surface surface-span-4">
          <div className="surface-header">
            <div>
              <p className="kicker">Team comfort</p>
              <h2>Who travels well here</h2>
            </div>
          </div>

          <div className="feed-list compact">
            {venue.leaders.teams.map((entry, index) => (
              <Link
                key={entry.team.id}
                className="feed-row"
                href={buildPath(`/teams/${entry.team.id}`, { season: selectedSeason })}
              >
                <div>
                  <p className="feed-title">
                    #{index + 1} {entry.team.name}
                  </p>
                  <p className="feed-meta">
                    {entry.summary.wins}-{entry.summary.losses} · NRR{" "}
                    {formatMetric(entry.summary.netRunRate)}
                  </p>
                </div>
                <div className="feed-metric">
                  <span>{formatMetric(entry.summary.winPct)}%</span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <div className="surface surface-span-8">
          <RecentMatchList
            title="Recent matches at this venue"
            items={venue.recentMatches.map((match) => ({ match }))}
            season={selectedSeason}
          />
        </div>
      </section>
    </main>
  );
}
