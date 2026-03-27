import Link from "next/link";

import { formatDate, formatMetric } from "@/lib/format";
import { buildPath } from "@/lib/url";

export function RecentMatchList({ title, items, showStatline = false, season }) {
  return (
    <div>
      <div className="surface-header">
        <div>
          <p className="kicker">Recent context</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="feed-list">
        {items.map((item) => (
          <Link
            key={item.match.matchId}
            className="feed-row"
            href={buildPath(`/matches/${item.match.matchId}`, { season })}
          >
            <div>
              <p className="feed-title">
                {item.match.teams.home?.name} vs {item.match.teams.away?.name}
              </p>
              <p className="feed-meta">
                {item.match.stage || "League match"} · {formatDate(item.match.matchDate)}
              </p>
            </div>

            {showStatline ? (
              <div className="feed-metric">
                {item.batting ? (
                  <span>
                    {item.batting.runs} ({item.batting.ballsFaced}) · SR{" "}
                    {formatMetric(item.batting.strikeRate)}
                  </span>
                ) : null}
                {item.bowling ? (
                  <span>
                    {item.bowling.wickets}/{item.bowling.runsConceded} · Econ{" "}
                    {formatMetric(item.bowling.economy)}
                  </span>
                ) : null}
              </div>
            ) : (
              <div className="feed-metric">
                <span>{item.match.result.winner?.name || "No result"}</span>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
