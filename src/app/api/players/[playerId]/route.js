import { getCricketRepository } from "@/lib/server/cricket-repository";
import { notFound, ok } from "@/lib/server/http";

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const repository = await getCricketRepository();
  const { playerId } = await params;

  const season = searchParams.get("season") || "all";
  const matchLimit = searchParams.get("matchLimit") || "10";
  const player = await repository.getPlayer(playerId, {
    season,
    matchLimit
  });

  if (!player) {
    return notFound(`No player found for '${playerId}'.`);
  }

  return ok({
    filters: {
      season,
      matchLimit: Number(matchLimit)
    },
    data: player
  });
}
