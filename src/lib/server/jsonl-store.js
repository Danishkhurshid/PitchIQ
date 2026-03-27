import { readFile } from "node:fs/promises";
import path from "node:path";

const dataRoot = path.join(process.cwd(), "derived", "psl");
const textCache = new Map();

async function readCachedText(fileName) {
  if (!textCache.has(fileName)) {
    const filePath = path.join(dataRoot, fileName);
    textCache.set(fileName, readFile(filePath, "utf8"));
  }

  return textCache.get(fileName);
}

export async function loadJsonl(fileName) {
  const contents = await readCachedText(fileName);
  return contents
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export async function loadManifest() {
  const contents = await readCachedText("manifest.json");
  return JSON.parse(contents);
}
