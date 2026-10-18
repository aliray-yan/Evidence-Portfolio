function hashToken(token) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function tokenize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

export function fakeEmbedding(text = "", dimensions = 24) {
  const vector = new Array(dimensions).fill(0);
  const tokens = tokenize(text);

  tokens.forEach((token, position) => {
    const hash = hashToken(token);
    const index = hash % dimensions;
    const direction = hash % 2 === 0 ? 1 : -1;
    const weight = 1 + Math.min(token.length / 12, 1);
    vector[index] += direction * weight;
    vector[(index + position) % dimensions] += weight * 0.2;
  });

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(4)));
}

export function cosineSimilarity(a = [], b = []) {
  const length = Math.min(a.length, b.length);
  if (!length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let index = 0; index < length; index += 1) {
    dot += Number(a[index]) * Number(b[index]);
    magA += Number(a[index]) ** 2;
    magB += Number(b[index]) ** 2;
  }

  return dot / ((Math.sqrt(magA) || 1) * (Math.sqrt(magB) || 1));
}

export function keywordOverlapScore(query = "", content = "") {
  const queryTokens = new Set(tokenize(query));
  if (!queryTokens.size) return 0;
  const contentTokens = new Set(tokenize(content));
  const matches = [...queryTokens].filter((token) => contentTokens.has(token)).length;
  return matches / queryTokens.size;
}
