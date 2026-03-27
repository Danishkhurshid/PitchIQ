export function ComparisonStatBlock({ label, rankData, formatValue = (v) => v }) {
  if (!rankData) return null;

  const isTopTier = rankData.rank <= 2;
  const isBottomTier = rankData.rank > rankData.of - 2;

  let highlightClass = "";
  let icon = "•";

  if (isTopTier && rankData.of > 2) {
    highlightClass = "positive-trend";
    icon = "↑";
  } else if (isBottomTier && rankData.of > 2) {
    highlightClass = "negative-trend";
    icon = "↓";
  }

  return (
    <div className={`form-stat-card ${highlightClass}`}>
      <span className="trend-kicker">{label}</span>
      <strong>
        <span style={{ color: isTopTier ? "var(--accent)" : "inherit" }}>
          {icon} Rank {rankData.rank}
        </span>
        <span style={{ fontSize: "0.7em", color: "var(--ink-soft)", fontWeight: "normal" }}>
          {" "}of {rankData.of}
        </span>
      </strong>
      <p style={{ marginTop: "4px" }}>{formatValue(rankData.value)}</p>
    </div>
  );
}
