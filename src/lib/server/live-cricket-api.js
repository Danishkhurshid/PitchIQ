/**
 * Live cricket data fetcher — powered by cricketdata.org (CricAPI)
 *
 * Sign up at https://cricketdata.org for a free API key, then add:
 *   CRICKET_API_KEY=your_key_here
 * to your .env.local file.
 *
 * Free tier: 100 calls/day. We cache with Next.js revalidate=60  
 * so the page silently refreshes every 60 s without busting the quota.
 */

const API_BASE = "https://api.cricapi.com/v1";

// Map league identifiers → search terms that appear in CricAPI match names
const LEAGUE_KEYWORDS = {
  psl: ["pakistan super league", "psl"],
  ipl: ["indian premier league", "ipl"],
  bbl: ["big bash league", "bbl"],
  cpl: ["caribbean premier league", "cpl"],
  sa20: ["sa20", "betway sa20"],
};

/**
 * Normalise a raw CricAPI match entry into the shape expected by
 * LiveMatchHero and LiveEventFeed.
 */
function normaliseLiveMatch(raw) {
  const scores = Array.isArray(raw.score) ? raw.score : [];

  const innings = scores.map((s, i) => {
    // CricAPI inning label format: "Teams Name Inning 1"
    const teamName = s.inning
      ? s.inning.replace(/ Inning \d+$/i, "").trim()
      : (raw.teams?.[i] ?? "Team");

    return {
      number: i + 1,
      battingTeam: { name: teamName },
      runs: s.r ?? 0,
      wickets: s.w ?? 0,
      overs: s.o ?? 0,
      // Ball-by-ball is not available on free currentMatches endpoint
      lastBalls: [],
    };
  });

  if (innings.length === 0) return null;

  const currentInnings = innings[innings.length - 1];

  const statusLower = (raw.status ?? "").toLowerCase();
  const isComplete =
    raw.ms === "result" ||
    statusLower.includes("won") ||
    statusLower.includes("tied") ||
    statusLower.includes("no result");

  return {
    match: {
      id: raw.id,
      name: raw.name,
      teams: {
        home: { name: raw.teams?.[0] ?? "-" },
        away: { name: raw.teams?.[1] ?? "-" },
      },
      matchDate: raw.date,
      venue: raw.venue,
      result: { label: raw.status ?? "" },
    },
    isComplete,
    resultLabel: raw.status ?? null,
    innings,
    currentInnings,
    // Feed events — empty for now; a second API call to match_info would 
    // give wicket events, but that doubles our daily quota usage.
    events: [],
  };
}

/**
 * Fetch the current live/recent match for the given league.
 *
 * Returns null if:
 *  - No API key is configured
 *  - The API call fails
 *  - No match for this league is currently listed
 */
export async function fetchLiveMatch(league = "psl") {
  const apiKey = process.env.CRICKET_API_KEY;

  if (!apiKey || apiKey === "your_api_key_here") {
    console.warn(
      "[PitchIQ] CRICKET_API_KEY is not set. " +
        "Add it to .env.local to enable live match data."
    );
    return null;
  }

  try {
    const res = await fetch(
      `${API_BASE}/currentMatches?apikey=${apiKey}&offset=0`,
      // Cache this response and revalidate every 60 s (Next.js data cache)
      { next: { revalidate: 60 } }
    );

    if (!res.ok) {
      console.error(`[PitchIQ] CricAPI responded with status ${res.status}`);
      return null;
    }

    const json = await res.json();

    if (json.status !== "success" || !Array.isArray(json.data)) {
      console.error("[PitchIQ] CricAPI unexpected response:", json);
      return null;
    }

    const keywords = LEAGUE_KEYWORDS[league.toLowerCase()] ?? [league.toLowerCase()];

    // Find first match where the name contains any of the league keywords
    const rawMatch = json.data.find((m) => {
      const searchIn = [m.name, m.series, m.t2?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return keywords.some((kw) => searchIn.includes(kw));
    });

    if (!rawMatch) {
      // No live match found for this league right now
      return null;
    }

    return normaliseLiveMatch(rawMatch);
  } catch (err) {
    console.error("[PitchIQ] Failed to fetch live match:", err);
    return null;
  }
}
