import { normalizeText } from "../utils/sanitize.js";

export function chunkText(input, options = {}) {
  const text = normalizeText(input);
  const chunkSize = Math.min(Math.max(Number(options.chunkSize || 700), 120), 2500);
  const overlap = Math.min(Math.max(Number(options.overlap || 100), 0), Math.floor(chunkSize * 0.5));
  const words = text.split(/\s+/).filter(Boolean);
  const chunks = [];
  const overlapWords = Math.floor(overlap / 6);

  let start = 0;
  while (start < words.length) {
    let end = start;
    let length = 0;

    while (end < words.length && length + words[end].length + 1 <= chunkSize) {
      length += words[end].length + 1;
      end += 1;
    }

    if (end === start) {
      end += 1;
    }

    const content = words.slice(start, end).join(" ");
    chunks.push({
      chunkIndex: chunks.length,
      content,
      tokenEstimate: Math.ceil(content.length / 4),
      metadata: {
        startWord: start,
        endWord: end,
        strategy: "word-window",
        chunkSize,
        overlap
      }
    });

    if (end >= words.length) break;
    start = Math.max(start + 1, end - overlapWords);
  }

  return chunks;
}
