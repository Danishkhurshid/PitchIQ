export function buildPath(pathname, query = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "" || value === "all") {
      continue;
    }

    params.set(key, String(value));
  }

  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}
