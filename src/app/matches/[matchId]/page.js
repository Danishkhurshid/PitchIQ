import { notFound } from "next/navigation";

import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatDate, formatMetric, formatOversFromBalls } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { matchId } = await params;
  const repository = await getCricketRepository();
  const match = await repository.getMatch(matchId);

  return {
    title: match
      ? `${match.match.teams.home?.name} vs ${match.match.teams.away?.name} | PitchIQ`
      : "Match | PitchIQ"
  };
}

export default async function MatchDetailPage({ params }) {
  const { matchId } = await params;
  const repository = await getCricketRepository();
  const payload = await repository.getMatch(matchId);

  if (!payload) {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="detail-hero">
        <div className="detail-copy">
          <p className="kicker">Match centre</p>
          <h1>
            {payload.match.teams.home?.name} vs {payload.match.teams.away?.name}
          </h1>
          <p className="page-copy">
            {payload.match.stage || "League match"} · {formatDate(payload.match.matchDate)} ·{" "}
            {payload.match.venue?.venue_name}
          </p>
        </div>

        <div className="insight-stack">
          <article className="insight-card">
            <p className="insight-label">Winner</p>
            <strong>{payload.match.result.winner?.name || payload.match.result.label || "No result"}</strong>
          </article>
          <article className="insight-card">
            <p className="insight-label">Margin</p>
            <strong>
              {payload.match.result.margin
                ? `${payload.match.result.margin} ${payload.match.result.type}`
                : payload.match.result.label || "NA"}
            </strong>
          </article>
          <article className="insight-card">
            <p className="insight-label">Player of the match</p>
            <strong>{payload.match.playerOfMatch[0]?.name || payload.match.playerOfMatch[0]?.player?.name || "NA"}</strong>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <article className="surface surface-span-12">
          <div className="surface-header">
            <div>
              <p className="kicker">Innings summary</p>
              <h2>Score context</h2>
            </div>
          </div>

          <div className="card-grid compact-grid">
            {payload.innings.map((innings) => (
              <div key={innings.inningsNumber} className="profile-card passive">
                <div className="profile-topline">
                  <p className="profile-eyebrow">Innings {innings.inningsNumber}</p>
                  <h2>{innings.battingTeam?.name}</h2>
                </div>
                <div className="profile-metrics">
                  <div>
                    <span>Score</span>
                    <strong>
                      {innings.totalRuns}/{innings.totalWickets}
                    </strong>
                  </div>
                  <div>
                    <span>Overs</span>
                    <strong>{formatOversFromBalls(innings.legalBalls)}</strong>
                  </div>
                  <div>
                    <span>Opponent</span>
                    <strong>{innings.bowlingTeam?.name}</strong>
                  </div>
                  <div>
                    <span>Target</span>
                    <strong>{innings.target?.runs || "-"}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="surface surface-span-6">
          <div className="surface-header">
            <div>
              <p className="kicker">Scorecard</p>
              <h2>Top batting returns</h2>
            </div>
          </div>
          <div className="feed-list compact">
            {payload.scorecards.batting.slice(0, 10).map((entry) => (
              <div key={`${entry.player.id}-${entry.team.id}`} className="feed-row">
                <div>
                  <p className="feed-title">{entry.player.name}</p>
                  <p className="feed-meta">{entry.team.name}</p>
                </div>
                <div className="feed-metric">
                  <span>
                    {entry.runs} ({entry.ballsFaced})
                  </span>
                  <span>SR {formatMetric(entry.strikeRate)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface surface-span-6">
          <div className="surface-header">
            <div>
              <p className="kicker">Scorecard</p>
              <h2>Top bowling returns</h2>
            </div>
          </div>
          <div className="feed-list compact">
            {payload.scorecards.bowling.slice(0, 10).map((entry) => (
              <div key={`${entry.player.id}-${entry.team.id}`} className="feed-row">
                <div>
                  <p className="feed-title">{entry.player.name}</p>
                  <p className="feed-meta">{entry.team.name}</p>
                </div>
                <div className="feed-metric">
                  <span>
                    {entry.wickets}/{entry.runsConceded}
                  </span>
                  <span>Econ {formatMetric(entry.economy)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="surface surface-span-8">
          <div className="surface-header">
            <div>
              <p className="kicker">Turning points</p>
              <h2>Wicket timeline</h2>
            </div>
          </div>
          <div className="feed-list compact">
            {payload.wicketEvents.map((entry) => (
              <div key={`${entry.inningsNumber}-${entry.ball}-${entry.playerOut.id}`} className="feed-row">
                <div>
                  <p className="feed-title">
                    {entry.ball} · {entry.playerOut.name}
                  </p>
                  <p className="feed-meta">
                    {entry.dismissalKind} by {entry.bowler?.name || "unknown"}
                  </p>
                </div>
                <div className="feed-metric">
                  <span>Innings {entry.inningsNumber}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface surface-span-4">
          <div className="surface-header">
            <div>
              <p className="kicker">Context flags</p>
              <h2>Reviews and replacements</h2>
            </div>
          </div>
          <div className="feed-list compact">
            {payload.reviews.length === 0 && payload.replacements.length === 0 ? (
              <div className="feed-row">
                <div>
                  <p className="feed-title">Clean game</p>
                  <p className="feed-meta">No reviews or substitutions recorded</p>
                </div>
              </div>
            ) : null}

            {payload.reviews.map((entry) => (
              <div key={`review-${entry.inningsNumber}-${entry.ball}`} className="feed-row">
                <div>
                  <p className="feed-title">
                    Review · {entry.ball}
                  </p>
                  <p className="feed-meta">
                    {entry.team?.name} · {entry.decision}
                  </p>
                </div>
              </div>
            ))}

            {payload.replacements.map((entry) => (
              <div key={`replacement-${entry.inningsNumber}-${entry.ball}-${entry.playerIn?.id || "na"}`} className="feed-row">
                <div>
                  <p className="feed-title">
                    Replacement · {entry.playerIn?.name}
                  </p>
                  <p className="feed-meta">
                    {entry.team?.name} · {entry.reason || entry.scope}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
