import { formatMetric, formatOversFromBalls } from "@/lib/format";
import { seasonLabel } from "@/lib/season";

function formatSigned(value) {
  if (value === null || value === undefined) {
    return "NA";
  }

  const numeric = Number(value);
  const prefix = numeric > 0 ? "+" : "";
  return `${prefix}${formatMetric(numeric)}`;
}

function safeDelta(current, baseline) {
  if (current === null || current === undefined || baseline === null || baseline === undefined) {
    return null;
  }

  return Number((current - baseline).toFixed(2));
}

function wicketsPerInnings(summary) {
  if (!summary?.innings) {
    return null;
  }

  return Number((summary.wickets / summary.innings).toFixed(2));
}

function formatPhaseLens(season) {
  return season === "all" ? "career archive" : `${seasonLabel(season)} lens`;
}

function battingComparison(current, career, form, season) {
  const source =
    season === "all"
      ? {
          ...form.last10.summary,
          innings: form.last10.innings
        }
      : current;
  const label = season === "all" ? "Last 10 vs career" : `${seasonLabel(season)} vs career`;
  const strikeRateDelta = safeDelta(source.strikeRate, career.strikeRate);
  const averageDelta = safeDelta(source.average, career.average);

  return {
    label,
    headline:
      strikeRateDelta === null
        ? "Not enough sample"
        : `${formatSigned(strikeRateDelta)} SR vs career`,
    support:
      averageDelta === null
        ? `Career avg ${formatMetric(career.average)}`
        : `${formatSigned(averageDelta)} avg vs career`
  };
}

function bowlingComparison(current, career, form, season) {
  const source =
    season === "all"
      ? {
          ...form.last10.summary,
          innings: form.last10.innings
        }
      : current;
  const label = season === "all" ? "Last 10 vs career" : `${seasonLabel(season)} vs career`;
  const economyDelta =
    source.economy === null || source.economy === undefined || career.economy === null || career.economy === undefined
      ? null
      : Number((career.economy - source.economy).toFixed(2));
  const wicketsPerInningsDelta = safeDelta(wicketsPerInnings(source), wicketsPerInnings(career));

  return {
    label,
    headline:
      economyDelta === null
        ? "Not enough sample"
        : economyDelta >= 0
          ? `${formatMetric(economyDelta)} better econ than career`
          : `${formatMetric(Math.abs(economyDelta))} worse econ than career`,
    support:
      wicketsPerInningsDelta === null
        ? `Career econ ${formatMetric(career.economy)}`
        : `${formatSigned(wicketsPerInningsDelta)} wkts/innings`
  };
}

function battingSummaryLine(window) {
  const best = window.bestScore ? ` · Best ${window.bestScore.runs}` : "";
  const fifties = window.fifties ? ` · ${window.fifties} x 50+` : "";
  return `Avg ${formatMetric(window.summary.average)} · SR ${formatMetric(window.summary.strikeRate)}${best}${fifties}`;
}

function bowlingSummaryLine(window) {
  const best = window.bestSpell
    ? ` · Best ${window.bestSpell.wickets}/${window.bestSpell.runsConceded}`
    : "";
  return `Econ ${formatMetric(window.summary.economy)} · Dot ${formatMetric(window.summary.dotBallPct)}%${best}`;
}

export function PlayerFormPanel({ mode, season, current, career, form }) {
  const isBatting = mode === "batting";
  const last5 = form.last5;
  const last10 = form.last10;
  const hasSample = current.innings > 0 || last10.innings > 0;
  const comparison = isBatting
    ? battingComparison(current, career, form, season)
    : bowlingComparison(current, career, form, season);
  const trendItems = isBatting ? last10.scores.slice(0, 8) : last10.spells.slice(0, 8);
  const maxTrendValue = Math.max(
    ...trendItems.map((item) => (isBatting ? item.runs : item.wickets || 0)),
    1
  );

  return (
    <div>
      <div className="surface-header">
        <div>
          <p className="kicker">Form</p>
          <h2>{isBatting ? "Batting trend" : "Bowling trend"}</h2>
        </div>
      </div>

      {!hasSample ? (
        <div className="empty-state">
          <p className="kicker">No sample</p>
          <strong>
            No {isBatting ? "batting" : "bowling"} form sample in the {formatPhaseLens(season)}.
          </strong>
          <p>Once this player has enough innings in the selected lens, recent-form panels will appear here.</p>
        </div>
      ) : (
        <>
          <p className="form-copy">
            {isBatting
              ? `Use this panel to judge whether the bat has heated up in the ${formatPhaseLens(season)}.`
              : `Use this panel to judge whether this bowler is building pressure or fading in the ${formatPhaseLens(season)}.`}
          </p>

          <div className="form-card-grid">
            <article className="form-stat-card">
              <span>Last 5</span>
              <strong>
                {isBatting
                  ? `${last5.summary.runs} runs`
                  : `${last5.summary.wickets} wickets`}
              </strong>
              <p>{isBatting ? battingSummaryLine(last5) : bowlingSummaryLine(last5)}</p>
            </article>

            <article className="form-stat-card">
              <span>Last 10</span>
              <strong>
                {isBatting
                  ? `${last10.summary.runs} runs`
                  : `${last10.summary.wickets} wickets`}
              </strong>
              <p>{isBatting ? battingSummaryLine(last10) : bowlingSummaryLine(last10)}</p>
            </article>

            <article className="form-stat-card">
              <span>{comparison.label}</span>
              <strong>{comparison.headline}</strong>
              <p>{comparison.support}</p>
            </article>
          </div>

          {trendItems.length ? (
            <div className="trend-strip">
              {trendItems.map((item) => {
                const primaryValue = isBatting ? item.runs : item.wickets || 0;
                const fill = Math.max(8, Math.min(100, (primaryValue / maxTrendValue) * 100));

                return (
                  <article
                    key={`${item.matchId}-${item.matchDate || "na"}`}
                    className="trend-pill"
                  >
                    <span className="trend-kicker">
                      {item.opposition?.name || "Unknown opposition"}
                    </span>
                    <strong>
                      {isBatting
                        ? `${item.runs} (${item.ballsFaced})`
                        : `${item.wickets}/${item.runsConceded}`}
                    </strong>
                    <span className="trend-meta">
                      {isBatting
                        ? `SR ${formatMetric(item.strikeRate)}`
                        : `Econ ${formatMetric(item.economy)} · ${formatOversFromBalls(item.ballsBowled)} ov`}
                    </span>
                    <div className="trend-bar">
                      <span style={{ width: `${fill}%` }} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
