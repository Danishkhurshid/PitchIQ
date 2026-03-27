import Link from "next/link";

import { SeasonFilter } from "@/components/season-filter";
import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatMetric, formatNumber } from "@/lib/format";
import { normalizeSeasonParam, seasonLabel } from "@/lib/season";
import { buildPath } from "@/lib/url";

export const metadata = {
  title: "Players | PitchIQ"
};

function normalizeSearchValue(value) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : "";
  }

  return typeof value === "string" ? value.trim() : "";
}

export default async function PlayersPage({ searchParams }) {
  const repository = await getCricketRepository();
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );
  const searchQuery = normalizeSearchValue(resolvedSearchParams?.search);

  const [players, deathBatters, powerplayBowlers, playerPoolCount] = await Promise.all([
    repository.listPlayers({
      season: selectedSeason,
      sort: "runs",
      limit: "all",
      search: searchQuery
    }),
    repository.getTopBatters({
      season: selectedSeason,
      phase: "death",
      minBalls: 30,
      limit: 3
    }),
    repository.getTopBowlers({
      season: selectedSeason,
      phase: "powerplay",
      minBalls: 24,
      limit: 3
    }),
    searchQuery
      ? repository
          .listPlayers({
            season: selectedSeason,
            sort: "runs",
            limit: "all"
          })
          .then((rows) => rows.length)
      : Promise.resolve(null)
  ]);

  return (
    <main className="page-shell">
      <SeasonFilter
        pathname="/players"
        seasons={manifest.seasons}
        currentSeason={selectedSeason}
        extraQuery={searchQuery ? { search: searchQuery } : {}}
      />

      <section className="page-headline">
        <p className="kicker">Players</p>
        <h1>Find the profiles behind the scorecards.</h1>
        <p className="page-copy">
          This view is where users should discover player form, style, and phase
          strengths before clicking into a detailed profile. Current lens:{" "}
          {seasonLabel(selectedSeason)}.
        </p>
      </section>

      <section className="surface player-directory">
        <div className="surface-header">
          <div>
            <p className="kicker">Directory</p>
            <h2>Search the full PSL player pool</h2>
          </div>
          {searchQuery ? (
            <Link className="text-link" href={buildPath("/players", { season: selectedSeason })}>
              Clear search
            </Link>
          ) : (
            <span className="directory-count">{formatNumber(players.length)} players listed</span>
          )}
        </div>

        <form className="directory-search" action="/players">
          {selectedSeason !== "all" ? (
            <input type="hidden" name="season" value={selectedSeason} />
          ) : null}

          <label className="search-field" htmlFor="player-search">
            <span>Player search</span>
            <input
              id="player-search"
              className="search-input"
              type="search"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search by player name"
            />
          </label>

          <button className="search-button" type="submit">
            Search
          </button>
        </form>

        <p className="directory-summary">
          {searchQuery
            ? `Showing ${formatNumber(players.length)} players matching "${searchQuery}" from ${formatNumber(playerPoolCount)} players in ${seasonLabel(selectedSeason)}.`
            : `Showing all ${formatNumber(players.length)} players in ${seasonLabel(selectedSeason)}.`}
        </p>

        {players.length ? (
          <div className="table-list">
            {players.map((entry, index) => (
              <Link
                key={entry.player.id}
                className="table-row"
                href={buildPath(`/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <div className="table-rank">{index + 1}</div>
                <div className="table-primary">
                  <strong>{entry.player.name}</strong>
                  <span>
                    {entry.teams.map((team) => team.name).join(" / ")} ·{" "}
                    {formatNumber(entry.matches)} matches
                  </span>
                </div>
                <div className="table-secondary">
                  <span>
                    {formatNumber(entry.batting.runs)} runs · SR{" "}
                    {formatMetric(entry.batting.strikeRate)}
                  </span>
                  <span>
                    {formatNumber(entry.bowling.wickets)} wickets · Econ{" "}
                    {formatMetric(entry.bowling.economy)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p className="kicker">No match</p>
            <strong>No players matched "{searchQuery}".</strong>
            <p>Try a broader spelling or clear the search while keeping the same season lens.</p>
          </div>
        )}
      </section>

      <section className="content-grid">
        <article className="surface surface-span-6 accent-surface">
          <div className="surface-header">
            <div>
              <p className="kicker">Specialists</p>
              <h2>Death-over hitters</h2>
            </div>
          </div>

          <div className="leader-list">
            {deathBatters.map((entry, index) => (
              <Link
                key={entry.player.id}
                className="leader-row"
                href={buildPath(`/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <span className="leader-rank">0{index + 1}</span>
                <div className="leader-copy">
                  <strong>{entry.player.name}</strong>
                  <span>
                    {entry.batting.runs} runs · SR {formatMetric(entry.batting.strikeRate)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="surface surface-span-6">
          <div className="surface-header">
            <div>
              <p className="kicker">Specialists</p>
              <h2>Powerplay bowlers</h2>
            </div>
          </div>

          <div className="leader-list">
            {powerplayBowlers.map((entry, index) => (
              <Link
                key={entry.player.id}
                className="leader-row"
                href={buildPath(`/players/${entry.player.id}`, { season: selectedSeason })}
              >
                <span className="leader-rank">0{index + 1}</span>
                <div className="leader-copy">
                  <strong>{entry.player.name}</strong>
                  <span>
                    {entry.bowling.wickets} wickets · Econ {formatMetric(entry.bowling.economy)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
