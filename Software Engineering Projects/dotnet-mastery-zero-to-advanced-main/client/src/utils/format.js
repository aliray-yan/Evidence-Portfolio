export function percent(completed, total) {
  if (!total) return 0;
  return Math.round((completed / total) * 100);
}

export function shortDate(value) {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function initials(name = "DM") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
