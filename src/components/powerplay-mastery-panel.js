"use client";

import { ComparisonStatBlock } from "./comparison-stat-block";
import { formatMetric } from "@/lib/format";
import Link from "next/link";
import { buildPath } from "@/lib/url";

export function PowerplayMasteryPanel({ title, identity, leaders, season }) {
  if (!identity || !identity.ranks || !leaders) return null;

  const { ranks } = identity;

  return (
    <article className="surface surface-span-12">
      <div className="surface-header">
        <div>
          <p className="kicker">Phase dominance</p>
          <h2>{title}</h2>
          <p className="page-copy">
            Evaluating how this team controls the first 6 overs through aggressive batting and early breakthroughs.
          </p>
        </div>
      </div>

      <div className="content-grid" style={{ marginTop: "24px" }}>
        <div className="surface-span-4 matchup-grid">
           <div className="matchup-header" style={{ gridTemplateColumns: "1fr" }}>
              <span>Powerplay Metrics</span>
           </div>
           <ComparisonStatBlock
              label="Batting Strike Rate"
              rankData={ranks.powerplayBatting}
              formatValue={(v) => `SR ${formatMetric(v)}`}
            />
            <ComparisonStatBlock
              label="Bowling Strike Rate (Wickets)"
              rankData={ranks.powerplayWickets}
              formatValue={(v) => `Every ${formatMetric(v)} balls`}
            />
        </div>

        <div className="surface-span-4">
          <div className="matchup-header" style={{ gridTemplateColumns: "1fr" }}>
            <span>Top Powerplay Batters</span>
          </div>
          <div className="feed-list compact" style={{ marginTop: "12px" }}>
            {leaders.powerplay.batting.map((entry) => (
              <Link
                key={entry.player.id}
                href={buildPath(`/players/${entry.player.id}`, { season })}
                className="feed-row"
              >
                <div>
                  <p className="feed-title">{entry.player.name}</p>
                  <p className="feed-meta">{entry.batting.runs} runs in PP</p>
                </div>
                <div className="feed-metric">
                  <span>SR {formatMetric(entry.batting.strikeRate)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="surface-span-4">
          <div className="matchup-header" style={{ gridTemplateColumns: "1fr" }}>
            <span>Top Powerplay Bowlers</span>
          </div>
          <div className="feed-list compact" style={{ marginTop: "12px" }}>
            {leaders.powerplay.bowling.map((entry) => (
              <Link
                key={entry.player.id}
                href={buildPath(`/players/${entry.player.id}`, { season })}
                className="feed-row"
              >
                <div>
                  <p className="feed-title">{entry.player.name}</p>
                  <p className="feed-meta">{entry.bowling.wickets} PP wickets</p>
                </div>
                <div className="feed-metric">
                  <span>Econ {formatMetric(entry.bowling.economy)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .matchup-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}</style>
    </article>
  );
}
