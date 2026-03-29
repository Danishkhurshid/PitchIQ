import { readFile } from "node:fs/promises";
import path from "node:path";

const textCache = new Map();

async function readCachedText(league, fileName) {
  const cacheKey = `${league}:${fileName}`;
  if (!textCache.has(cacheKey)) {
    const filePath = path.join(process.cwd(), "derived", league, fileName);
    textCache.set(cacheKey, readFile(filePath, "utf8"));
  }

  return textCache.get(cacheKey);
}

export async function loadJsonl(league, fileName) {
  const contents = await readCachedText(league, fileName);
  return contents
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function loadManifest(league) {
  const contents = await readCachedText(league, "manifest.json");
  return JSON.parse(contents);
}
