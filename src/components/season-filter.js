import Link from "next/link";

import { orderedSeasons, seasonLabel } from "@/lib/season";
import { buildPath } from "@/lib/url";

export function SeasonFilter({ pathname, seasons, currentSeason, extraQuery = {} }) {
  const options = ["all", ...orderedSeasons(seasons)];

  return (
    <div className="season-filter">
      <div className="season-filter-header">
        <p className="kicker">Season lens</p>
        <strong>{seasonLabel(currentSeason)}</strong>
      </div>

      <div className="season-filter-tabs">
        {options.map((season) => {
          const href = buildPath(pathname, {
            ...extraQuery,
            season
          });

          return (
            <Link
              key={season}
              className={`season-tab${season === currentSeason ? " active" : ""}`}
              href={href}
            >
              {seasonLabel(season)}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
