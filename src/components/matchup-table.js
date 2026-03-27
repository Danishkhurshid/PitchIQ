import Link from "next/link";
import { formatMetric, formatOversFromBalls } from "@/lib/format";
import { buildPath } from "@/lib/url";

export function MatchupTable({ title, items, mode, type, season }) {
  const isBatting = mode === "batting";

  if (!items || items.length === 0) {
    return (
      <article className="surface surface-span-6">
        <div className="surface-header">
          <div>
            <p className="kicker">Matchups</p>
            <h2>{title}</h2>
          </div>
        </div>
        <div className="empty-state">
          <p className="kicker">No data</p>
          <strong>No matchup records found in this context.</strong>
        </div>
      </article>
    );
  }

  return (
    <article className="surface surface-span-6">
      <div className="surface-header">
        <div>
          <p className="kicker">Matchups</p>
          <h2>{title}</h2>
        </div>
      </div>
      
      <div className="matchup-grid">
        <div className="matchup-header">
          <div>
            {type === "bowler" ? "Bowler" : type === "batter" ? "Batter" : type === "team" ? "Opposition" : "Venue"}
          </div>
          {isBatting ? (
            <>
              <div>Runs</div>
              <div>Balls</div>
              <div>Outs</div>
              <div>SR</div>
            </>
          ) : (
            <>
              <div>Wkts</div>
              <div>Econ</div>
              <div>Overs</div>
              <div>Runs</div>
            </>
          )}
        </div>
        
        {items.map((item) => {
          const entity = item.player || item.team || item.venue;
          const linkBase = item.player ? "players" : item.team ? "teams" : "venues";
          const key = entity.id;

          return (
            <div key={key} className="matchup-row">
              <Link
                href={buildPath(`/${linkBase}/${key}`, { season })}
                className="table-primary"
              >
                <strong>{entity.name}</strong>
              </Link>
              
              {isBatting ? (
                <>
                  <div className="metric">{item.batting.runs}</div>
                  <div className="metric">{item.batting.ballsFaced}</div>
                  <div className="metric">{item.batting.dismissals}</div>
                  <div className="metric">{formatMetric(item.batting.strikeRate)}</div>
                </>
              ) : (
                <>
                  <div className="metric">{item.bowling.wickets}</div>
                  <div className="metric">{formatMetric(item.bowling.economy)}</div>
                  <div className="metric">{formatOversFromBalls(item.bowling.ballsBowled)}</div>
                  <div className="metric">{item.bowling.runsConceded}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
