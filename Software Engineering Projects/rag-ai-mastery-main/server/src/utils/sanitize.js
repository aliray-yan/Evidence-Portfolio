export function sanitizeFilename(filename = "document.txt") {
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return cleaned || "document.txt";
}

export function normalizeText(text = "") {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
