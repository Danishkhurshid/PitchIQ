import { getCricketRepository } from "@/lib/server/cricket-repository";
import { notFound, ok } from "@/lib/server/http";

export async function GET(request, { params }) {
  const { venueId } = await params;
  const { searchParams } = new URL(request.url);
  const repository = await getCricketRepository();

  const season = searchParams.get("season") || "all";
  const matchLimit = searchParams.get("matchLimit") || "10";
  const venue = await repository.getVenue(venueId, {
    season,
    matchLimit
  });

  if (!venue) {
    return notFound(`Venue ${venueId} was not found`);
  }

  return ok({
    filters: {
      season,
      matchLimit: Number(matchLimit)
    },
    data: venue
  });
}
