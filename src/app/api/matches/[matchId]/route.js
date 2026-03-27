import { getCricketRepository } from "@/lib/server/cricket-repository";
import { notFound, ok } from "@/lib/server/http";

export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const repository = await getCricketRepository();
  const { matchId } = await params;

  const includeDeliveries = searchParams.get("includeDeliveries") === "true";
  const match = await repository.getMatch(matchId, {
    includeDeliveries
  });

  if (!match) {
    return notFound(`No match found for '${matchId}'.`);
  }

  return ok({
    filters: {
      includeDeliveries
    },
    data: match
  });
}
