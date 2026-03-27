import { getCricketRepository } from "@/lib/server/cricket-repository";
import { ok } from "@/lib/server/http";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const repository = await getCricketRepository();

  const season = searchParams.get("season") || "all";
  const teamId = searchParams.get("teamId");
  const phase = searchParams.get("phase");
  const sortBy = searchParams.get("sortBy") || "wickets";
  const minBalls = searchParams.get("minBalls") || "60";
  const limit = searchParams.get("limit") || "12";

  const leaderboard = await repository.getTopBowlers({
    season,
    teamId,
    phase,
    sortBy,
    minBalls,
    limit
  });

  return ok({
    filters: {
      season,
      teamId,
      phase,
      sortBy,
      minBalls: Number(minBalls),
      limit: Number(limit)
    },
    data: leaderboard
  });
}
