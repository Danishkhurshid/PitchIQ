#!/usr/bin/env python3
"""Normalize raw PSL Cricsheet JSON from a league-scoped raw folder into JSONL outputs."""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BOWLER_WICKET_KINDS = {
    "bowled",
    "caught",
    "caught and bowled",
    "hit wicket",
    "lbw",
    "stumped",
}

NON_DISMISSAL_KINDS = {
    "retired hurt",
}


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", normalized.lower()).strip("-")
    return slug or "unknown"


def team_id(name: str | None) -> str | None:
    return slugify(name) if name else None


def venue_id(venue_name: str | None, city: str | None) -> str | None:
    if not venue_name:
        return None
    if city:
        return slugify(f"{venue_name}-{city}")
    return slugify(venue_name)


def phase_for_over(zero_based_over: int) -> str:
    if zero_based_over <= 5:
        return "powerplay"
    if zero_based_over <= 15:
        return "middle"
    return "death"


def cricket_ball_label(one_based_over: int, ball_in_over: int) -> str:
    return f"{one_based_over}.{ball_in_over}"


def normalize_powerplay_ball(raw_value: Any) -> str | None:
    if raw_value is None:
        return None
    raw_text = str(raw_value)
    if "." not in raw_text:
        return str(raw_value)
    whole, fractional = raw_text.split(".", 1)
    return f"{int(whole) + 1}.{fractional}"


def round_rate(numerator: int, denominator: int, multiplier: int = 1) -> float | None:
    if denominator == 0:
        return None
    return round((numerator * multiplier) / denominator, 2)


def overs_from_balls(balls: int) -> float:
    return float(f"{balls // 6}.{balls % 6}")


def batting_bucket() -> dict[str, Any]:
    return {
        "matches": set(),
        "innings": set(),
        "runs": 0,
        "balls_faced": 0,
        "dismissals": 0,
        "fours": 0,
        "sixes": 0,
        "dot_balls": 0,
    }


def bowling_bucket() -> dict[str, Any]:
    return {
        "matches": set(),
        "innings": set(),
        "balls_bowled": 0,
        "runs_conceded": 0,
        "wickets": 0,
        "dot_balls": 0,
    }


def add_match_innings(bucket: dict[str, Any], match_id: int, innings_number: int) -> None:
    bucket["matches"].add(match_id)
    bucket["innings"].add((match_id, innings_number))


def batting_row(base: dict[str, Any], bucket: dict[str, Any]) -> dict[str, Any]:
    runs = bucket["runs"]
    balls = bucket["balls_faced"]
    dismissals = bucket["dismissals"]
    boundary_balls = bucket["fours"] + bucket["sixes"]
    row = dict(base)
    row.update(
        {
            "matches": len(bucket["matches"]),
            "innings": len(bucket["innings"]),
            "runs": runs,
            "balls_faced": balls,
            "dismissals": dismissals,
            "fours": bucket["fours"],
            "sixes": bucket["sixes"],
            "dot_balls": bucket["dot_balls"],
            "strike_rate": round_rate(runs, balls, 100),
            "batting_average": round_rate(runs, dismissals),
            "dot_ball_pct": round_rate(bucket["dot_balls"], balls, 100),
            "boundary_ball_pct": round_rate(boundary_balls, balls, 100),
        }
    )
    return row


def bowling_row(base: dict[str, Any], bucket: dict[str, Any]) -> dict[str, Any]:
    balls = bucket["balls_bowled"]
    runs = bucket["runs_conceded"]
    wickets = bucket["wickets"]
    row = dict(base)
    row.update(
        {
            "matches": len(bucket["matches"]),
            "innings": len(bucket["innings"]),
            "balls_bowled": balls,
            "runs_conceded": runs,
            "wickets": wickets,
            "dot_balls": bucket["dot_balls"],
            "economy": round_rate(runs, balls, 6),
            "bowling_average": round_rate(runs, wickets),
            "bowling_strike_rate": round_rate(balls, wickets),
            "dot_ball_pct": round_rate(bucket["dot_balls"], balls, 100),
        }
    )
    return row


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="ascii") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=True, sort_keys=True))
            handle.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input-dir",
        default="data/psl/raw",
        help="Directory containing raw Cricsheet PSL JSON files.",
    )
    parser.add_argument(
        "--output-dir",
        default="derived/psl",
        help="Directory where normalized JSONL outputs should be written.",
    )
    args = parser.parse_args()

    input_dir = Path(args.input_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    match_files = sorted(
        path for path in input_dir.glob("*.json") if path.stem.isdigit()
    )
    if not match_files:
        raise SystemExit(f"No numeric JSON files found in {input_dir}")

    teams: dict[str, dict[str, Any]] = {}
    players: dict[str, dict[str, Any]] = {}
    venues: dict[str, dict[str, Any]] = {}
    match_players: dict[tuple[int, str], dict[str, Any]] = {}

    matches_rows: list[dict[str, Any]] = []
    innings_rows: list[dict[str, Any]] = []
    deliveries_rows: list[dict[str, Any]] = []
    wickets_rows: list[dict[str, Any]] = []
    reviews_rows: list[dict[str, Any]] = []
    replacements_rows: list[dict[str, Any]] = []
    powerplays_rows: list[dict[str, Any]] = []

    player_match_batting_buckets: dict[tuple[int, str, str, str | None, str], dict[str, Any]] = defaultdict(
        batting_bucket
    )
    player_match_bowling_buckets: dict[tuple[int, str, str, str | None, str], dict[str, Any]] = defaultdict(
        bowling_bucket
    )
    player_phase_batting_buckets: dict[tuple[str, str, str, str], dict[str, Any]] = defaultdict(
        batting_bucket
    )
    player_phase_bowling_buckets: dict[tuple[str, str, str, str], dict[str, Any]] = defaultdict(
        bowling_bucket
    )

    seasons: set[str] = set()
    match_dates: list[str] = []

    def ensure_team(name: str | None) -> str | None:
        if not name:
            return None
        current_team_id = team_id(name)
        if current_team_id not in teams:
            teams[current_team_id] = {
                "team_id": current_team_id,
                "team_name": name,
                "slug": slugify(name),
                "short_name": None,
            }
        return current_team_id

    def ensure_player(name: str, registry_people: dict[str, str]) -> str:
        cricsheet_id = registry_people.get(name)
        player_key = cricsheet_id or f"alias:{slugify(name)}"
        if player_key not in players:
            players[player_key] = {
                "player_id": player_key,
                "cricsheet_id": cricsheet_id,
                "canonical_name": name,
                "slug": slugify(name),
                "source": "cricsheet_registry" if cricsheet_id else "derived_alias",
                "aliases": {name},
                "metadata": {},
            }
        else:
            players[player_key]["aliases"].add(name)
            if not players[player_key]["cricsheet_id"] and cricsheet_id:
                players[player_key]["cricsheet_id"] = cricsheet_id
                players[player_key]["source"] = "cricsheet_registry"
        return player_key

    def mark_match_player(
        match_id: int,
        player_id: str,
        team_value: str,
        *,
        playing_xi: bool = False,
        replacement_in: bool = False,
        replacement_out: bool = False,
    ) -> None:
        key = (match_id, player_id)
        if key not in match_players:
            match_players[key] = {
                "match_id": match_id,
                "player_id": player_id,
                "team_id": team_value,
                "is_playing_xi": False,
                "is_replacement_in": False,
                "is_replacement_out": False,
            }
        row = match_players[key]
        row["team_id"] = team_value
        row["is_playing_xi"] = row["is_playing_xi"] or playing_xi
        row["is_replacement_in"] = row["is_replacement_in"] or replacement_in
        row["is_replacement_out"] = row["is_replacement_out"] or replacement_out

    for match_file in match_files:
        match_id_value = int(match_file.stem)
        payload = json.loads(match_file.read_text(encoding="utf-8"))
        info = payload["info"]
        registry_people = info.get("registry", {}).get("people", {})
        competition = "PSL"
        season = str(info.get("season"))
        seasons.add(season)
        match_date = info["dates"][0]
        match_dates.append(match_date)

        team_names = info.get("teams", [])
        team_ids = [ensure_team(name) for name in team_names]
        players_by_team = info.get("players", {})

        for team_name, team_roster in players_by_team.items():
            current_team_id = ensure_team(team_name)
            for player_name in team_roster:
                player_key = ensure_player(player_name, registry_people)
                mark_match_player(match_id_value, player_key, current_team_id, playing_xi=True)

        player_of_match_names = info.get("player_of_match", [])
        player_of_match_ids = [ensure_player(name, registry_people) for name in player_of_match_names]

        current_venue_id = venue_id(info.get("venue"), info.get("city"))
        if current_venue_id:
            venues[current_venue_id] = {
                "venue_id": current_venue_id,
                "venue_name": info.get("venue"),
                "city": info.get("city"),
                "slug": current_venue_id,
                "metadata": {},
            }

        outcome = info.get("outcome", {})
        winner_team_id = ensure_team(outcome.get("winner"))
        eliminator_team_id = ensure_team(outcome.get("eliminator"))
        result_type = None
        result_margin = None
        if "by" in outcome:
            if "runs" in outcome["by"]:
                result_type = "runs"
                result_margin = int(outcome["by"]["runs"])
            elif "wickets" in outcome["by"]:
                result_type = "wickets"
                result_margin = int(outcome["by"]["wickets"])
        elif "result" in outcome:
            result_type = str(outcome["result"])

        toss = info.get("toss", {})

        matches_rows.append(
            {
                "match_id": match_id_value,
                "source": "cricsheet",
                "source_file": match_file.name,
                "competition": competition,
                "event_name": info.get("event", {}).get("name"),
                "event_stage": info.get("event", {}).get("stage"),
                "season": season,
                "match_date": match_date,
                "match_type": info.get("match_type"),
                "gender": info.get("gender"),
                "team_type": info.get("team_type"),
                "balls_per_over": int(info.get("balls_per_over", 6)),
                "overs_limit": info.get("overs"),
                "city": info.get("city"),
                "venue_id": current_venue_id,
                "team_1_id": team_ids[0] if len(team_ids) >= 1 else None,
                "team_2_id": team_ids[1] if len(team_ids) >= 2 else None,
                "toss_winner_team_id": ensure_team(toss.get("winner")),
                "toss_decision": toss.get("decision"),
                "winner_team_id": winner_team_id,
                "eliminator_team_id": eliminator_team_id,
                "result_type": result_type,
                "result_margin": result_margin,
                "result_label": outcome.get("result"),
                "method": outcome.get("method"),
                "player_of_match_ids": player_of_match_ids,
                "player_of_match_names": player_of_match_names,
                "umpires": info.get("officials", {}).get("umpires", []),
                "tv_umpires": info.get("officials", {}).get("tv_umpires", []),
                "reserve_umpires": info.get("officials", {}).get("reserve_umpires", []),
                "match_referees": info.get("officials", {}).get("match_referees", []),
                "raw_outcome": outcome,
            }
        )

        for innings_number, innings in enumerate(payload.get("innings", []), start=1):
            batting_team_name = innings.get("team")
            batting_team_id = ensure_team(batting_team_name)
            bowling_team_id = None
            for possible_team_id in team_ids:
                if possible_team_id and possible_team_id != batting_team_id:
                    bowling_team_id = possible_team_id
                    break

            target = innings.get("target", {})
            innings_runs = 0
            innings_wickets = 0
            legal_balls = 0
            innings_ball_index = 0

            for powerplay in innings.get("powerplays", []):
                powerplays_rows.append(
                    {
                        "match_id": match_id_value,
                        "innings_number": innings_number,
                        "batting_team_id": batting_team_id,
                        "powerplay_type": powerplay.get("type"),
                        "from_ball": normalize_powerplay_ball(powerplay.get("from")),
                        "to_ball": normalize_powerplay_ball(powerplay.get("to")),
                    }
                )

            def emit_replacements(
                replacements_payload: dict[str, Any],
                *,
                current_innings_number: int,
                current_over_number: int,
                current_ball_in_over: int,
                current_ball_label: str,
                current_innings_ball_index: int,
            ) -> int:
                replacement_count = 0
                for replacement_scope, replacement_items in replacements_payload.items():
                    for replacement in replacement_items:
                        replacement_count += 1
                        replacement_team_id = ensure_team(replacement.get("team"))
                        player_in_id = None
                        player_out_id = None
                        if replacement.get("in"):
                            player_in_id = ensure_player(replacement["in"], registry_people)
                            if replacement_team_id:
                                mark_match_player(
                                    match_id_value,
                                    player_in_id,
                                    replacement_team_id,
                                    replacement_in=True,
                                )
                        if replacement.get("out"):
                            player_out_id = ensure_player(replacement["out"], registry_people)
                            if replacement_team_id:
                                mark_match_player(
                                    match_id_value,
                                    player_out_id,
                                    replacement_team_id,
                                    replacement_out=True,
                                )
                        replacements_rows.append(
                            {
                                "match_id": match_id_value,
                                "innings_number": current_innings_number,
                                "innings_ball_index": current_innings_ball_index,
                                "replacement_scope": replacement_scope,
                                "team_id": replacement_team_id,
                                "over_number": current_over_number,
                                "ball_in_over": current_ball_in_over,
                                "ball_label": current_ball_label,
                                "player_in_id": player_in_id,
                                "player_out_id": player_out_id,
                                "replacement_reason": replacement.get("reason"),
                                "raw_payload": replacement,
                            }
                        )
                return replacement_count

            innings_replacements = innings.get("replacements", {})
            if innings_replacements:
                emit_replacements(
                    innings_replacements,
                    current_innings_number=innings_number,
                    current_over_number=0,
                    current_ball_in_over=0,
                    current_ball_label="0.0",
                    current_innings_ball_index=0,
                )

            for over in innings.get("overs", []):
                zero_based_over = int(over["over"])
                one_based_over = zero_based_over + 1
                phase = phase_for_over(zero_based_over)
                for ball_in_over, delivery in enumerate(over.get("deliveries", []), start=1):
                    innings_ball_index += 1
                    ball_label = cricket_ball_label(one_based_over, ball_in_over)

                    batter_id = ensure_player(delivery["batter"], registry_people)
                    non_striker_id = ensure_player(delivery["non_striker"], registry_people)
                    bowler_id = ensure_player(delivery["bowler"], registry_people)

                    if batting_team_id:
                        mark_match_player(match_id_value, batter_id, batting_team_id)
                        mark_match_player(match_id_value, non_striker_id, batting_team_id)
                    if bowling_team_id:
                        mark_match_player(match_id_value, bowler_id, bowling_team_id)

                    extras = delivery.get("extras", {})
                    runs = delivery.get("runs", {})
                    batter_runs = int(runs.get("batter", 0))
                    extras_runs = int(runs.get("extras", 0))
                    total_runs = int(runs.get("total", 0))
                    wides = int(extras.get("wides", 0))
                    noballs = int(extras.get("noballs", 0))
                    byes = int(extras.get("byes", 0))
                    legbyes = int(extras.get("legbyes", 0))
                    penalty_runs = int(extras.get("penalty", 0))
                    is_legal_ball = wides == 0 and noballs == 0
                    is_dot_ball = total_runs == 0
                    is_boundary = batter_runs in (4, 6)

                    if is_legal_ball:
                        legal_balls += 1
                    innings_runs += total_runs

                    wickets = delivery.get("wickets", [])
                    review_payload = delivery.get("review")
                    replacement_count = 0
                    if delivery.get("replacements"):
                        replacement_count = emit_replacements(
                            delivery["replacements"],
                            current_innings_number=innings_number,
                            current_over_number=one_based_over,
                            current_ball_in_over=ball_in_over,
                            current_ball_label=ball_label,
                            current_innings_ball_index=innings_ball_index,
                        )

                    deliveries_rows.append(
                        {
                            "match_id": match_id_value,
                            "innings_number": innings_number,
                            "innings_ball_index": innings_ball_index,
                            "batting_team_id": batting_team_id,
                            "bowling_team_id": bowling_team_id,
                            "over_number": one_based_over,
                            "ball_in_over": ball_in_over,
                            "ball_label": ball_label,
                            "phase": phase,
                            "striker_player_id": batter_id,
                            "non_striker_player_id": non_striker_id,
                            "bowler_player_id": bowler_id,
                            "batter_runs": batter_runs,
                            "extras_runs": extras_runs,
                            "total_runs": total_runs,
                            "wides": wides,
                            "noballs": noballs,
                            "byes": byes,
                            "legbyes": legbyes,
                            "penalty_runs": penalty_runs,
                            "is_legal_ball": is_legal_ball,
                            "is_boundary": is_boundary,
                            "is_dot_ball": is_dot_ball,
                            "wicket_count": len(wickets),
                            "review_count": 1 if review_payload else 0,
                            "replacement_count": replacement_count,
                            "raw_payload": delivery,
                        }
                    )

                    batting_match_key = (
                        match_id_value,
                        batter_id,
                        batting_team_id,
                        bowling_team_id,
                        season,
                    )
                    batting_phase_key = (
                        batter_id,
                        batting_team_id,
                        season,
                        phase,
                    )
                    add_match_innings(
                        player_match_batting_buckets[batting_match_key],
                        match_id_value,
                        innings_number,
                    )
                    add_match_innings(
                        player_phase_batting_buckets[batting_phase_key],
                        match_id_value,
                        innings_number,
                    )
                    player_match_batting_buckets[batting_match_key]["runs"] += batter_runs
                    player_phase_batting_buckets[batting_phase_key]["runs"] += batter_runs
                    if wides == 0:
                        player_match_batting_buckets[batting_match_key]["balls_faced"] += 1
                        player_phase_batting_buckets[batting_phase_key]["balls_faced"] += 1
                    if batter_runs == 4:
                        player_match_batting_buckets[batting_match_key]["fours"] += 1
                        player_phase_batting_buckets[batting_phase_key]["fours"] += 1
                    if batter_runs == 6:
                        player_match_batting_buckets[batting_match_key]["sixes"] += 1
                        player_phase_batting_buckets[batting_phase_key]["sixes"] += 1
                    if is_dot_ball:
                        player_match_batting_buckets[batting_match_key]["dot_balls"] += 1
                        player_phase_batting_buckets[batting_phase_key]["dot_balls"] += 1

                    bowling_match_key = (
                        match_id_value,
                        bowler_id,
                        bowling_team_id,
                        batting_team_id,
                        season,
                    )
                    bowling_phase_key = (
                        bowler_id,
                        bowling_team_id,
                        season,
                        phase,
                    )
                    add_match_innings(
                        player_match_bowling_buckets[bowling_match_key],
                        match_id_value,
                        innings_number,
                    )
                    add_match_innings(
                        player_phase_bowling_buckets[bowling_phase_key],
                        match_id_value,
                        innings_number,
                    )
                    if is_legal_ball:
                        player_match_bowling_buckets[bowling_match_key]["balls_bowled"] += 1
                        player_phase_bowling_buckets[bowling_phase_key]["balls_bowled"] += 1
                    bowler_runs_conceded = batter_runs + wides + noballs
                    player_match_bowling_buckets[bowling_match_key]["runs_conceded"] += bowler_runs_conceded
                    player_phase_bowling_buckets[bowling_phase_key]["runs_conceded"] += bowler_runs_conceded
                    if is_dot_ball:
                        player_match_bowling_buckets[bowling_match_key]["dot_balls"] += 1
                        player_phase_bowling_buckets[bowling_phase_key]["dot_balls"] += 1

                    for wicket in wickets:
                        player_out_id = ensure_player(wicket["player_out"], registry_people)
                        if batting_team_id:
                            mark_match_player(match_id_value, player_out_id, batting_team_id)

                        fielder_ids: list[str] = []
                        fielder_names: list[str] = []
                        for fielder in wicket.get("fielders", []):
                            fielder_name = fielder["name"]
                            fielder_id = ensure_player(fielder_name, registry_people)
                            if bowling_team_id:
                                mark_match_player(match_id_value, fielder_id, bowling_team_id)
                            fielder_ids.append(fielder_id)
                            fielder_names.append(fielder_name)

                        dismissal_kind = wicket.get("kind")
                        counts_as_dismissal = dismissal_kind not in NON_DISMISSAL_KINDS
                        credited_to_bowler = dismissal_kind in BOWLER_WICKET_KINDS
                        if counts_as_dismissal:
                            innings_wickets += 1
                            dismissed_match_key = (
                                match_id_value,
                                player_out_id,
                                batting_team_id,
                                bowling_team_id,
                                season,
                            )
                            dismissed_phase_key = (
                                player_out_id,
                                batting_team_id,
                                season,
                                phase,
                            )
                            add_match_innings(
                                player_match_batting_buckets[dismissed_match_key],
                                match_id_value,
                                innings_number,
                            )
                            add_match_innings(
                                player_phase_batting_buckets[dismissed_phase_key],
                                match_id_value,
                                innings_number,
                            )
                            player_match_batting_buckets[dismissed_match_key]["dismissals"] += 1
                            player_phase_batting_buckets[dismissed_phase_key]["dismissals"] += 1
                        if credited_to_bowler:
                            player_match_bowling_buckets[bowling_match_key]["wickets"] += 1
                            player_phase_bowling_buckets[bowling_phase_key]["wickets"] += 1

                        wickets_rows.append(
                            {
                                "match_id": match_id_value,
                                "innings_number": innings_number,
                                "innings_ball_index": innings_ball_index,
                                "batting_team_id": batting_team_id,
                                "bowling_team_id": bowling_team_id,
                                "over_number": one_based_over,
                                "ball_in_over": ball_in_over,
                                "ball_label": ball_label,
                                "player_out_id": player_out_id,
                                "dismissal_kind": dismissal_kind,
                                "counts_as_dismissal": counts_as_dismissal,
                                "credited_to_bowler": credited_to_bowler,
                                "bowler_player_id": bowler_id,
                                "fielder_ids": fielder_ids,
                                "fielder_names": fielder_names,
                                "raw_payload": wicket,
                            }
                        )

                    if review_payload:
                        batter_player_id = None
                        if review_payload.get("batter"):
                            batter_player_id = ensure_player(review_payload["batter"], registry_people)
                            if batting_team_id:
                                mark_match_player(match_id_value, batter_player_id, batting_team_id)
                        reviews_rows.append(
                            {
                                "match_id": match_id_value,
                                "innings_number": innings_number,
                                "innings_ball_index": innings_ball_index,
                                "team_id": ensure_team(review_payload.get("by")),
                                "over_number": one_based_over,
                                "ball_in_over": ball_in_over,
                                "ball_label": ball_label,
                                "review_type": review_payload.get("type"),
                                "decision": review_payload.get("decision"),
                                "umpire": review_payload.get("umpire"),
                                "batter_player_id": batter_player_id,
                                "umpires_call": review_payload.get("umpires_call"),
                                "raw_payload": review_payload,
                            }
                        )

            innings_rows.append(
                {
                    "match_id": match_id_value,
                    "innings_number": innings_number,
                    "batting_team_id": batting_team_id,
                    "bowling_team_id": bowling_team_id,
                    "target_runs": target.get("runs"),
                    "target_overs": target.get("overs"),
                    "total_runs": innings_runs,
                    "total_wickets": innings_wickets,
                    "legal_balls": legal_balls,
                    "overs_bowled": overs_from_balls(legal_balls),
                }
            )

    teams_rows = sorted(teams.values(), key=lambda row: row["team_name"])
    players_rows = []
    for row in players.values():
        players_rows.append(
            {
                "player_id": row["player_id"],
                "cricsheet_id": row["cricsheet_id"],
                "canonical_name": row["canonical_name"],
                "slug": row["slug"],
                "source": row["source"],
                "aliases": sorted(row["aliases"]),
                "metadata": row["metadata"],
            }
        )
    players_rows.sort(key=lambda row: row["canonical_name"])
    venues_rows = sorted(venues.values(), key=lambda row: row["venue_name"])
    matches_rows.sort(key=lambda row: row["match_id"])
    innings_rows.sort(key=lambda row: (row["match_id"], row["innings_number"]))
    deliveries_rows.sort(
        key=lambda row: (row["match_id"], row["innings_number"], row["innings_ball_index"])
    )
    wickets_rows.sort(
        key=lambda row: (row["match_id"], row["innings_number"], row["innings_ball_index"])
    )
    reviews_rows.sort(
        key=lambda row: (row["match_id"], row["innings_number"], row["innings_ball_index"])
    )
    replacements_rows.sort(
        key=lambda row: (row["match_id"], row["innings_number"], row["innings_ball_index"])
    )
    powerplays_rows.sort(key=lambda row: (row["match_id"], row["innings_number"], row["from_ball"]))

    match_players_rows = sorted(
        match_players.values(),
        key=lambda row: (row["match_id"], row["team_id"], row["player_id"]),
    )

    player_match_batting_rows = []
    for key, bucket in player_match_batting_buckets.items():
        match_id_value, player_id_value, team_value, opposition_team_id, season = key
        player_match_batting_rows.append(
            batting_row(
                {
                    "match_id": match_id_value,
                    "player_id": player_id_value,
                    "team_id": team_value,
                    "opposition_team_id": opposition_team_id,
                    "season": season,
                },
                bucket,
            )
        )
    player_match_batting_rows.sort(key=lambda row: (row["match_id"], row["player_id"]))

    player_match_bowling_rows = []
    for key, bucket in player_match_bowling_buckets.items():
        match_id_value, player_id_value, team_value, opposition_team_id, season = key
        player_match_bowling_rows.append(
            bowling_row(
                {
                    "match_id": match_id_value,
                    "player_id": player_id_value,
                    "team_id": team_value,
                    "opposition_team_id": opposition_team_id,
                    "season": season,
                },
                bucket,
            )
        )
    player_match_bowling_rows.sort(key=lambda row: (row["match_id"], row["player_id"]))

    player_phase_batting_rows = []
    for key, bucket in player_phase_batting_buckets.items():
        player_id_value, team_value, season, phase = key
        player_phase_batting_rows.append(
            batting_row(
                {
                    "player_id": player_id_value,
                    "team_id": team_value,
                    "season": season,
                    "phase": phase,
                },
                bucket,
            )
        )
    player_phase_batting_rows.sort(key=lambda row: (row["player_id"], row["season"], row["phase"]))

    player_phase_bowling_rows = []
    for key, bucket in player_phase_bowling_buckets.items():
        player_id_value, team_value, season, phase = key
        player_phase_bowling_rows.append(
            bowling_row(
                {
                    "player_id": player_id_value,
                    "team_id": team_value,
                    "season": season,
                    "phase": phase,
                },
                bucket,
            )
        )
    player_phase_bowling_rows.sort(key=lambda row: (row["player_id"], row["season"], row["phase"]))

    write_jsonl(output_dir / "teams.jsonl", teams_rows)
    write_jsonl(output_dir / "players.jsonl", players_rows)
    write_jsonl(output_dir / "venues.jsonl", venues_rows)
    write_jsonl(output_dir / "matches.jsonl", matches_rows)
    write_jsonl(output_dir / "match_players.jsonl", match_players_rows)
    write_jsonl(output_dir / "innings.jsonl", innings_rows)
    write_jsonl(output_dir / "powerplays.jsonl", powerplays_rows)
    write_jsonl(output_dir / "deliveries.jsonl", deliveries_rows)
    write_jsonl(output_dir / "wickets.jsonl", wickets_rows)
    write_jsonl(output_dir / "reviews.jsonl", reviews_rows)
    write_jsonl(output_dir / "replacements.jsonl", replacements_rows)
    write_jsonl(output_dir / "player_match_batting.jsonl", player_match_batting_rows)
    write_jsonl(output_dir / "player_match_bowling.jsonl", player_match_bowling_rows)
    write_jsonl(output_dir / "player_phase_batting.jsonl", player_phase_batting_rows)
    write_jsonl(output_dir / "player_phase_bowling.jsonl", player_phase_bowling_rows)

    manifest = {
        "competition": "PSL",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "input_dir": str(input_dir),
        "output_dir": str(output_dir),
        "match_file_count": len(match_files),
        "match_count": len(matches_rows),
        "team_count": len(teams_rows),
        "player_count": len(players_rows),
        "venue_count": len(venues_rows),
        "innings_count": len(innings_rows),
        "delivery_count": len(deliveries_rows),
        "wicket_event_count": len(wickets_rows),
        "review_count": len(reviews_rows),
        "replacement_count": len(replacements_rows),
        "season_count": len(seasons),
        "seasons": sorted(seasons),
        "teams": [row["team_name"] for row in teams_rows],
        "date_range": {
            "start": min(match_dates),
            "end": max(match_dates),
        },
        "files": [
            "teams.jsonl",
            "players.jsonl",
            "venues.jsonl",
            "matches.jsonl",
            "match_players.jsonl",
            "innings.jsonl",
            "powerplays.jsonl",
            "deliveries.jsonl",
            "wickets.jsonl",
            "reviews.jsonl",
            "replacements.jsonl",
            "player_match_batting.jsonl",
            "player_match_bowling.jsonl",
            "player_phase_batting.jsonl",
            "player_phase_bowling.jsonl",
        ],
    }

    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=True, sort_keys=True) + "\n",
        encoding="ascii",
    )

    print(json.dumps(manifest, indent=2, ensure_ascii=True, sort_keys=True))


if __name__ == "__main__":
    main()
