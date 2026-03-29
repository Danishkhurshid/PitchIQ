import { createLocalRepository } from "@/lib/server/local-repository";

const repositories = new Map();

export function getCricketRepository(league = "psl") {
  const normalizedLeague = league.toLowerCase();
  
  if (!repositories.has(normalizedLeague)) {
    repositories.set(normalizedLeague, Promise.resolve(createLocalRepository(normalizedLeague)));
  }

  return repositories.get(normalizedLeague);
}
