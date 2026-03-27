import { createLocalPslRepository } from "@/lib/server/local-psl-repository";

let repositoryPromise;

export function getCricketRepository() {
  if (!repositoryPromise) {
    repositoryPromise = Promise.resolve(createLocalPslRepository());
  }

  return repositoryPromise;
}
