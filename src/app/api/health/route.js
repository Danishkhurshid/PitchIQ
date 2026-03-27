import { getCricketRepository } from "@/lib/server/cricket-repository";
import { ok } from "@/lib/server/http";

export async function GET() {
  const repository = await getCricketRepository();
  const manifest = await repository.getManifest();

  return ok({
    status: "ok",
    dataSource: "local-jsonl",
    competition: manifest.competition,
    matches: manifest.match_count,
    deliveries: manifest.delivery_count,
    generatedAt: manifest.generated_at
  });
}
