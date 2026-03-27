import { getCricketRepository } from "@/lib/server/cricket-repository";
import { ok } from "@/lib/server/http";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const repository = await getCricketRepository();

  const season = searchParams.get("season") || "all";
  const teamId = searchParams.get("teamId");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") || "runs";
  const limit = searchParams.get("limit") || "all";

  const players = await repository.listPlayers({
    season,
    teamId,
    search,
    sort,
    limit
  });

  return ok({
    filters: {
      season,
      teamId,
      search,
      sort,
      limit: limit === "all" ? "all" : Number(limit)
    },
    data: players
  });
}
