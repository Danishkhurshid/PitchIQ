export function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatNumber(value) {
  if (value === null || value === undefined) {
    return "0";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

export function formatMetric(value, digits = 2) {
  if (value === null || value === undefined) {
    return "NA";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return Number(value).toFixed(digits).replace(/\.00$/, "");
}

export function formatOversFromBalls(balls) {
  if (!balls) {
    return "0.0";
  }

  return `${Math.floor(balls / 6)}.${balls % 6}`;
}
