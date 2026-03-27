import { notFound } from "next/navigation";

import { PhaseTable } from "@/components/phase-table";
import { PlayerFormPanel } from "@/components/player-form-panel";
import { RecentMatchList } from "@/components/recent-match-list";
import { SeasonFilter } from "@/components/season-filter";
import { getCricketRepository } from "@/lib/server/cricket-repository";
import { formatMetric, formatNumber } from "@/lib/format";
import { normalizeSeasonParam, seasonLabel } from "@/lib/season";

function getTopBattingPhase(phases) {
  return [...phases].sort(
    (a, b) => (b.batting.strikeRate || 0) - (a.batting.strikeRate || 0)
  )[0];
}

function getTopBowlingPhase(phases) {
  return [...phases].sort((a, b) => (b.bowling.wickets || 0) - (a.bowling.wickets || 0))[0];
}

function getPlayerAngle(player) {
  const qualifiedBattingPhases = player.phaseProfile.batting.filter(
    (phase) => phase.batting.ballsFaced >= 20
  );
  const qualifiedBowlingPhases = player.phaseProfile.bowling.filter(
    (phase) => phase.bowling.ballsBowled >= 24
  );

  const bestBattingPhase = getTopBattingPhase(
    qualifiedBattingPhases.length ? qualifiedBattingPhases : player.phaseProfile.batting
  );
  const bestBowlingPhase = getTopBowlingPhase(
    qualifiedBowlingPhases.length ? qualifiedBowlingPhases : player.phaseProfile.bowling
  );

  const isBowlingLed =
    player.bowling.wickets >= 8 &&
    (player.batting.runs < 120 || player.bowling.wickets > player.batting.runs / 18);

  const primaryStrength = isBowlingLed
    ? bestBowlingPhase
      ? `${bestBowlingPhase.phase} bowling with ${bestBowlingPhase.bowling.wickets} wickets`
      : "Bowling sample still thin"
    : bestBattingPhase
      ? `${bestBattingPhase.phase} scoring at SR ${formatMetric(bestBattingPhase.batting.strikeRate)}`
      : "Batting sample still thin";

  const secondaryStrength = isBowlingLed
    ? bestBattingPhase
      ? `${bestBattingPhase.phase} batting at SR ${formatMetric(bestBattingPhase.batting.strikeRate)}`
      : "Limited batting sample"
    : bestBowlingPhase
      ? `${bestBowlingPhase.phase} bowling with ${bestBowlingPhase.bowling.wickets} wickets`
      : "Primarily a batting profile";

  return {
    primaryStrength,
    secondaryStrength
  };
}

function formatPhaseName(phase) {
  if (phase === "powerplay") {
    return "Powerplay";
  }

  if (phase === "middle") {
    return "Middle overs";
  }

  if (phase === "death") {
    return "Death overs";
  }

  return "Unknown phase";
}

export async function generateMetadata({ params, searchParams }) {
  const { playerId } = await params;
  const repository = await getCricketRepository();
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );
  const player = await repository.getPlayer(playerId, {
    season: selectedSeason
  });

  return {
    title: player ? `${player.player.name} | PitchIQ` : "Player | PitchIQ"
  };
}

export default async function PlayerDetailPage({ params, searchParams }) {
  const { playerId } = await params;
  const repository = await getCricketRepository();
  const resolvedSearchParams = await searchParams;
  const manifest = await repository.getManifest();
  const selectedSeason = normalizeSeasonParam(
    resolvedSearchParams?.season,
    manifest.seasons
  );
  const player = await repository.getPlayer(playerId, {
    season: selectedSeason,
    matchLimit: 8
  });

  if (!player) {
    notFound();
  }

  const primaryDismissal = player.dismissalProfile[0];
  const topBowlerThreat = player.dismissalByBowler[0];
  const topDismissalPhase = [...player.dismissalByPhase].sort((a, b) => b.count - a.count)[0];
  const angle = getPlayerAngle(player);

  return (
    <main className="page-shell">
      <SeasonFilter
        pathname={`/players/${playerId}`}
        seasons={manifest.seasons}
        currentSeason={selectedSeason}
      />

      <section className="detail-hero">
        <div className="detail-copy">
          <p className="kicker">Player profile</p>
          <h1>{player.player.name}</h1>
          <p className="page-copy">
            {player.teams.map((team) => team.name).join(", ")} · {seasonLabel(player.season)} lens
          </p>
        </div>

        <div className="insight-stack">
          <article className="insight-card">
            <p className="insight-label">Primary strength</p>
            <strong>{angle.primaryStrength}</strong>
          </article>
          <article className="insight-card">
            <p className="insight-label">Ball impact</p>
            <strong>{angle.secondaryStrength}</strong>
          </article>
          <article className="insight-card">
            <p className="insight-label">Watch-out</p>
            <strong>
              {topBowlerThreat
                ? `${topBowlerThreat.player.name} has removed him ${topBowlerThreat.count} times`
                : primaryDismissal
                  ? `${primaryDismissal.dismissalKind} has removed him ${primaryDismissal.count} times`
                  : "No dismissal pattern captured yet"}
            </strong>
          </article>
          <article className="insight-card">
            <p className="insight-label">Dismissal hotspot</p>
            <strong>
              {topDismissalPhase
                ? `${formatPhaseName(topDismissalPhase.phase)} account for ${formatMetric(topDismissalPhase.share)}% of his dismissals`
                : "No dismissal pattern captured yet"}
            </strong>
          </article>
        </div>
      </section>

      <section className="metric-ribbon">
        <article className="metric-panel">
          <span>Runs</span>
          <strong>{player.batting.runs}</strong>
        </article>
        <article className="metric-panel">
          <span>Batting SR</span>
          <strong>{formatMetric(player.batting.strikeRate)}</strong>
        </article>
        <article className="metric-panel">
          <span>Wickets</span>
          <strong>{player.bowling.wickets}</strong>
        </article>
        <article className="metric-panel">
          <span>Economy</span>
          <strong>{formatMetric(player.bowling.economy)}</strong>
        </article>
      </section>

      <section className="content-grid">
        <div className="surface surface-span-6">
          <PlayerFormPanel
            mode="batting"
            season={player.season}
            current={{
              ...player.batting,
              matches: player.sample.batting.matches,
              innings: player.sample.batting.innings
            }}
            career={player.career.batting}
            form={player.form.batting}
          />
        </div>
        <div className="surface surface-span-6">
          <PlayerFormPanel
            mode="bowling"
            season={player.season}
            current={{
              ...player.bowling,
              matches: player.sample.bowling.matches,
              innings: player.sample.bowling.innings
            }}
            career={player.career.bowling}
            form={player.form.bowling}
          />
        </div>
      </section>

      <section className="content-grid">
        <div className="surface surface-span-6">
          <PhaseTable
            title="Where this batter is most dangerous"
            items={player.phaseProfile.batting}
            mode="batting"
          />
        </div>
        <div className="surface surface-span-6">
          <PhaseTable
            title="Where this bowler changes innings"
            items={player.phaseProfile.bowling}
            mode="bowling"
          />
        </div>
      </section>

      <section className="content-grid">
        <article className="surface surface-span-4">
          <div className="surface-header">
            <div>
              <p className="kicker">Weakness map</p>
              <h2>Dismissal profile</h2>
            </div>
          </div>

          <div className="feed-list compact">
            {player.dismissalProfile.map((entry) => (
              <div key={entry.dismissalKind} className="feed-row">
                <div>
                  <p className="feed-title">{entry.dismissalKind}</p>
                  <p className="feed-meta">
                    {entry.topBowler?.player?.name
                      ? `Most often by ${entry.topBowler.player.name}`
                      : "No bowler pattern yet"}
                    {entry.topPhase
                      ? ` · Peaks in ${formatPhaseName(entry.topPhase.phase)}`
                      : ""}
                  </p>
                </div>
                <div className="feed-metric">
                  <span>{entry.count} dismissals</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface surface-span-4">
          <div className="surface-header">
            <div>
              <p className="kicker">Bowler trouble</p>
              <h2>Who gets him out</h2>
            </div>
          </div>

          <div className="feed-list compact">
            {player.dismissalByBowler.length ? (
              player.dismissalByBowler.map((entry) => (
                <div key={entry.player.id} className="feed-row">
                  <div>
                    <p className="feed-title">{entry.player.name}</p>
                    <p className="feed-meta">
                      {entry.primaryDismissalKind
                        ? `${entry.primaryDismissalKind.dismissalKind} most common`
                        : "Dismissal mode unavailable"}
                      {entry.primaryPhase
                        ? ` · ${formatPhaseName(entry.primaryPhase.phase)} threat`
                        : ""}
                    </p>
                  </div>
                  <div className="feed-metric">
                    <span>{formatNumber(entry.count)} dismissals</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p className="kicker">No pattern</p>
                <strong>No credited bowler removals captured yet.</strong>
                <p>Run-outs and other non-bowler dismissals can still appear in the profile above.</p>
              </div>
            )}
          </div>
        </article>

        <article className="surface surface-span-4">
          <div className="surface-header">
            <div>
              <p className="kicker">Phase pressure</p>
              <h2>Where wickets fall</h2>
            </div>
          </div>

          <div className="feed-list compact">
            {player.dismissalByPhase.length ? (
              player.dismissalByPhase.map((entry) => (
                <div key={entry.phase} className="feed-row">
                  <div>
                    <p className="feed-title">{formatPhaseName(entry.phase)}</p>
                    <p className="feed-meta">
                      {entry.primaryDismissalKind
                        ? `${entry.primaryDismissalKind.dismissalKind} is the most common exit`
                        : "Dismissal mode unavailable"}
                    </p>
                  </div>
                  <div className="feed-metric">
                    <span>{formatNumber(entry.count)} outs</span>
                    <span>{formatMetric(entry.share)}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p className="kicker">No pattern</p>
                <strong>No dismissal-phase sample captured yet.</strong>
                <p>Once wickets are recorded for this player, phase clustering will show here.</p>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <div className="surface surface-span-12">
          <RecentMatchList
            title="Recent match log"
            items={player.recentMatches}
            showStatline
            season={selectedSeason}
          />
        </div>
      </section>
    </main>
  );
}
