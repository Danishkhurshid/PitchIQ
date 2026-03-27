import { getCricketRepository } from "@/lib/server/cricket-repository";
import { ok } from "@/lib/server/http";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const repository = await getCricketRepository();

  const season = searchParams.get("season") || "all";
  const venues = await repository.listVenues({
    season
  });

  return ok({
    filters: {
      season
    },
    data: venues
  });
}
