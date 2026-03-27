import { getCricketRepository } from "@/lib/server/cricket-repository";
import { ok } from "@/lib/server/http";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const repository = await getCricketRepository();

  const season = searchParams.get("season") || "all";
  const teamId = searchParams.get("teamId");
  const limit = searchParams.get("limit") || "all";

  const matches = await repository.listMatches({
    season,
    teamId,
    limit
  });

  return ok({
    filters: {
      season,
      teamId,
      limit: limit === "all" ? "all" : Number(limit)
    },
    data: matches
  });
}
