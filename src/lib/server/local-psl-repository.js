import { loadJsonl, loadManifest } from "@/lib/server/jsonl-store";

let contextPromise;

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

function resolveSeason(season, latestSeason) {
  if (!season || season === "all") {
    return null;
  }

  if (season === "latest") {
    return latestSeason;
  }

  return season;
}

function applyMatchFilters(matches, { season, teamId }) {
  return matches.filter((match) => {
    if (season && match.season !== season) {
      return false;
    }

    if (teamId && match.team_1_id !== teamId && match.team_2_id !== teamId) {
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
    venue: context.venueById.get(match.venue_id) || null,
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

async function buildContext() {
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
    loadManifest(),
    loadJsonl("teams.jsonl"),
    loadJsonl("players.jsonl"),
    loadJsonl("venues.jsonl"),
    loadJsonl("matches.jsonl"),
    loadJsonl("match_players.jsonl"),
    loadJsonl("innings.jsonl"),
    loadJsonl("deliveries.jsonl"),
    loadJsonl("wickets.jsonl"),
    loadJsonl("reviews.jsonl"),
    loadJsonl("replacements.jsonl"),
    loadJsonl("player_match_batting.jsonl"),
    loadJsonl("player_match_bowling.jsonl"),
    loadJsonl("player_phase_batting.jsonl"),
    loadJsonl("player_phase_bowling.jsonl")
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

async function getContext() {
  if (!contextPromise) {
    contextPromise = buildContext();
  }

  return contextPromise;
}

export function createLocalPslRepository() {
  return {
    async getManifest() {
      const context = await getContext();
      return context.manifest;
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

      return {
        team: toTeamLabel(team),
        season: season || "all",
        summary: summary ? summary.summary : null,
        recentMatches: matches.slice(0, Number(options.matchLimit) || 10),
        leaders: {
          batting: battingLeaders,
          bowling: bowlingLeaders
        },
        phaseProfile
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
      const phaseBattingRows = context.playerPhaseBatting.filter(
        (row) => row.player_id === playerId && (!season || row.season === season)
      );
      const phaseBowlingRows = context.playerPhaseBowling.filter(
        (row) => row.player_id === playerId && (!season || row.season === season)
      );

      const battingSummary =
        aggregatePlayerBattingRows(battingRows)[0]?.batting ||
        finalizeBattingTotals(createBattingAccumulator());
      const bowlingSummary =
        aggregatePlayerBowlingRows(bowlingRows)[0]?.bowling ||
        finalizeBowlingTotals(createBowlingAccumulator());

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
        batting: battingSummary,
        bowling: bowlingSummary,
        dismissalProfile,
        dismissalByBowler,
        dismissalByPhase,
        phaseProfile: {
          batting: aggregatePhaseBattingRows(phaseBattingRows),
          bowling: aggregatePhaseBowlingRows(phaseBowlingRows)
        },
        recentMatches
      };
    },

    async listMatches(options = {}) {
      const context = await getContext();
      const season = resolveSeason(options.season, context.latestSeason);
      const teamId = options.teamId || null;
      const limit = options.limit === "all" ? null : Number(options.limit) || 20;

      const matches = applyMatchFilters(context.matches, { season, teamId })
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
