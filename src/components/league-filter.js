"use client";

import { useRouter } from "next/navigation";
import { buildPath } from "@/lib/url";

const LEAGUES = [
  { id: "psl", name: "Pakistan Super League (PSL)" },
];

export function LeagueFilter({ currentLeague, currentSeason }) {
  const router = useRouter();

  const handleLeagueChange = (e) => {
    const newLeague = e.target.value;
    if (newLeague === currentLeague) return;

    // Navigate to the league hub; season resets to the league's own default
    const href = currentSeason
      ? buildPath(`/${newLeague}`, { season: "all" })
      : `/${newLeague}`;
    router.push(href);
  };

  return (
    <div className="league-filter" style={{ marginBottom: "20px" }}>
      <div className="league-filter-header">
        <p className="kicker">Context</p>
        <div className="league-select-wrapper">
          <select
            value={currentLeague}
            onChange={handleLeagueChange}
            className="league-select"
          >
            {LEAGUES.map((league) => (
              <option key={league.id} value={league.id}>
                {league.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
