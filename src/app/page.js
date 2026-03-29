import { LeagueFilter } from "@/components/league-filter";
import { LiveMatchHero } from "@/components/live-match-hero";
import { LiveEventFeed } from "@/components/live-event-feed";
import { BlogShortcuts } from "@/components/blog-shortcuts";
import { fetchLiveMatch } from "@/lib/server/live-cricket-api";
import Link from "next/link";

export default async function HomePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const league = resolvedSearchParams?.league || "psl";

  // Fetch live data from CricAPI — returns null if no match / no API key
  const liveUpdate = await fetchLiveMatch(league);

  return (
    <main className="page-shell">
      <LeagueFilter currentLeague={league} />

      {/* ── Live Now ───────────────────────────────────────────────── */}
      <section className="live-now-section">
        <div className="live-now-header">
          <p className="kicker live-kicker">
            <span className="live-pulse-dot" />
            Live Now
          </p>
          <h2>Ongoing Match Coverage</h2>
        </div>

        {liveUpdate ? (
          <div className="content-grid">
            <div className="surface-span-8">
              <LiveMatchHero data={liveUpdate} />
            </div>
            <div className="surface-span-4">
              <LiveEventFeed events={liveUpdate.events} />
            </div>
          </div>
        ) : (
          <div className="no-live-state surface">
            <div className="no-live-icon">🏏</div>
            <h3>No live match right now</h3>
            <p>
              {league.toUpperCase()} isn&apos;t in session at the moment. Check
              back during match days for ball-by-ball coverage and live scores.
            </p>
            <Link className="text-link" href={`/${league}/matches`}>
              Browse recent {league.toUpperCase()} results →
            </Link>
          </div>
        )}
      </section>

      {/* ── Editorial ──────────────────────────────────────────────── */}
      <BlogShortcuts />

      {/* ── Archive entry ──────────────────────────────────────────── */}
      <section className="hero-grid" style={{ marginTop: "40px" }}>
        <article className="hero-panel hero-panel-primary">
          <p className="kicker">PitchIQ Intelligence</p>
          <h1 style={{ fontSize: "clamp(2rem, 3vw, 3.2rem)", margin: "10px 0 0" }}>
            Explore League Analytics
          </h1>
          <p className="hero-copy" style={{ marginTop: "12px" }}>
            Deep dives into historical data, player phases, and team identities.
            Currently browsing the {league.toUpperCase()} archive.
          </p>
          <div style={{ marginTop: "24px" }}>
            <Link
              className="text-link"
              href={`/${league}`}
              style={{ fontSize: "1.2rem", fontWeight: "700" }}
            >
              Go to {league.toUpperCase()} Analytics Dashboard →
            </Link>
          </div>
        </article>

        <article className="hero-panel hero-panel-side">
          <p className="kicker">Match Archives</p>
          <div className="shortcut-stack">
            <Link className="shortcut-card" href={`/${league}/matches`}>
              <strong>{league.toUpperCase()} Match History</strong>
              <span>Explore all historical match scorecards and results.</span>
            </Link>
            <Link className="shortcut-card" href={`/${league}/players`}>
              <strong>{league.toUpperCase()} Player Profiles</strong>
              <span>Phase-by-phase breakdowns for every squad member.</span>
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
