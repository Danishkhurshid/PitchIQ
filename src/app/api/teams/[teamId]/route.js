import { getCricketRepository } from "@/lib/server/cricket-repository";
import { notFound, ok } from "@/lib/server/http";

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const repository = await getCricketRepository();
  const { teamId } = await params;

  const season = searchParams.get("season") || "all";
  const matchLimit = searchParams.get("matchLimit") || "10";
  const team = await repository.getTeam(teamId, {
    season,
    matchLimit
  });

  if (!team) {
    return notFound(`No team found for '${teamId}'.`);
  }

  return ok({
    filters: {
      season,
      matchLimit: Number(matchLimit)
    },
    data: team
  });
}
