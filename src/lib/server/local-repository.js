import { loadJsonl, loadManifest } from "@/lib/server/jsonl-store";



function createBattingAccumulator() {
  return {
    runs: 0,
    ballsFaced: 0,
    dismissals: 0,
    fours: 0,
    sixes: 0,
    dotBalls: 0
  };
}

function createBowlingAccumulator() {
  return {
    ballsBowled: 0,
    runsConceded: 0,
    wickets: 0,
    dotBalls: 0
  };
}

function addBattingTotals(target, source) {
  target.runs += source.runs || 0;
  target.ballsFaced += source.balls_faced || 0;
  target.dismissals += source.dismissals || 0;
  target.fours += source.fours || 0;
  target.sixes += source.sixes || 0;
  target.dotBalls += source.dot_balls || 0;
}

function addBowlingTotals(target, source) {
  target.ballsBowled += source.balls_bowled || 0;
  target.runsConceded += source.runs_conceded || 0;
  target.wickets += source.wickets || 0;
  target.dotBalls += source.dot_balls || 0;
}

function rate(numerator, denominator, multiplier = 1) {
  if (!denominator) {
    return null;
  }

  return Number(((numerator * multiplier) / denominator).toFixed(2));
}

function finalizeBattingTotals(totals) {
  const boundaryBalls = totals.fours + totals.sixes;

  return {
    runs: totals.runs,
    ballsFaced: totals.ballsFaced,
    dismissals: totals.dismissals,
    fours: totals.fours,
    sixes: totals.sixes,
    dotBalls: totals.dotBalls,
    strikeRate: rate(totals.runs, totals.ballsFaced, 100),
    average: rate(totals.runs, totals.dismissals),
    dotBallPct: rate(totals.dotBalls, totals.ballsFaced, 100),
    boundaryBallPct: rate(boundaryBalls, totals.ballsFaced, 100)
  };
}

function finalizeBowlingTotals(totals) {
  return {
    ballsBowled: totals.ballsBowled,
    runsConceded: totals.runsConceded,
    wickets: totals.wickets,
    dotBalls: totals.dotBalls,
    economy: rate(totals.runsConceded, totals.ballsBowled, 6),
    average: rate(totals.runsConceded, totals.wickets),
    strikeRate: rate(totals.ballsBowled, totals.wickets),
    dotBallPct: rate(totals.dotBalls, totals.ballsBowled, 100)
  };
}

function matchSort(a, b) {
  if (a.match_date === b.match_date) {
    return Number(b.match_id) - Number(a.match_id);
  }

  return a.match_date < b.match_date ? 1 : -1;
}

function phaseSort(a, b) {
  const order = {
    powerplay: 0,
    middle: 1,
    death: 2
  };

  return (order[a.phase] ?? 99) - (order[b.phase] ?? 99);
}

function unique(values) {
  return [...new Set(values)];
}

function toTeamLabel(team) {
  return team
    ? {
        id: team.team_id,
        name: team.team_name,
        slug: team.slug
      }
    : null;
}

function toPlayerLabel(player) {
  return player
    ? {
        id: player.player_id,
        name: player.canonical_name,
        slug: player.slug
      }
    : null;
}

function toVenueLabel(venue) {
  return venue
    ? {
        id: venue.venue_id,
        name: venue.venue_name,
        slug: venue.slug,
        city: venue.city
      }
    : null;
}

function resolveSeason(season, latestSeason) {
  if (!season || season === "all") {
    return null;
  }

  if (season === "latest") {
    return latestSeason;
  }

  return season;
}

function matchInSeason(match, season) {
  if (!season) {
    return true;
  }

  return match?.season === season;
}

function applyMatchFilters(matches, { season, teamId, venueId }) {
  return matches.filter((match) => {
    if (season && match.season !== season) {
      return false;
    }

    if (teamId && match.team_1_id !== teamId && match.team_2_id !== teamId) {
      return false;
    }

    if (venueId && match.venue_id !== venueId) {
      return false;
    }

    return true;
  });
}

function aggregatePlayerBattingRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row.player_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        playerId: row.player_id,
        teamIds: new Set(),
        oppositionTeamIds: new Set(),
        matches: new Set(),
        innings: 0,
        totals: createBattingAccumulator()
      });
    }

    const current = grouped.get(key);
    current.teamIds.add(row.team_id);
    if (row.opposition_team_id) {
      current.oppositionTeamIds.add(row.opposition_team_id);
    }
    current.matches.add(row.match_id);
    current.innings += row.innings || 0;
    addBattingTotals(current.totals, row);
  }

  return [...grouped.values()].map((entry) => ({
    playerId: entry.playerId,
    teamIds: [...entry.teamIds],
    oppositionTeamIds: [...entry.oppositionTeamIds],
    matches: entry.matches.size,
    innings: entry.innings,
    batting: finalizeBattingTotals(entry.totals)
  }));
}

function aggregatePlayerBowlingRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row.player_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        playerId: row.player_id,
        teamIds: new Set(),
        oppositionTeamIds: new Set(),
        matches: new Set(),
        innings: 0,
        totals: createBowlingAccumulator()
      });
    }

    const current = grouped.get(key);
    current.teamIds.add(row.team_id);
    if (row.opposition_team_id) {
      current.oppositionTeamIds.add(row.opposition_team_id);
    }
    current.matches.add(row.match_id);
    current.innings += row.innings || 0;
    addBowlingTotals(current.totals, row);
  }

  return [...grouped.values()].map((entry) => ({
    playerId: entry.playerId,
    teamIds: [...entry.teamIds],
    oppositionTeamIds: [...entry.oppositionTeamIds],
    matches: entry.matches.size,
    innings: entry.innings,
    bowling: finalizeBowlingTotals(entry.totals)
  }));
}

function aggregateLeaderboardBattingRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row.player_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        playerId: row.player_id,
        teamIds: new Set(),
        matches: 0,
        innings: 0,
        totals: createBattingAccumulator()
      });
    }

    const current = grouped.get(key);
    current.teamIds.add(row.team_id);
    current.matches += row.matches || 0;
    current.innings += row.innings || 0;
    addBattingTotals(current.totals, row);
  }

  return [...grouped.values()].map((entry) => ({
    playerId: entry.playerId,
    teamIds: [...entry.teamIds],
    matches: entry.matches,
    innings: entry.innings,
    batting: finalizeBattingTotals(entry.totals)
  }));
}

function aggregateLeaderboardBowlingRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row.player_id;
    if (!grouped.has(key)) {
      grouped.set(key, {
        playerId: row.player_id,
        teamIds: new Set(),
        matches: 0,
        innings: 0,
        totals: createBowlingAccumulator()
      });
    }

    const current = grouped.get(key);
    current.teamIds.add(row.team_id);
    current.matches += row.matches || 0;
    current.innings += row.innings || 0;
    addBowlingTotals(current.totals, row);
  }

  return [...grouped.values()].map((entry) => ({
    playerId: entry.playerId,
    teamIds: [...entry.teamIds],
    matches: entry.matches,
    innings: entry.innings,
    bowling: finalizeBowlingTotals(entry.totals)
  }));
}

function aggregatePhaseBattingRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row.phase;
    if (!grouped.has(key)) {
      grouped.set(key, {
        phase: row.phase,
        matches: 0,
        innings: 0,
        totals: createBattingAccumulator()
      });
    }

    const current = grouped.get(key);
    current.matches += row.matches || 0;
    current.innings += row.innings || 0;
    addBattingTotals(current.totals, row);
  }

  return [...grouped.values()]
    .map((entry) => ({
      phase: entry.phase,
      matches: entry.matches,
      innings: entry.innings,
      batting: finalizeBattingTotals(entry.totals)
    }))
    .sort(phaseSort);
}

function aggregatePhaseBowlingRows(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row.phase;
    if (!grouped.has(key)) {
      grouped.set(key, {
        phase: row.phase,
        matches: 0,
        innings: 0,
        totals: createBowlingAccumulator()
      });
    }

    const current = grouped.get(key);
    current.matches += row.matches || 0;
    current.innings += row.innings || 0;
    addBowlingTotals(current.totals, row);
  }

  return [...grouped.values()]
    .map((entry) => ({
      phase: entry.phase,
      matches: entry.matches,
      innings: entry.innings,
      bowling: finalizeBowlingTotals(entry.totals)
    }))
    .sort(phaseSort);
}

function aggregateDismissals(rows, context) {
  const grouped = new Map();

  for (const row of rows) {
    const key = row.dismissal_kind;
    const phase = context.deliveryPhaseByKey.get(
      deliveryKey(row.match_id, row.innings_number, row.innings_ball_index)
    );

    if (!grouped.has(key)) {
      grouped.set(key, {
        dismissalKind: row.dismissal_kind,
        count: 0,
        bowlers: new Map(),
        phases: new Map()
      });
    }

    const current = grouped.get(key);
    current.count += 1;

    if (row.bowler_player_id) {
      const bowlerId = row.bowler_player_id;
      current.bowlers.set(bowlerId, (current.bowlers.get(bowlerId) || 0) + 1);
    }

    if (phase) {
      current.phases.set(phase, (current.phases.get(phase) || 0) + 1);
    }
  }

  return [...grouped.values()]
    .map((entry) => {
      const topBowlerEntry = [...entry.bowlers.entries()].sort((a, b) => b[1] - a[1])[0];
      const topPhaseEntry = [...entry.phases.entries()].sort((a, b) => b[1] - a[1])[0];

      return {
        dismissalKind: entry.dismissalKind,
        count: entry.count,
        topPhase: topPhaseEntry
          ? {
              phase: topPhaseEntry[0],
              dismissals: topPhaseEntry[1]
            }
          : null,
        topBowler: topBowlerEntry
          ? {
              player: toPlayerLabel(context.playerById.get(topBowlerEntry[0])),
              dismissals: topBowlerEntry[1]
            }
          : null
      };
    })
    .sort((a, b) => b.count - a.count);
}

function aggregateDismissalsByBowler(rows, context) {
  const grouped = new Map();

  for (const row of rows) {
    if (!row.bowler_player_id) {
      continue;
    }

    const phase = context.deliveryPhaseByKey.get(
      deliveryKey(row.match_id, row.innings_number, row.innings_ball_index)
    );

    if (!grouped.has(row.bowler_player_id)) {
      grouped.set(row.bowler_player_id, {
        bowlerId: row.bowler_player_id,
        count: 0,
        dismissalKinds: new Map(),
        phases: new Map()
      });
    }

    const current = grouped.get(row.bowler_player_id);
    current.count += 1;
    current.dismissalKinds.set(
      row.dismissal_kind,
      (current.dismissalKinds.get(row.dismissal_kind) || 0) + 1
    );

    if (phase) {
      current.phases.set(phase, (current.phases.get(phase) || 0) + 1);
    }
  }

  return [...grouped.values()]
    .map((entry) => {
      const topDismissalEntry = [...entry.dismissalKinds.entries()].sort((a, b) => b[1] - a[1])[0];
      const topPhaseEntry = [...entry.phases.entries()].sort((a, b) => b[1] - a[1])[0];

      return {
        player: toPlayerLabel(context.playerById.get(entry.bowlerId)),
        count: entry.count,
        primaryDismissalKind: topDismissalEntry
          ? {
              dismissalKind: topDismissalEntry[0],
              dismissals: topDismissalEntry[1]
            }
          : null,
        primaryPhase: topPhaseEntry
          ? {
              phase: topPhaseEntry[0],
              dismissals: topPhaseEntry[1]
            }
          : null
      };
    })
    .filter((entry) => entry.player)
    .sort((a, b) => b.count - a.count);
}

function aggregateDismissalsByPhase(rows, context) {
  const grouped = new Map();
  const totalDismissals = rows.length;

  for (const row of rows) {
    const phase =
      context.deliveryPhaseByKey.get(
        deliveryKey(row.match_id, row.innings_number, row.innings_ball_index)
      ) || "unknown";

    if (!grouped.has(phase)) {
      grouped.set(phase, {
        phase,
        count: 0,
        dismissalKinds: new Map()
      });
    }

    const current = grouped.get(phase);
    current.count += 1;
    current.dismissalKinds.set(
      row.dismissal_kind,
      (current.dismissalKinds.get(row.dismissal_kind) || 0) + 1
    );
  }

  return [...grouped.values()]
    .map((entry) => {
      const topDismissalEntry = [...entry.dismissalKinds.entries()].sort((a, b) => b[1] - a[1])[0];

      return {
        phase: entry.phase,
        count: entry.count,
        share: rate(entry.count, totalDismissals, 100),
        primaryDismissalKind: topDismissalEntry
          ? {
              dismissalKind: topDismissalEntry[0],
              dismissals: topDismissalEntry[1]
            }
          : null
      };
    })
    .sort(phaseSort);
}

function emptyBattingSummaryRow() {
  return {
    matches: 0,
    innings: 0,
    batting: finalizeBattingTotals(createBattingAccumulator())
  };
}

function emptyBowlingSummaryRow() {
  return {
    matches: 0,
    innings: 0,
    bowling: finalizeBowlingTotals(createBowlingAccumulator())
  };
}

function sortRowsByMatchDate(rows, context) {
  return [...rows].sort((a, b) => {
    const matchA = context.matchById.get(a.match_id);
    const matchB = context.matchById.get(b.match_id);

    if (!matchA && !matchB) {
      return Number(b.match_id) - Number(a.match_id);
    }

    if (!matchA) {
      return 1;
    }

    if (!matchB) {
      return -1;
    }

    return matchSort(matchA, matchB);
  });
}

function buildBattingFormWindow(rows, context, limit) {
  const recentRows = sortRowsByMatchDate(rows, context).slice(0, limit);
  const totals = createBattingAccumulator();

  for (const row of recentRows) {
    addBattingTotals(totals, row);
  }

  const bestEntry = recentRows.reduce((best, row) => {
    if (!best || row.runs > best.runs) {
      return row;
    }

    if (row.runs === best.runs && row.balls_faced < best.balls_faced) {
      return row;
    }

    return best;
  }, null);

  return {
    innings: recentRows.length,
    summary: finalizeBattingTotals(totals),
    fifties: recentRows.filter((row) => row.runs >= 50).length,
    bestScore: bestEntry
      ? {
          runs: bestEntry.runs,
          ballsFaced: bestEntry.balls_faced,
          matchId: bestEntry.match_id
        }
      : null,
    scores: recentRows.map((row) => ({
      matchId: row.match_id,
      matchDate: context.matchById.get(row.match_id)?.match_date || null,
      opposition: toTeamLabel(context.teamById.get(row.opposition_team_id)),
      runs: row.runs,
      ballsFaced: row.balls_faced,
      strikeRate: row.strike_rate,
      dismissed: row.dismissals > 0
    }))
  };
}

function buildBowlingFormWindow(rows, context, limit) {
  const recentRows = sortRowsByMatchDate(rows, context).slice(0, limit);
  const totals = createBowlingAccumulator();

  for (const row of recentRows) {
    addBowlingTotals(totals, row);
  }

  const bestEntry = recentRows.reduce((best, row) => {
    if (!best || row.wickets > best.wickets) {
      return row;
    }

    if (row.wickets === best.wickets && row.runs_conceded < best.runs_conceded) {
      return row;
    }

    return best;
  }, null);

  return {
    innings: recentRows.length,
    summary: finalizeBowlingTotals(totals),
    bestSpell: bestEntry
      ? {
          wickets: bestEntry.wickets,
          runsConceded: bestEntry.runs_conceded,
          ballsBowled: bestEntry.balls_bowled,
          matchId: bestEntry.match_id
        }
      : null,
    spells: recentRows.map((row) => ({
      matchId: row.match_id,
      matchDate: context.matchById.get(row.match_id)?.match_date || null,
      opposition: toTeamLabel(context.teamById.get(row.opposition_team_id)),
      wickets: row.wickets,
      runsConceded: row.runs_conceded,
      ballsBowled: row.balls_bowled,
      economy: row.economy
    }))
  };
}

function addBattingDeliveryTotals(target, delivery) {
  target.runs += delivery.batter_runs || 0;

  if (delivery.wides === 0) {
    target.ballsFaced += 1;
  }

  if (delivery.batter_runs === 4) {
    target.fours += 1;
  }

  if (delivery.batter_runs === 6) {
    target.sixes += 1;
  }

  if (delivery.is_dot_ball) {
    target.dotBalls += 1;
  }
}

function addBowlingDeliveryTotals(target, delivery) {
  if (delivery.is_legal_ball) {
    target.ballsBowled += 1;
  }

  target.runsConceded += delivery.batter_runs + delivery.wides + delivery.noballs;

  if (delivery.is_dot_ball) {
    target.dotBalls += 1;
  }
}

function buildGroupedBattingSplits(rows, context, keyResolver, labelResolver, fieldName) {
  const grouped = new Map();

  for (const row of rows) {
    const key = keyResolver(row);

    if (!key) {
      continue;
    }

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        matches: new Set(),
        innings: 0,
        totals: createBattingAccumulator()
      });
    }

    const current = grouped.get(key);
    current.matches.add(row.match_id);
    current.innings += row.innings || 0;
    addBattingTotals(current.totals, row);
  }

  return [...grouped.values()]
    .map((entry) => ({
      [fieldName]: labelResolver(entry.key),
      matches: entry.matches.size,
      innings: entry.innings,
      batting: finalizeBattingTotals(entry.totals)
    }))
    .filter((entry) => entry[fieldName])
    .sort((a, b) => {
      if (b.batting.runs !== a.batting.runs) {
        return b.batting.runs - a.batting.runs;
      }

      return (b.batting.strikeRate || 0) - (a.batting.strikeRate || 0);
    });
}

function buildGroupedBowlingSplits(rows, context, keyResolver, labelResolver, fieldName) {
  const grouped = new Map();

  for (const row of rows) {
    const key = keyResolver(row);

    if (!key) {
      continue;
    }

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        matches: new Set(),
        innings: 0,
        totals: createBowlingAccumulator()
      });
    }

    const current = grouped.get(key);
    current.matches.add(row.match_id);
    current.innings += row.innings || 0;
    addBowlingTotals(current.totals, row);
  }

  return [...grouped.values()]
    .map((entry) => ({
      [fieldName]: labelResolver(entry.key),
      matches: entry.matches.size,
      innings: entry.innings,
      bowling: finalizeBowlingTotals(entry.totals)
    }))
    .filter((entry) => entry[fieldName])
    .sort((a, b) => {
      if (b.bowling.wickets !== a.bowling.wickets) {
        return b.bowling.wickets - a.bowling.wickets;
      }

      return (
        (a.bowling.economy || Number.MAX_SAFE_INTEGER) -
        (b.bowling.economy || Number.MAX_SAFE_INTEGER)
      );
    });
}

function buildPlayerBattingOpponentSplits(rows, context) {
  return buildGroupedBattingSplits(
    rows,
    context,
    (row) => row.opposition_team_id,
    (teamId) => toTeamLabel(context.teamById.get(teamId)),
    "team"
  );
}

function buildPlayerBowlingOpponentSplits(rows, context) {
  return buildGroupedBowlingSplits(
    rows,
    context,
    (row) => row.opposition_team_id,
    (teamId) => toTeamLabel(context.teamById.get(teamId)),
    "team"
  );
}

function buildPlayerBattingVenueSplits(rows, context) {
  return buildGroupedBattingSplits(
    rows,
    context,
    (row) => context.matchById.get(row.match_id)?.venue_id || null,
    (venueId) => toVenueLabel(context.venueById.get(venueId)),
    "venue"
  );
}

function buildPlayerBowlingVenueSplits(rows, context) {
  return buildGroupedBowlingSplits(
    rows,
    context,
    (row) => context.matchById.get(row.match_id)?.venue_id || null,
    (venueId) => toVenueLabel(context.venueById.get(venueId)),
    "venue"
  );
}

function buildBatterVsBowlerMatchups(context, { playerId, season }) {
  const grouped = new Map();

  for (const delivery of context.deliveries) {
    if (delivery.striker_player_id !== playerId || !delivery.bowler_player_id) {
      continue;
    }

    const match = context.matchById.get(delivery.match_id);
    if (!matchInSeason(match, season)) {
      continue;
    }

    if (!grouped.has(delivery.bowler_player_id)) {
      grouped.set(delivery.bowler_player_id, {
        bowlerId: delivery.bowler_player_id,
        matches: new Set(),
        totals: createBattingAccumulator()
      });
    }

    const current = grouped.get(delivery.bowler_player_id);
    current.matches.add(delivery.match_id);
    addBattingDeliveryTotals(current.totals, delivery);
  }

  for (const wicket of context.wickets) {
    if (
      wicket.player_out_id !== playerId ||
      !wicket.bowler_player_id ||
      !wicket.counts_as_dismissal ||
      !wicket.credited_to_bowler
    ) {
      continue;
    }

    const match = context.matchById.get(wicket.match_id);
    if (!matchInSeason(match, season)) {
      continue;
    }

    if (!grouped.has(wicket.bowler_player_id)) {
      grouped.set(wicket.bowler_player_id, {
        bowlerId: wicket.bowler_player_id,
        matches: new Set(),
        totals: createBattingAccumulator()
      });
    }

    const current = grouped.get(wicket.bowler_player_id);
    current.matches.add(wicket.match_id);
    current.totals.dismissals += 1;
  }

  return [...grouped.values()]
    .map((entry) => ({
      player: toPlayerLabel(context.playerById.get(entry.bowlerId)),
      matches: entry.matches.size,
      batting: finalizeBattingTotals(entry.totals)
    }))
    .filter((entry) => entry.player && entry.batting.ballsFaced > 0)
    .sort((a, b) => {
      if (b.batting.ballsFaced !== a.batting.ballsFaced) {
        return b.batting.ballsFaced - a.batting.ballsFaced;
      }

      return b.batting.dismissals - a.batting.dismissals;
    });
}

function buildBowlerVsBatterMatchups(context, { playerId, season }) {
  const grouped = new Map();

  for (const delivery of context.deliveries) {
    if (delivery.bowler_player_id !== playerId || !delivery.striker_player_id) {
      continue;
    }

    const match = context.matchById.get(delivery.match_id);
    if (!matchInSeason(match, season)) {
      continue;
    }

    if (!grouped.has(delivery.striker_player_id)) {
      grouped.set(delivery.striker_player_id, {
        batterId: delivery.striker_player_id,
        matches: new Set(),
        totals: createBowlingAccumulator()
      });
    }

    const current = grouped.get(delivery.striker_player_id);
    current.matches.add(delivery.match_id);
    addBowlingDeliveryTotals(current.totals, delivery);
  }

  for (const wicket of context.wickets) {
    if (
      wicket.bowler_player_id !== playerId ||
      !wicket.player_out_id ||
      !wicket.credited_to_bowler
    ) {
      continue;
    }

    const match = context.matchById.get(wicket.match_id);
    if (!matchInSeason(match, season)) {
      continue;
    }

    if (!grouped.has(wicket.player_out_id)) {
      grouped.set(wicket.player_out_id, {
        batterId: wicket.player_out_id,
        matches: new Set(),
        totals: createBowlingAccumulator()
      });
    }

    const current = grouped.get(wicket.player_out_id);
    current.matches.add(wicket.match_id);
    current.totals.wickets += 1;
  }

  return [...grouped.values()]
    .map((entry) => ({
      player: toPlayerLabel(context.playerById.get(entry.batterId)),
      matches: entry.matches.size,
      bowling: finalizeBowlingTotals(entry.totals)
    }))
    .filter((entry) => entry.player && entry.bowling.ballsBowled > 0)
    .sort((a, b) => {
      if (b.bowling.ballsBowled !== a.bowling.ballsBowled) {
        return b.bowling.ballsBowled - a.bowling.ballsBowled;
      }

      return b.bowling.wickets - a.bowling.wickets;
    });
}

function deliveryKey(matchId, inningsNumber, inningsBallIndex) {
  return `${matchId}:${inningsNumber}:${inningsBallIndex}`;
}

function buildTeamPhaseProfile(context, { teamId, season }) {
  const allowedMatchIds = new Set(
    applyMatchFilters(context.matches, { season, teamId }).map((match) => match.match_id)
  );

  const battingByPhase = new Map();
  const bowlingByPhase = new Map();

  function ensurePhaseBucket(map, phase, type) {
    if (!map.has(phase)) {
      map.set(phase, {
        phase,
        matchIds: new Set(),
        inningsIds: new Set(),
        totals: type === "batting" ? createBattingAccumulator() : createBowlingAccumulator()
      });
    }

    return map.get(phase);
  }

  for (const delivery of context.deliveries) {
    if (!allowedMatchIds.has(delivery.match_id)) {
      continue;
    }

    const inningsId = `${delivery.match_id}:${delivery.innings_number}`;

    if (delivery.batting_team_id === teamId) {
      const battingBucket = ensurePhaseBucket(battingByPhase, delivery.phase, "batting");
      battingBucket.matchIds.add(delivery.match_id);
      battingBucket.inningsIds.add(inningsId);
      battingBucket.totals.runs += delivery.batter_runs;
      if (delivery.wides === 0) {
        battingBucket.totals.ballsFaced += 1;
      }
      if (delivery.batter_runs === 4) {
        battingBucket.totals.fours += 1;
      }
      if (delivery.batter_runs === 6) {
        battingBucket.totals.sixes += 1;
      }
      if (delivery.is_dot_ball) {
        battingBucket.totals.dotBalls += 1;
      }
    }

    if (delivery.bowling_team_id === teamId) {
      const bowlingBucket = ensurePhaseBucket(bowlingByPhase, delivery.phase, "bowling");
      bowlingBucket.matchIds.add(delivery.match_id);
      bowlingBucket.inningsIds.add(inningsId);
      if (delivery.is_legal_ball) {
        bowlingBucket.totals.ballsBowled += 1;
      }
      bowlingBucket.totals.runsConceded +=
        delivery.batter_runs + delivery.wides + delivery.noballs;
      if (delivery.is_dot_ball) {
        bowlingBucket.totals.dotBalls += 1;
      }
    }
  }

  for (const wicket of context.wickets) {
    if (!allowedMatchIds.has(wicket.match_id)) {
      continue;
    }

    const phase =
      context.deliveryPhaseByKey.get(
        deliveryKey(wicket.match_id, wicket.innings_number, wicket.innings_ball_index)
      ) || "middle";

    if (wicket.batting_team_id === teamId && wicket.counts_as_dismissal) {
      const battingBucket = ensurePhaseBucket(battingByPhase, phase, "batting");
      battingBucket.totals.dismissals += 1;
    }

    if (wicket.bowling_team_id === teamId && wicket.credited_to_bowler) {
      const bowlingBucket = ensurePhaseBucket(bowlingByPhase, phase, "bowling");
      bowlingBucket.totals.wickets += 1;
    }
  }

  return {
    batting: [...battingByPhase.values()]
      .map((entry) => ({
        phase: entry.phase,
        matches: entry.matchIds.size,
        innings: entry.inningsIds.size,
        batting: finalizeBattingTotals(entry.totals)
      }))
      .sort(phaseSort),
    bowling: [...bowlingByPhase.values()]
      .map((entry) => ({
        phase: entry.phase,
        matches: entry.matchIds.size,
        innings: entry.inningsIds.size,
        bowling: finalizeBowlingTotals(entry.totals)
      }))
      .sort(phaseSort)
  };
}

function decorateMatch(match, context) {
  return {
    matchId: match.match_id,
    season: match.season,
    matchDate: match.match_date,
    stage: match.event_stage,
    venue: toVenueLabel(context.venueById.get(match.venue_id)),
    teams: {
      home: toTeamLabel(context.teamById.get(match.team_1_id)),
      away: toTeamLabel(context.teamById.get(match.team_2_id))
    },
    toss: {
      winner: toTeamLabel(context.teamById.get(match.toss_winner_team_id)),
      decision: match.toss_decision
    },
    result: {
      winner: toTeamLabel(context.teamById.get(match.winner_team_id)),
      eliminatorWinner: toTeamLabel(context.teamById.get(match.eliminator_team_id)),
      type: match.result_type,
      margin: match.result_margin,
      label: match.result_label,
      method: match.method
    },
    playerOfMatch: match.player_of_match_ids.map((playerId, index) => ({
      player: toPlayerLabel(context.playerById.get(playerId)),
      name: match.player_of_match_names[index] || null
    }))
  };
}

function buildTeamSummaries(context, filters) {
  const matches = applyMatchFilters(context.matches, filters);
  const allowedMatchIds = new Set(matches.map((match) => match.match_id));
  const innings = context.innings.filter((row) => allowedMatchIds.has(row.match_id));

  const summaries = new Map(
    context.teams.map((team) => [
      team.team_id,
      {
        team: team,
        matches: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        noResults: 0,
        battingRuns: 0,
        battingBalls: 0,
        wicketsLost: 0,
        bowlingRunsConceded: 0,
        bowlingBalls: 0,
        wicketsTaken: 0
      }
    ])
  );

  for (const match of matches) {
    const teamIds = unique([match.team_1_id, match.team_2_id].filter(Boolean));
    for (const teamId of teamIds) {
      summaries.get(teamId).matches += 1;
    }

    if (match.result_type === "no result") {
      for (const teamId of teamIds) {
        summaries.get(teamId).noResults += 1;
      }
      continue;
    }

    if (match.result_label === "tie") {
      for (const teamId of teamIds) {
        summaries.get(teamId).ties += 1;
      }
      continue;
    }

    if (match.winner_team_id) {
      summaries.get(match.winner_team_id).wins += 1;
      for (const teamId of teamIds) {
        if (teamId !== match.winner_team_id) {
          summaries.get(teamId).losses += 1;
        }
      }
    }
  }

  for (const row of innings) {
    const battingSummary = summaries.get(row.batting_team_id);
    battingSummary.battingRuns += row.total_runs;
    battingSummary.battingBalls += row.legal_balls;
    battingSummary.wicketsLost += row.total_wickets;

    if (row.bowling_team_id && summaries.has(row.bowling_team_id)) {
      const bowlingSummary = summaries.get(row.bowling_team_id);
      bowlingSummary.bowlingRunsConceded += row.total_runs;
      bowlingSummary.bowlingBalls += row.legal_balls;
      bowlingSummary.wicketsTaken += row.total_wickets;
    }
  }

  return [...summaries.values()]
    .map((entry) => ({
      team: toTeamLabel(entry.team),
      summary: {
        matches: entry.matches,
        wins: entry.wins,
        losses: entry.losses,
        ties: entry.ties,
        noResults: entry.noResults,
        winPct: rate(entry.wins, entry.matches, 100),
        battingRuns: entry.battingRuns,
        battingBalls: entry.battingBalls,
        wicketsLost: entry.wicketsLost,
        bowlingRunsConceded: entry.bowlingRunsConceded,
        bowlingBalls: entry.bowlingBalls,
        wicketsTaken: entry.wicketsTaken,
        battingRunRate: rate(entry.battingRuns, entry.battingBalls, 6),
        bowlingRunRate: rate(entry.bowlingRunsConceded, entry.bowlingBalls, 6),
        netRunRate:
          rate(entry.battingRuns, entry.battingBalls, 6) !== null &&
          rate(entry.bowlingRunsConceded, entry.bowlingBalls, 6) !== null
            ? Number(
                (
                  rate(entry.battingRuns, entry.battingBalls, 6) -
                  rate(entry.bowlingRunsConceded, entry.bowlingBalls, 6)
                ).toFixed(2)
              )
            : null
      }
    }))
    .sort((a, b) => {
      if (b.summary.wins !== a.summary.wins) {
        return b.summary.wins - a.summary.wins;
      }

      return (b.summary.netRunRate || 0) - (a.summary.netRunRate || 0);
    });
}

function buildVenueSummaries(context, filters) {
  const matches = applyMatchFilters(context.matches, filters);
  const inningsByMatch = new Map();

  for (const row of context.innings) {
    if (!inningsByMatch.has(row.match_id)) {
      inningsByMatch.set(row.match_id, []);
    }

    inningsByMatch.get(row.match_id).push(row);
  }

  const summaries = new Map();

  for (const match of matches) {
    const venue = context.venueById.get(match.venue_id);

    if (!venue) {
      continue;
    }

    if (!summaries.has(match.venue_id)) {
      summaries.set(match.venue_id, {
        venue,
        matches: 0,
        recentMatchDate: null,
        firstInningsRuns: 0,
        firstInningsCount: 0,
        secondInningsRuns: 0,
        secondInningsCount: 0,
        chaseWins: 0,
        defendWins: 0,
        tossField: 0,
        tossBat: 0,
        highestTotal: null
      });
    }

    const current = summaries.get(match.venue_id);
    current.matches += 1;

    if (!current.recentMatchDate || match.match_date > current.recentMatchDate) {
      current.recentMatchDate = match.match_date;
    }

    if (match.toss_decision === "field") {
      current.tossField += 1;
    }

    if (match.toss_decision === "bat") {
      current.tossBat += 1;
    }

    const innings = [...(inningsByMatch.get(match.match_id) || [])].sort(
      (a, b) => a.innings_number - b.innings_number
    );
    const firstInnings = innings[0];
    const secondInnings = innings[1];

    if (firstInnings) {
      current.firstInningsRuns += firstInnings.total_runs;
      current.firstInningsCount += 1;
    }

    if (secondInnings) {
      current.secondInningsRuns += secondInnings.total_runs;
      current.secondInningsCount += 1;
    }

    for (const inningsEntry of innings) {
      if (!current.highestTotal || inningsEntry.total_runs > current.highestTotal.runs) {
        current.highestTotal = {
          runs: inningsEntry.total_runs,
          wickets: inningsEntry.total_wickets,
          team: toTeamLabel(context.teamById.get(inningsEntry.batting_team_id)),
          matchId: match.match_id
        };
      }
    }

    if (
      match.result_type !== "no result" &&
      match.result_label !== "tie" &&
      match.winner_team_id
    ) {
      if (firstInnings && match.winner_team_id === firstInnings.batting_team_id) {
        current.defendWins += 1;
      } else if (secondInnings && match.winner_team_id === secondInnings.batting_team_id) {
        current.chaseWins += 1;
      }
    }
  }

  return [...summaries.values()]
    .map((entry) => {
      const completedOutcomes = entry.chaseWins + entry.defendWins;

      return {
        venue: toVenueLabel(entry.venue),
        recentMatchDate: entry.recentMatchDate,
        summary: {
          matches: entry.matches,
          averageFirstInningsScore: rate(entry.firstInningsRuns, entry.firstInningsCount),
          averageSecondInningsScore: rate(entry.secondInningsRuns, entry.secondInningsCount),
          chaseWins: entry.chaseWins,
          defendWins: entry.defendWins,
          chaseWinPct: rate(entry.chaseWins, completedOutcomes, 100),
          defendWinPct: rate(entry.defendWins, completedOutcomes, 100),
          tossFieldPct: rate(entry.tossField, entry.matches, 100),
          tossBatPct: rate(entry.tossBat, entry.matches, 100),
          highestTotal: entry.highestTotal
        }
      };
    })
    .sort((a, b) => {
      if (b.summary.matches !== a.summary.matches) {
        return b.summary.matches - a.summary.matches;
      }

      return (b.summary.averageFirstInningsScore || 0) - (a.summary.averageFirstInningsScore || 0);
    });
}

async function buildContext(league) {
  const [
    manifest,
    teams,
    players,
    venues,
    matches,
    matchPlayers,
    innings,
    deliveries,
    wickets,
    reviews,
    replacements,
    playerMatchBatting,
    playerMatchBowling,
    playerPhaseBatting,
    playerPhaseBowling
  ] = await Promise.all([
    loadManifest(league),
    loadJsonl(league, "teams.jsonl"),
    loadJsonl(league, "players.jsonl"),
    loadJsonl(league, "venues.jsonl"),
    loadJsonl(league, "matches.jsonl"),
    loadJsonl(league, "match_players.jsonl"),
    loadJsonl(league, "innings.jsonl"),
    loadJsonl(league, "deliveries.jsonl"),
    loadJsonl(league, "wickets.jsonl"),
    loadJsonl(league, "reviews.jsonl"),
    loadJsonl(league, "replacements.jsonl"),
    loadJsonl(league, "player_match_batting.jsonl"),
    loadJsonl(league, "player_match_bowling.jsonl"),
    loadJsonl(league, "player_phase_batting.jsonl"),
    loadJsonl(league, "player_phase_bowling.jsonl")
  ]);

  return {
    manifest,
    latestSeason: manifest.seasons[manifest.seasons.length - 1],
    teams,
    players,
    venues,
    matches: [...matches].sort(matchSort),
    matchPlayers,
    innings,
    deliveries,
    wickets,
    reviews,
    replacements,
    playerMatchBatting,
    playerMatchBowling,
    playerPhaseBatting,
    playerPhaseBowling,
    teamById: new Map(teams.map((team) => [team.team_id, team])),
    playerById: new Map(players.map((player) => [player.player_id, player])),
    venueById: new Map(venues.map((venue) => [venue.venue_id, venue])),
    matchById: new Map(matches.map((match) => [match.match_id, match])),
    deliveryPhaseByKey: new Map(
      deliveries.map((delivery) => [
        deliveryKey(delivery.match_id, delivery.innings_number, delivery.innings_ball_index),
        delivery.phase
      ])
    )
  };
}


function buildTeamVenueRecord(context, { teamId, season }) {
  const grouped = new Map();
  for (const match of context.matches) {
    if (match.team_1_id !== teamId && match.team_2_id !== teamId) continue;
    if (season && match.season !== season) continue;
    if (!match.venue_id) continue;
    if (match.result_type !== "win") continue;

    if (!grouped.has(match.venue_id)) {
      grouped.set(match.venue_id, {
        venueId: match.venue_id,
        matches: 0,
        wins: 0,
        losses: 0
      });
    }

    const current = grouped.get(match.venue_id);
    current.matches += 1;
    if (match.winner_team_id === teamId) {
      current.wins += 1;
    } else {
      current.losses += 1;
    }
  }

  return [...grouped.values()]
    .map((entry) => ({
      venue: toVenueLabel(context.venueById.get(entry.venueId)),
      matches: entry.matches,
      wins: entry.wins,
      losses: entry.losses,
      winPct: rate(entry.wins, entry.matches, 100)
    }))
    .filter((entry) => entry.venue && entry.matches > 0)
    .sort((a, b) => b.wins - a.wins || b.matches - a.matches);
}

function buildTeamOutcomeProfile(context, { teamId, season }) {
  const matches = applyMatchFilters(context.matches, { season });
  const allTeams = context.teams;
  
  const profiles = new Map(allTeams.map(t => [t.team_id, {
    chase: { matches: 0, wins: 0, losses: 0 },
    defend: { matches: 0, wins: 0, losses: 0 }
  }]));

  for (const row of context.innings) {
    const match = context.matchById.get(row.match_id);
    if (!match || match.result_type !== "win") continue;
    if (season && match.season !== season) continue;

    const bTeamId = row.batting_team_id;
    if (!profiles.has(bTeamId)) continue;
    const current = profiles.get(bTeamId);

    if (row.innings_number === 1) {
      current.defend.matches += 1;
      if (match.winner_team_id === bTeamId) current.defend.wins += 1;
      else current.defend.losses += 1;
    } else if (row.innings_number === 2) {
      current.chase.matches += 1;
      if (match.winner_team_id === bTeamId) current.chase.wins += 1;
      else current.chase.losses += 1;
    }
  }

  const phaseProfilesByTeam = new Map();
  for (const t of allTeams) {
    phaseProfilesByTeam.set(t.team_id, buildTeamPhaseProfile(context, { teamId: t.team_id, season }));
  }

  const teamProfile = profiles.get(teamId) || { chase: { wins: 0, losses: 0, matches: 0 }, defend: { wins: 0, losses: 0, matches: 0 } };

  function getRank(phase, mode, metricKey, sortOrder = "desc") {
    const ranks = allTeams.map(t => {
      const p = phaseProfilesByTeam.get(t.team_id);
      let metric = null;
      if (p && p[mode]) {
        const ph = p[mode].find(x => x.phase === phase);
        if (ph) {
           metric = ph[mode][metricKey];
        }
      }
      return { id: t.team_id, name: t.team_name, value: metric || 0 };
    });
    
    ranks.sort((a, b) => sortOrder === "desc" ? b.value - a.value : a.value - b.value);
    const pos = ranks.findIndex(r => r.id === teamId);
    
    return {
      rank: pos + 1,
      of: ranks.length,
      value: ranks[pos]?.value || 0
    };
  }

  return {
    chase: teamProfile.chase,
    defend: teamProfile.defend,
    ranks: {
      powerplayBatting: getRank("powerplay", "batting", "strikeRate", "desc"),
      middleOverCollapse: getRank("middle", "batting", "average", "asc"),
      deathHitting: getRank("death", "batting", "strikeRate", "desc"),
      powerplayWickets: getRank("powerplay", "bowling", "strikeRate", "asc"),
      deathEconomy: getRank("death", "bowling", "economy", "asc")
    }
  };
}
function buildBatterPacingProfile(context, { playerId, season }) {
  const allowedMatchIds = new Set(
    applyMatchFilters(context.matches, { season }).map((match) => match.match_id)
  );

  const buckets = [
    { label: "1-10", min: 1, max: 10, runs: 0, balls: 0, outs: 0 },
    { label: "11-20", min: 11, max: 20, runs: 0, balls: 0, outs: 0 },
    { label: "21-30", min: 21, max: 30, runs: 0, balls: 0, outs: 0 },
    { label: "31+", min: 31, max: Infinity, runs: 0, balls: 0, outs: 0 }
  ];

  const inningsState = new Map();

  for (const delivery of context.deliveries) {
    if (!allowedMatchIds.has(delivery.match_id)) continue;
    if (delivery.striker_player_id !== playerId) continue;

    const inningsKey = `${delivery.match_id}:${delivery.innings_number}`;
    let ballsFaced = inningsState.get(inningsKey) || 0;

    if (delivery.wides === 0) {
      ballsFaced += 1;
      inningsState.set(inningsKey, ballsFaced);
    }

    const effectiveBallFaced = Math.max(1, ballsFaced);
    const bucket = buckets.find(b => effectiveBallFaced >= b.min && effectiveBallFaced <= b.max);

    if (bucket) {
      bucket.runs += delivery.batter_runs;
      if (delivery.wides === 0) bucket.balls += 1;
    }
  }

  for (const wicket of context.wickets) {
    if (!allowedMatchIds.has(wicket.match_id) || wicket.player_out_id !== playerId) continue;
    const inningsKey = `${wicket.match_id}:${wicket.innings_number}`;
    const ballsFaced = inningsState.get(inningsKey) || 0;
    const effectiveBallFaced = Math.max(1, ballsFaced);
    const bucket = buckets.find(b => effectiveBallFaced >= b.min && effectiveBallFaced <= b.max);
    if (bucket) {
      bucket.outs += 1;
    }
  }

  return buckets.map(b => ({
    label: b.label,
    runs: b.runs,
    balls: b.balls,
    outs: b.outs,
    strikeRate: b.balls > 0 ? (b.runs / b.balls) * 100 : 0,
    average: b.outs > 0 ? b.runs / b.outs : null
  }));
}

export function createLocalRepository(league) {
  let contextPromise;

  async function getContext() {
    if (!contextPromise) {
      contextPromise = buildContext(league);
    }

    return contextPromise;
  }

  return {
    async getManifest() {
      const context = await getContext();
      return context.manifest;
    },

    async getLiveMatchUpdate() {
      const context = await getContext();
      const latestMatch = context.matches[0];
      if (!latestMatch) return null;

      const matchId = latestMatch.match_id;
      const matchInnings = context.innings
        .filter((i) => i.match_id === matchId)
        .sort((a, b) => a.innings_number - b.innings_number);
      
      const currentInnings = matchInnings[matchInnings.length - 1];
      const matchDeliveries = context.deliveries
        .filter((d) => d.match_id === matchId)
        .sort((a, b) => a.innings_ball_index - b.innings_ball_index);
      
      const currentInningsDeliveries = matchDeliveries.filter(d => d.innings_number === currentInnings.innings_number);
      const recentDeliveries = currentInningsDeliveries.slice(-12).reverse();
      
      const wicketEvents = context.wickets
        .filter(w => w.match_id === matchId)
        .map(w => ({
          type: "wicket",
          ball: w.ball_label,
          innings: w.innings_number,
          playerOut: toPlayerLabel(context.playerById.get(w.player_out_id)),
          bowler: toPlayerLabel(context.playerById.get(w.bowler_player_id)),
          kind: w.dismissal_kind
        }))
        .reverse();

      return {
        match: decorateMatch(latestMatch, context),
        isComplete: latestMatch.result_type !== null,
        resultLabel: latestMatch.result_type ? decorateMatch(latestMatch, context).result.label : null,
        innings: matchInnings.map(i => ({
          number: i.innings_number,
          battingTeam: toTeamLabel(context.teamById.get(i.batting_team_id)),
          runs: i.total_runs,
          wickets: i.total_wickets,
          overs: i.overs_bowled,
          target: i.target_runs
        })),
        currentInnings: {
          number: currentInnings.innings_number,
          battingTeam: toTeamLabel(context.teamById.get(currentInnings.batting_team_id)),
          runs: currentInnings.total_runs,
          wickets: currentInnings.total_wickets,
          overs: currentInnings.overs_bowled,
          lastBalls: recentDeliveries.map(d => ({
            ball: d.ball_label,
            runs: d.total_runs,
            isWicket: d.wicket_count > 0,
            isBoundary: d.is_boundary,
            batterRuns: d.batter_runs
          }))
        },
        events: wicketEvents.slice(0, 5)
      };
    },

    async listVenues(options = {}) {
      const context = await getContext();
      const season = resolveSeason(options.season, context.latestSeason);
      return buildVenueSummaries(context, { season, venueId: options.venueId || null });
    },

    async getVenue(venueId, options = {}) {
      const context = await getContext();
      const season = resolveSeason(options.season, context.latestSeason);
      const venue = context.venueById.get(venueId);

      if (!venue) {
        return null;
      }

      const matches = applyMatchFilters(context.matches, {
        season,
        venueId
      }).map((match) => decorateMatch(match, context));
      const summary = buildVenueSummaries(context, { season, venueId })[0]?.summary || {
        matches: 0,
        averageFirstInningsScore: null,
        averageSecondInningsScore: null,
        chaseWins: 0,
        defendWins: 0,
        chaseWinPct: null,
        defendWinPct: null,
        tossFieldPct: null,
        tossBatPct: null,
        highestTotal: null
      };
      const teamLeaders = buildTeamSummaries(context, { season, venueId }).slice(0, 6);
      const allowedMatchIds = new Set(matches.map((match) => match.matchId));

      const battingLeaders = aggregatePlayerBattingRows(
        context.playerMatchBatting.filter(
          (row) => allowedMatchIds.has(row.match_id) && (!season || row.season === season)
        )
      )
        .map((row) => ({
          player: toPlayerLabel(context.playerById.get(row.playerId)),
          matches: row.matches,
          innings: row.innings,
          batting: row.batting
        }))
        .sort((a, b) => b.batting.runs - a.batting.runs)
        .slice(0, 8);

      const bowlingLeaders = aggregatePlayerBowlingRows(
        context.playerMatchBowling.filter(
          (row) => allowedMatchIds.has(row.match_id) && (!season || row.season === season)
        )
      )
        .map((row) => ({
          player: toPlayerLabel(context.playerById.get(row.playerId)),
          matches: row.matches,
          innings: row.innings,
          bowling: row.bowling
        }))
        .sort((a, b) => {
          if (b.bowling.wickets !== a.bowling.wickets) {
            return b.bowling.wickets - a.bowling.wickets;
          }

          return (a.bowling.economy || Number.MAX_SAFE_INTEGER) - (b.bowling.economy || Number.MAX_SAFE_INTEGER);
        })
        .slice(0, 8);

      return {
        venue: toVenueLabel(venue),
        season: season || "all",
        summary,
        recentMatches: matches.slice(0, Number(options.matchLimit) || 10),
        leaders: {
          batting: battingLeaders,
          bowling: bowlingLeaders,
          teams: teamLeaders
        }
      };
    },

    async listTeams(options = {}) {
      const context = await getContext();
      const season = resolveSeason(options.season, context.latestSeason);
      return buildTeamSummaries(context, { season, teamId: options.teamId || null });
    },

    async getTeam(teamId, options = {}) {
      const context = await getContext();
      const season = resolveSeason(options.season, context.latestSeason);
      const team = context.teamById.get(teamId);

      if (!team) {
        return null;
      }

      const summary = buildTeamSummaries(context, { season, teamId }).find(
        (entry) => entry.team.id === teamId
      );

      const matches = applyMatchFilters(context.matches, { season, teamId }).map((match) =>
        decorateMatch(match, context)
      );

      const battingLeaders = aggregatePlayerBattingRows(
        context.playerMatchBatting.filter(
          (row) => row.team_id === teamId && (!season || row.season === season)
        )
      )
        .map((row) => ({
          player: toPlayerLabel(context.playerById.get(row.playerId)),
          matches: row.matches,
          innings: row.innings,
          batting: row.batting
        }))
        .sort((a, b) => b.batting.runs - a.batting.runs)
        .slice(0, 8);

      const bowlingLeaders = aggregatePlayerBowlingRows(
        context.playerMatchBowling.filter(
          (row) => row.team_id === teamId && (!season || row.season === season)
        )
      )
        .map((row) => ({
          player: toPlayerLabel(context.playerById.get(row.playerId)),
          matches: row.matches,
          innings: row.innings,
          bowling: row.bowling
        }))
        .sort((a, b) => {
          if (b.bowling.wickets !== a.bowling.wickets) {
            return b.bowling.wickets - a.bowling.wickets;
          }

          return (a.bowling.economy || Number.MAX_SAFE_INTEGER) - (b.bowling.economy || Number.MAX_SAFE_INTEGER);
        })
        .slice(0, 8);

      const phaseProfile = buildTeamPhaseProfile(context, { teamId, season });
      const venues = buildTeamVenueRecord(context, { teamId, season });
      const identity = buildTeamOutcomeProfile(context, { teamId, season });

      const powerplayBattingLeaders = aggregatePlayerBattingRows(
        context.playerPhaseBatting.filter(
          (row) =>
            row.team_id === teamId &&
            row.phase === "powerplay" &&
            (!season || row.season === season)
        )
      )
        .map((row) => ({
          player: toPlayerLabel(context.playerById.get(row.playerId)),
          batting: row.batting
        }))
        .sort((a, b) => b.batting.runs - a.batting.runs)
        .slice(0, 3);

      const powerplayBowlingLeaders = aggregatePlayerBowlingRows(
        context.playerPhaseBowling.filter(
          (row) =>
            row.team_id === teamId &&
            row.phase === "powerplay" &&
            (!season || row.season === season)
        )
      )
        .map((row) => ({
          player: toPlayerLabel(context.playerById.get(row.playerId)),
          bowling: row.bowling
        }))
        .sort((a, b) => b.bowling.wickets - a.bowling.wickets)
        .slice(0, 3);

      return {
        team: toTeamLabel(team),
        season: season || "all",
        summary: summary ? summary.summary : null,
        recentMatches: matches.slice(0, Number(options.matchLimit) || 10),
        leaders: {
          batting: battingLeaders,
          bowling: bowlingLeaders,
          powerplay: {
            batting: powerplayBattingLeaders,
            bowling: powerplayBowlingLeaders
          }
        },
        phaseProfile,
        venues,
        identity
      };
    },


    async listPlayers(options = {}) {
      const context = await getContext();
      const season = resolveSeason(options.season, context.latestSeason);
      const teamId = options.teamId || null;
      const search = (options.search || "").trim().toLowerCase();
      const sort = options.sort || "runs";
      const limit = options.limit === "all" ? null : Number(options.limit) || 30;

      const allowedMatchIds = new Set(
        applyMatchFilters(context.matches, { season, teamId }).map((match) => match.match_id)
      );

      const rowsByPlayer = new Map();

      for (const row of context.matchPlayers) {
        if (!allowedMatchIds.has(row.match_id)) {
          continue;
        }

        if (teamId && row.team_id !== teamId) {
          continue;
        }

        if (!rowsByPlayer.has(row.player_id)) {
          rowsByPlayer.set(row.player_id, {
            playerId: row.player_id,
            matchIds: new Set(),
            teamIds: new Set(),
            latestMatchDate: null
          });
        }

        const current = rowsByPlayer.get(row.player_id);
        current.matchIds.add(row.match_id);
        current.teamIds.add(row.team_id);

        const match = context.matchById.get(row.match_id);
        if (match && (!current.latestMatchDate || match.match_date > current.latestMatchDate)) {
          current.latestMatchDate = match.match_date;
        }
      }

      const battingRows = context.playerMatchBatting.filter(
        (row) =>
          allowedMatchIds.has(row.match_id) &&
          (!teamId || row.team_id === teamId) &&
          (!season || row.season === season)
      );

      const bowlingRows = context.playerMatchBowling.filter(
        (row) =>
          allowedMatchIds.has(row.match_id) &&
          (!teamId || row.team_id === teamId) &&
          (!season || row.season === season)
      );

      const battingByPlayer = new Map(
        aggregatePlayerBattingRows(battingRows).map((row) => [row.playerId, row])
      );
      const bowlingByPlayer = new Map(
        aggregatePlayerBowlingRows(bowlingRows).map((row) => [row.playerId, row])
      );

      const results = [...rowsByPlayer.values()]
        .map((row) => {
          const player = context.playerById.get(row.playerId);
          const batting = battingByPlayer.get(row.playerId)?.batting || finalizeBattingTotals(createBattingAccumulator());
          const bowling = bowlingByPlayer.get(row.playerId)?.bowling || finalizeBowlingTotals(createBowlingAccumulator());
          const teams = [...row.teamIds]
            .map((currentTeamId) => toTeamLabel(context.teamById.get(currentTeamId)))
            .filter(Boolean);

          return {
            player: toPlayerLabel(player),
            teams,
            matches: row.matchIds.size,
            latestMatchDate: row.latestMatchDate,
            batting,
            bowling
          };
        })
        .filter((row) => {
          if (!search) {
            return true;
          }

          return row.player.name.toLowerCase().includes(search);
        })
        .sort((a, b) => {
          if (sort === "wickets") {
            return b.bowling.wickets - a.bowling.wickets;
          }

          if (sort === "matches") {
            return b.matches - a.matches;
          }

          return b.batting.runs - a.batting.runs;
        });

      return limit ? results.slice(0, limit) : results;
    },

    async getPlayer(playerId, options = {}) {
      const context = await getContext();
      const season = resolveSeason(options.season, context.latestSeason);
      const player = context.playerById.get(playerId);

      if (!player) {
        return null;
      }

      const battingRows = context.playerMatchBatting.filter(
        (row) => row.player_id === playerId && (!season || row.season === season)
      );
      const bowlingRows = context.playerMatchBowling.filter(
        (row) => row.player_id === playerId && (!season || row.season === season)
      );
      const allBattingRows = context.playerMatchBatting.filter((row) => row.player_id === playerId);
      const allBowlingRows = context.playerMatchBowling.filter((row) => row.player_id === playerId);
      const phaseBattingRows = context.playerPhaseBatting.filter(
        (row) => row.player_id === playerId && (!season || row.season === season)
      );
      const phaseBowlingRows = context.playerPhaseBowling.filter(
        (row) => row.player_id === playerId && (!season || row.season === season)
      );

      const currentBattingSummaryRow =
        aggregatePlayerBattingRows(battingRows)[0] || emptyBattingSummaryRow();
      const currentBowlingSummaryRow =
        aggregatePlayerBowlingRows(bowlingRows)[0] || emptyBowlingSummaryRow();
      const careerBattingSummaryRow =
        aggregatePlayerBattingRows(allBattingRows)[0] || emptyBattingSummaryRow();
      const careerBowlingSummaryRow =
        aggregatePlayerBowlingRows(allBowlingRows)[0] || emptyBowlingSummaryRow();

      const playerMatchIds = unique([
        ...battingRows.map((row) => row.match_id),
        ...bowlingRows.map((row) => row.match_id)
      ]);
      const dismissalRows = context.wickets.filter(
        (row) =>
          row.player_out_id === playerId &&
          row.counts_as_dismissal &&
          (!season || context.matchById.get(row.match_id)?.season === season)
      );
      const dismissalProfile = aggregateDismissals(dismissalRows, context);
      const dismissalByBowler = aggregateDismissalsByBowler(dismissalRows, context).slice(0, 6);
      const dismissalByPhase = aggregateDismissalsByPhase(dismissalRows, context);

      const recentMatches = playerMatchIds
        .map((matchId) => context.matchById.get(matchId))
        .filter(Boolean)
        .sort(matchSort)
        .slice(0, Number(options.matchLimit) || 10)
        .map((match) => {
          const batting = battingRows.find((row) => row.match_id === match.match_id);
          const bowling = bowlingRows.find((row) => row.match_id === match.match_id);

          return {
            match: decorateMatch(match, context),
            batting: batting
              ? {
                  runs: batting.runs,
                  ballsFaced: batting.balls_faced,
                  strikeRate: batting.strike_rate
                }
              : null,
            bowling: bowling
              ? {
                  wickets: bowling.wickets,
                  ballsBowled: bowling.balls_bowled,
                  runsConceded: bowling.runs_conceded,
                  economy: bowling.economy
                }
              : null
          };
        });

      const teamIds = unique([
        ...battingRows.map((row) => row.team_id),
        ...bowlingRows.map((row) => row.team_id),
        ...context.matchPlayers
          .filter((row) => row.player_id === playerId)
          .map((row) => row.team_id)
      ]);

      return {
        player: {
          ...toPlayerLabel(player),
          aliases: player.aliases
        },
        season: season || "all",
        teams: teamIds
          .map((teamIdValue) => toTeamLabel(context.teamById.get(teamIdValue)))
          .filter(Boolean),
        batting: currentBattingSummaryRow.batting,
        bowling: currentBowlingSummaryRow.bowling,
        sample: {
          batting: {
            matches: currentBattingSummaryRow.matches,
            innings: currentBattingSummaryRow.innings
          },
          bowling: {
            matches: currentBowlingSummaryRow.matches,
            innings: currentBowlingSummaryRow.innings
          }
        },
        career: {
          batting: {
            matches: careerBattingSummaryRow.matches,
            innings: careerBattingSummaryRow.innings,
            ...careerBattingSummaryRow.batting
          },
          bowling: {
            matches: careerBowlingSummaryRow.matches,
            innings: careerBowlingSummaryRow.innings,
            ...careerBowlingSummaryRow.bowling
          }
        },
        form: {
          batting: {
            last5: buildBattingFormWindow(battingRows, context, 5),
            last10: buildBattingFormWindow(battingRows, context, 10)
          },
          bowling: {
            last5: buildBowlingFormWindow(bowlingRows, context, 5),
            last10: buildBowlingFormWindow(bowlingRows, context, 10)
          }
        },
        matchups: {
          batting: {
            opposition: buildPlayerBattingOpponentSplits(battingRows, context),
            venues: buildPlayerBattingVenueSplits(battingRows, context),
            bowlers: buildBatterVsBowlerMatchups(context, {
              playerId,
              season
            })
          },
          bowling: {
            opposition: buildPlayerBowlingOpponentSplits(bowlingRows, context),
            venues: buildPlayerBowlingVenueSplits(bowlingRows, context),
            batters: buildBowlerVsBatterMatchups(context, {
              playerId,
              season
            })
          }
        },
        dismissalProfile,
        dismissalByBowler,
        dismissalByPhase,
        phaseProfile: {
          batting: aggregatePhaseBattingRows(phaseBattingRows),
          bowling: aggregatePhaseBowlingRows(phaseBowlingRows)
        },
        pacing: buildBatterPacingProfile(context, {
          playerId,
          season
        }),
        recentMatches
      };
    },


    async listMatches(options = {}) {
      const context = await getContext();
      const season = resolveSeason(options.season, context.latestSeason);
      const teamId = options.teamId || null;
      const venueId = options.venueId || null;
      const limit = options.limit === "all" ? null : Number(options.limit) || 20;

      const matches = applyMatchFilters(context.matches, { season, teamId, venueId })
        .map((match) => decorateMatch(match, context));

      return limit ? matches.slice(0, limit) : matches;
    },

    async getMatch(matchId, options = {}) {
      const context = await getContext();
      const match = context.matchById.get(Number(matchId));

      if (!match) {
        return null;
      }

      const innings = context.innings
        .filter((row) => row.match_id === match.match_id)
        .sort((a, b) => a.innings_number - b.innings_number)
        .map((row) => ({
          inningsNumber: row.innings_number,
          battingTeam: toTeamLabel(context.teamById.get(row.batting_team_id)),
          bowlingTeam: toTeamLabel(context.teamById.get(row.bowling_team_id)),
          totalRuns: row.total_runs,
          totalWickets: row.total_wickets,
          legalBalls: row.legal_balls,
          oversBowled: row.overs_bowled,
          target: row.target_runs
            ? {
                runs: row.target_runs,
                overs: row.target_overs
              }
            : null
        }));

      const battingCard = context.playerMatchBatting
        .filter((row) => row.match_id === match.match_id)
        .map((row) => ({
          player: toPlayerLabel(context.playerById.get(row.player_id)),
          team: toTeamLabel(context.teamById.get(row.team_id)),
          opposition: toTeamLabel(context.teamById.get(row.opposition_team_id)),
          runs: row.runs,
          ballsFaced: row.balls_faced,
          strikeRate: row.strike_rate,
          dismissals: row.dismissals,
          fours: row.fours,
          sixes: row.sixes
        }))
        .sort((a, b) => b.runs - a.runs);

      const bowlingCard = context.playerMatchBowling
        .filter((row) => row.match_id === match.match_id)
        .map((row) => ({
          player: toPlayerLabel(context.playerById.get(row.player_id)),
          team: toTeamLabel(context.teamById.get(row.team_id)),
          opposition: toTeamLabel(context.teamById.get(row.opposition_team_id)),
          wickets: row.wickets,
          ballsBowled: row.balls_bowled,
          runsConceded: row.runs_conceded,
          economy: row.economy
        }))
        .sort((a, b) => {
          if (b.wickets !== a.wickets) {
            return b.wickets - a.wickets;
          }

          return (a.economy || Number.MAX_SAFE_INTEGER) - (b.economy || Number.MAX_SAFE_INTEGER);
        });

      const wicketEvents = context.wickets
        .filter((row) => row.match_id === match.match_id)
        .map((row) => ({
          inningsNumber: row.innings_number,
          ball: row.ball_label,
          playerOut: toPlayerLabel(context.playerById.get(row.player_out_id)),
          dismissalKind: row.dismissal_kind,
          bowler: toPlayerLabel(context.playerById.get(row.bowler_player_id)),
          fielders: row.fielder_ids
            .map((fielderId) => toPlayerLabel(context.playerById.get(fielderId)))
            .filter(Boolean)
        }));

      const reviews = context.reviews
        .filter((row) => row.match_id === match.match_id)
        .map((row) => ({
          inningsNumber: row.innings_number,
          ball: row.ball_label,
          team: toTeamLabel(context.teamById.get(row.team_id)),
          type: row.review_type,
          decision: row.decision,
          umpire: row.umpire,
          batter: toPlayerLabel(context.playerById.get(row.batter_player_id)),
          umpiresCall: row.umpires_call
        }));

      const replacements = context.replacements
        .filter((row) => row.match_id === match.match_id)
        .map((row) => ({
          inningsNumber: row.innings_number,
          ball: row.ball_label,
          scope: row.replacement_scope,
          team: toTeamLabel(context.teamById.get(row.team_id)),
          playerIn: toPlayerLabel(context.playerById.get(row.player_in_id)),
          playerOut: toPlayerLabel(context.playerById.get(row.player_out_id)),
          reason: row.replacement_reason
        }));

      const payload = {
        match: decorateMatch(match, context),
        innings,
        scorecards: {
          batting: battingCard,
          bowling: bowlingCard
        },
        wicketEvents,
        reviews,
        replacements
      };

      if (options.includeDeliveries) {
        payload.deliveries = context.deliveries
          .filter((row) => row.match_id === match.match_id)
          .map((row) => ({
            inningsNumber: row.innings_number,
            ball: row.ball_label,
            phase: row.phase,
            striker: toPlayerLabel(context.playerById.get(row.striker_player_id)),
            nonStriker: toPlayerLabel(context.playerById.get(row.non_striker_player_id)),
            bowler: toPlayerLabel(context.playerById.get(row.bowler_player_id)),
            batterRuns: row.batter_runs,
            extrasRuns: row.extras_runs,
            totalRuns: row.total_runs,
            wicketCount: row.wicket_count
          }));
      }

      return payload;
    },

    async getTopBatters(options = {}) {
      const context = await getContext();
      const season = resolveSeason(options.season, context.latestSeason);
      const teamId = options.teamId || null;
      const phase = options.phase || null;
      const sortBy = options.sortBy || "runs";
      const minBalls = Number(options.minBalls) || 60;
      const limit = Number(options.limit) || 12;

      const phaseRows = context.playerPhaseBatting.filter((row) => {
        if (season && row.season !== season) {
          return false;
        }

        if (teamId && row.team_id !== teamId) {
          return false;
        }

        if (phase && row.phase !== phase) {
          return false;
        }

        return true;
      });

      const rows = phase
        ? aggregateLeaderboardBattingRows(phaseRows)
        : aggregatePlayerBattingRows(
            context.playerMatchBatting.filter((row) => {
              if (season && row.season !== season) {
                return false;
              }

              if (teamId && row.team_id !== teamId) {
                return false;
              }

              return true;
            })
          );

      return rows
        .filter((row) => row.batting.ballsFaced >= minBalls)
        .map((row) => ({
          player: toPlayerLabel(context.playerById.get(row.playerId)),
          teams: row.teamIds
            .map((currentTeamId) => toTeamLabel(context.teamById.get(currentTeamId)))
            .filter(Boolean),
          matches: row.matches,
          innings: row.innings,
          batting: row.batting
        }))
        .sort((a, b) => {
          if (sortBy === "strikeRate") {
            return (b.batting.strikeRate || 0) - (a.batting.strikeRate || 0);
          }

          if (sortBy === "average") {
            return (b.batting.average || 0) - (a.batting.average || 0);
          }

          return b.batting.runs - a.batting.runs;
        })
        .slice(0, limit);
    },

    async getTopBowlers(options = {}) {
      const context = await getContext();
      const season = resolveSeason(options.season, context.latestSeason);
      const teamId = options.teamId || null;
      const phase = options.phase || null;
      const sortBy = options.sortBy || "wickets";
      const minBalls = Number(options.minBalls) || 60;
      const limit = Number(options.limit) || 12;

      const phaseRows = context.playerPhaseBowling.filter((row) => {
        if (season && row.season !== season) {
          return false;
        }

        if (teamId && row.team_id !== teamId) {
          return false;
        }

        if (phase && row.phase !== phase) {
          return false;
        }

        return true;
      });

      const rows = phase
        ? aggregateLeaderboardBowlingRows(phaseRows)
        : aggregatePlayerBowlingRows(
            context.playerMatchBowling.filter((row) => {
              if (season && row.season !== season) {
                return false;
              }

              if (teamId && row.team_id !== teamId) {
                return false;
              }

              return true;
            })
          );

      return rows
        .filter((row) => row.bowling.ballsBowled >= minBalls)
        .map((row) => ({
          player: toPlayerLabel(context.playerById.get(row.playerId)),
          teams: row.teamIds
            .map((currentTeamId) => toTeamLabel(context.teamById.get(currentTeamId)))
            .filter(Boolean),
          matches: row.matches,
          innings: row.innings,
          bowling: row.bowling
        }))
        .sort((a, b) => {
          if (sortBy === "economy") {
            return (a.bowling.economy || Number.MAX_SAFE_INTEGER) - (b.bowling.economy || Number.MAX_SAFE_INTEGER);
          }

          if (sortBy === "dotBallPct") {
            return (b.bowling.dotBallPct || 0) - (a.bowling.dotBallPct || 0);
          }

          return b.bowling.wickets - a.bowling.wickets;
        })
        .slice(0, limit);
    }
  };
}
