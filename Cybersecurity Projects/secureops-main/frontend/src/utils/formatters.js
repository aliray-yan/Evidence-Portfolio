export function titleize(value) {
  return String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDate(value) {
  if (!value) return 'Never';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function numberCompact(value) {
  return new Intl.NumberFormat(undefined, { notation: 'compact' }).format(value ?? 0);
}

export function percent(value) {
  return `${Math.round(value ?? 0)}%`;
}
