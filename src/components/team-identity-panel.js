import { ComparisonStatBlock } from "./comparison-stat-block";
import { formatMetric } from "@/lib/format";

export function TeamIdentityPanel({ title, identity }) {
  if (!identity || !identity.ranks) return null;

  const { chase, defend, ranks } = identity;

  return (
    <article className="surface surface-span-12">
      <div className="surface-header">
        <div>
          <p className="kicker">Team identity</p>
          <h2>{title}</h2>
        </div>
      </div>
      
      <div className="form-card-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <ComparisonStatBlock
          label="Powerplay run rate"
          rankData={ranks.powerplayBatting}
          formatValue={(v) => `SR ${formatMetric(v)}`}
        />
        <ComparisonStatBlock
          label="Middle-over pressure"
          rankData={ranks.middleOverCollapse}
          formatValue={(v) => `Avg ${formatMetric(v)}`}
        />
        <ComparisonStatBlock
          label="Death-over hitting"
          rankData={ranks.deathHitting}
          formatValue={(v) => `SR ${formatMetric(v)}`}
        />
        <ComparisonStatBlock
          label="Powerplay wickets"
          rankData={ranks.powerplayWickets}
          formatValue={(v) => `SR ${formatMetric(v)}`}
        />
        <ComparisonStatBlock
          label="Death-over economy"
          rankData={ranks.deathEconomy}
          formatValue={(v) => `Econ ${formatMetric(v)}`}
        />
        
        <div className="form-stat-card">
          <span className="trend-kicker">Context records</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "12px" }}>
            <div>
              <span style={{ fontSize: "0.8em", color: "var(--ink-soft)" }}>Chasing</span>
              <strong style={{ display: "block", marginTop: "2px", fontSize: "1.1rem" }}>
                {chase.wins}W - {chase.losses}L
              </strong>
            </div>
            <div>
              <span style={{ fontSize: "0.8em", color: "var(--ink-soft)" }}>Defending</span>
              <strong style={{ display: "block", marginTop: "2px", fontSize: "1.1rem" }}>
                {defend.wins}W - {defend.losses}L
              </strong>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
