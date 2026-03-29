"use client";

import { formatMetric } from "@/lib/format";

export function BatterPacingPanel({ pacing }) {
  if (!pacing || pacing.length === 0) {
    return (
      <article className="surface">
        <div className="surface-header">
          <div>
            <p className="kicker">Innings Construction</p>
            <h2>Batter Pacing</h2>
          </div>
        </div>
        <div className="empty-state">
          <strong>No pacing data available.</strong>
          <p>This may be due to insufficient delivery-level data for this player.</p>
        </div>
      </article>
    );
  }

  const maxSR = Math.max(...pacing.map((p) => p.strikeRate || 0), 100);

  return (
    <article className="surface">
      <div className="surface-header">
        <div>
          <p className="kicker">Innings Construction</p>
          <h2>Batter Pacing</h2>
          <p className="page-copy">Evolution of scoring rate and risk through the innings path.</p>
        </div>
      </div>

      <div className="phase-stack">
        {pacing.map((item) => {
          const fill = Math.max(5, Math.min(100, (item.strikeRate / maxSR) * 100));
          
          return (
            <div key={item.label} className="phase-card">
              <div className="phase-head">
                <div>
                  <p className="phase-name">Balls {item.label}</p>
                  <p className="phase-subtle">{item.balls} deliveries faced</p>
                </div>
                <div style={{ textAlign: "right" }}>
                   <strong style={{ display: "block", fontSize: "1.1rem" }}>
                     SR {formatMetric(item.strikeRate)}
                   </strong>
                </div>
              </div>

              <div className="phase-bar">
                <span style={{ 
                  width: `${fill}%`,
                  background: item.strikeRate > 150 
                    ? "linear-gradient(90deg, #b55331 0%, #ff7e5f 100%)" 
                    : item.strikeRate > 120 
                      ? "linear-gradient(90deg, #1b4237 0%, #b55331 100%)"
                      : "linear-gradient(90deg, #1b4237 0%, #58645d 100%)"
                }} />
              </div>

              <dl className="mini-stats">
                <div>
                  <dt>Runs scored</dt>
                  <dd>{item.runs}</dd>
                </div>
                <div>
                  <dt>Average</dt>
                  <dd>{item.average ? formatMetric(item.average) : "—"}</dd>
                </div>
                <div>
                  <dt>Dismissals</dt>
                  <dd>{item.outs}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .phase-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .phase-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(24, 32, 29, 0.08);
          background: rgba(255, 255, 255, 0.82);
        }
      `}</style>
    </article>
  );
}
