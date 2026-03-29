"use client";

import { formatMetric } from "@/lib/format";
import Link from "next/link";

export function LiveMatchHero({ data }) {
  if (!data) return null;

  const { match, currentInnings, innings, isComplete, resultLabel } = data;
  const isSecondInnings = innings.length > 1;
  const firstInnings = isSecondInnings ? innings[0] : currentInnings;

  // Guard: currentInnings must exist
  if (!currentInnings) return null;

  const ballsRemaining = Math.max(
    0,
    120 - Math.round((currentInnings.overs || 0) * 6)
  );
  const runsNeeded = isSecondInnings
    ? (firstInnings.runs ?? 0) - (currentInnings.runs ?? 0) + 1
    : 0;

  return (
    <article className={`live-hero${isComplete ? " is-complete" : ""}`}>
      {/* Status badge */}
      <div className={`live-badge${isComplete ? " complete" : ""}`}>
        {!isComplete && <span className="live-dot" />}
        {isComplete ? "MATCH RESULT" : "LIVE MATCH"}
      </div>

      <div className="live-content">
        {/* Main score */}
        <div className="live-main-score">
          <div className="score-group">
            <p className="live-team-name">{currentInnings.battingTeam?.name}</p>
            <div className="score-row">
              <strong className="main-total">
                {currentInnings.runs}/{currentInnings.wickets}
              </strong>
              <span className="overs-count">({currentInnings.overs} ov)</span>
            </div>
          </div>

          <div className="target-context">
            {isComplete ? (
              <p className="result-highlight">{resultLabel}</p>
            ) : isSecondInnings ? (
              <>
                <p className="live-target-kicker">
                  Target: {(firstInnings.runs ?? 0) + 1}
                </p>
                <p className="need-copy">
                  Need {runsNeeded} from {ballsRemaining} balls
                </p>
              </>
            ) : (
              <p className="live-target-kicker">First Innings in Progress</p>
            )}
          </div>

          {/* External ball-by-ball links */}
          <div className="live-bbb-strip">
            <span className="live-bbb-label">Ball by ball coverage:</span>
            <a
              href={`https://www.cricbuzz.com/cricket-match/live-scores`}
              target="_blank"
              rel="noopener noreferrer"
              className="live-bbb-link cricbuzz"
            >
              Cricbuzz ↗
            </a>
            <a
              href={`https://www.espncricinfo.com/live-cricket-score`}
              target="_blank"
              rel="noopener noreferrer"
              className="live-bbb-link cricinfo"
            >
              ESPNcricinfo ↗
            </a>
          </div>
        </div>

        {/* Side panel */}
        <div className="live-side">
          {currentInnings.lastBalls && currentInnings.lastBalls.length > 0 ? (
            <>
              <div className="over-strip-label">Recent Deliveries</div>
              <div className="over-strip">
                {currentInnings.lastBalls.map((ball, i) => (
                  <div
                    key={i}
                    className={`ball-dot${ball.isWicket ? " wicket" : ball.isBoundary ? " boundary" : ""}`}
                  >
                    {ball.isWicket ? "W" : ball.runs}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="over-strip-label" style={{ opacity: 0.6 }}>
              Ball-by-ball updates not available on free tier
            </div>
          )}

          {/* Teams */}
          <div className="live-teams-strip">
            <span>{match.teams?.home?.name}</span>
            <span className="vs-sep">vs</span>
            <span>{match.teams?.away?.name}</span>
          </div>

          <div className="match-status-pill">
            {isComplete ? resultLabel : "Match in Progress"}
          </div>
        </div>
      </div>
    </article>
  );
}
