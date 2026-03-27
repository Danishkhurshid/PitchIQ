export function normalizeSeasonParam(value, seasons) {
  if (!value || value === "all") {
    return "all";
  }

  return seasons.includes(value) ? value : "all";
}

export function seasonLabel(value) {
  return value === "all" ? "All seasons" : value;
}

export function orderedSeasons(seasons) {
  return [...seasons].reverse();
}
