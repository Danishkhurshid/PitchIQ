import { notFound } from "next/navigation";
import Link from "next/link";

import { MatchWormChart } from "@/components/match-worm-chart";
import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatDate, formatMetric, formatOversFromBalls } from "@/lib/format";
import { buildPath } from "@/lib/url";

export async function generateMetadata({ params }) {
  const { matchId, league } = await params;
  const repository = await getCricketRepository(league);
  const match = await repository.getMatch(matchId);

  return {
    title: match
      ? `${match.match.teams.home?.name} vs ${match.match.teams.away?.name} | PitchIQ`
      : "Match | PitchIQ"
  };
}

export default async function MatchDetailPage({ params }) {
  const { matchId, league } = await params;
  const repository = await getCricketRepository(league);
  const payload = await repository.getMatch(matchId, { includeDeliveries: true });

  if (!payload) {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="detail-hero">
        <div className="detail-copy">
          <p className="kicker">Match centre</p>
          <h1>
            <nobr>{payload.match.teams.home?.name}</nobr> vs <nobr>{payload.match.teams.away?.name}</nobr>
          </h1>
          <p className="page-copy">
            {payload.match.stage || "League match"} · {formatDate(payload.match.matchDate)} ·{" "}
            <Link className="text-link" href={buildPath(`/${league}/venues/${payload.match.venue?.venue_id}`)}>
              {payload.match.venue?.venue_name}
            </Link>
          </p>
        </div>

        <div className="insight-stack">
          <article className="insight-card">
            <p className="insight-label">Winner</p>
            <strong>
              {payload.match.result.winner?.id ? (
                <Link href={buildPath(`/${league}/teams/${payload.match.result.winner.id}`)}>
                   {payload.match.result.winner.name}
                </Link>
              ) : payload.match.result.label || "No result"}
            </strong>
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
            <strong>
              {payload.match.playerOfMatch[0]?.player?.id ? (
                <Link href={buildPath(`/${league}/players/${payload.match.playerOfMatch[0].player.id}`)}>
                  {payload.match.playerOfMatch[0].player.name}
                </Link>
              ) : payload.match.playerOfMatch[0]?.name || "NA"}
            </strong>
          </article>
        </div>
      </section>

      <section className="content-grid">
        <MatchWormChart deliveries={payload.deliveries} innings={payload.innings} />
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
                  <h2>
                    <Link href={buildPath(`/${league}/teams/${innings.battingTeam?.id}`)}>
                       {innings.battingTeam?.name}
                    </Link>
                  </h2>
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
                    <strong>
                      <Link href={buildPath(`/${league}/teams/${innings.bowlingTeam?.id}`)}>
                         {innings.bowlingTeam?.name}
                      </Link>
                    </strong>
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
                  <p className="feed-title">
                    <Link href={buildPath(`/${league}/players/${entry.player.id}`)}>
                      {entry.player.name}
                    </Link>
                  </p>
                  <p className="feed-meta">
                    <Link href={buildPath(`/${league}/teams/${entry.team.id}`)}>
                       {entry.team.name}
                    </Link>
                  </p>
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
                  <p className="feed-title">
                    <Link href={buildPath(`/${league}/players/${entry.player.id}`)}>
                      {entry.player.name}
                    </Link>
                  </p>
                  <p className="feed-meta">
                    <Link href={buildPath(`/${league}/teams/${entry.team.id}`)}>
                       {entry.team.name}
                    </Link>
                  </p>
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
                    {entry.ball} · <Link href={buildPath(`/${league}/players/${entry.playerOut.id}`)}>{entry.playerOut.name}</Link>
                  </p>
                  <p className="feed-meta">
                    {entry.dismissalKind} by {entry.bowler?.id ? <Link href={buildPath(`/${league}/players/${entry.bowler.id}`)}>{entry.bowler.name}</Link> : entry.bowler?.name || "unknown"}
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
                    {entry.team?.id ? <Link href={buildPath(`/${league}/teams/${entry.team.id}`)}>{entry.team.name}</Link> : entry.team?.name} · {entry.decision}
                  </p>
                </div>
              </div>
            ))}

            {payload.replacements.map((entry) => (
              <div key={`replacement-${entry.inningsNumber}-${entry.ball}-${entry.playerIn?.id || "na"}`} className="feed-row">
                <div>
                  <p className="feed-title">
                    Replacement · {entry.playerIn?.id ? <Link href={buildPath(`/${league}/players/${entry.playerIn.id}`)}>{entry.playerIn.name}</Link> : entry.playerIn?.name}
                  </p>
                  <p className="feed-meta">
                    {entry.team?.id ? <Link href={buildPath(`/${league}/teams/${entry.team.id}`)}>{entry.team.name}</Link> : entry.team?.name} · {entry.reason || entry.scope}
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
