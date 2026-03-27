import { formatMetric, formatOversFromBalls } from "@/lib/format";

export function PhaseTable({ title, items, mode }) {
  const isBatting = mode === "batting";
  const maxPrimaryValue = Math.max(
    ...items.map((item) =>
      isBatting ? item.batting.strikeRate || 0 : item.bowling.wickets || 0
    ),
    1
  );

  return (
    <div>
      <div className="surface-header">
        <div>
          <p className="kicker">{mode === "batting" ? "Batting profile" : "Bowling profile"}</p>
          <h2>{title}</h2>
        </div>
      </div>

      <div className="phase-stack">
        {items.map((item) => {
          const primaryValue = isBatting
            ? item.batting.strikeRate || 0
            : item.bowling.wickets || 0;
          const fill = Math.max(8, Math.min(100, (primaryValue / maxPrimaryValue) * 100));

          return (
            <div key={item.phase} className="phase-card">
              <div className="phase-head">
                <div>
                  <p className="phase-name">{item.phase}</p>
                  <p className="phase-subtle">
                    {item.matches} matches, {item.innings} innings
                  </p>
                </div>
                <strong>{isBatting ? `SR ${formatMetric(item.batting.strikeRate)}` : `${formatMetric(item.bowling.wickets)} wkts`}</strong>
              </div>

              <div className="phase-bar">
                <span style={{ width: `${fill}%` }} />
              </div>

              <dl className="mini-stats">
                <div>
                  <dt>{isBatting ? "Runs" : "Overs"}</dt>
                  <dd>
                    {isBatting
                      ? formatMetric(item.batting.runs)
                      : formatOversFromBalls(item.bowling.ballsBowled)}
                  </dd>
                </div>
                <div>
                  <dt>{isBatting ? "Avg" : "Economy"}</dt>
                  <dd>
                    {isBatting
                      ? formatMetric(item.batting.average)
                      : formatMetric(item.bowling.economy)}
                  </dd>
                </div>
                <div>
                  <dt>{isBatting ? "Boundary %" : "Dot %"}</dt>
                  <dd>
                    {isBatting
                      ? formatMetric(item.batting.boundaryBallPct)
                      : formatMetric(item.bowling.dotBallPct)}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}
