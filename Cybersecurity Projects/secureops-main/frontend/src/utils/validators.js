export function isLikelyIOC(value) {
  return /^(https?:\/\/|CVE-\d{4}-|\d{1,3}(\.\d{1,3}){3}|[a-fA-F0-9]{32,64}$|[^@\s]+@[^@\s]+\.[^@\s]+|([a-z0-9-]+\.)+[a-z]{2,})/i.test(value.trim());
}
