export function tokenize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function hashToken(token) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

export function fakeEmbedding(text = "", dimensions = 24) {
  const vector = new Array(dimensions).fill(0);
  const tokens = tokenize(text);
  tokens.forEach((token, position) => {
    const hash = hashToken(token);
    const index = hash % dimensions;
    const direction = hash % 2 === 0 ? 1 : -1;
    vector[index] += direction * (1 + Math.min(token.length / 12, 1));
    vector[(index + position) % dimensions] += 0.2;
  });
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(4)));
}

export function chunkText(text, chunkSize = 700, overlap = 100) {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const chunks = [];
  const overlapWords = Math.floor(Math.min(overlap, chunkSize * 0.5) / 6);
  let start = 0;

  while (start < words.length) {
    let end = start;
    let length = 0;
    while (end < words.length && length + words[end].length + 1 <= chunkSize) {
      length += words[end].length + 1;
      end += 1;
    }
    if (end === start) end += 1;
    const content = words.slice(start, end).join(" ");
    chunks.push({
      chunkIndex: chunks.length,
      content,
      tokenEstimate: Math.ceil(content.length / 4),
      metadata: { startWord: start, endWord: end, chunkSize, overlap },
      vector: fakeEmbedding(content)
    });
    if (end >= words.length) break;
    start = Math.max(start + 1, end - overlapWords);
  }
  return chunks;
}

function cosineSimilarity(a = [], b = []) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    dot += a[index] * b[index];
    magA += a[index] ** 2;
    magB += b[index] ** 2;
  }
  return dot / ((Math.sqrt(magA) || 1) * (Math.sqrt(magB) || 1));
}

function keywordOverlap(question, content) {
  const query = new Set(tokenize(question));
  const body = new Set(tokenize(content));
  if (!query.size) return 0;
  return [...query].filter((token) => body.has(token)).length / query.size;
}

export function localRetrieve(question, chunks, topK = 4) {
  const queryVector = fakeEmbedding(question);
  return chunks
    .map((chunk) => {
      const vectorScore = cosineSimilarity(queryVector, chunk.vector);
      const keywordScore = keywordOverlap(question, chunk.content);
      return {
        ...chunk,
        score: Number((vectorScore * 0.7 + keywordScore * 0.3).toFixed(4)),
        vectorScore: Number(vectorScore.toFixed(4)),
        keywordScore: Number(keywordScore.toFixed(4))
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function localAnswer(question, chunks) {
  const retrieved = localRetrieve(question, chunks);
  const strong = retrieved.filter((chunk) => chunk.score > 0.12);
  if (!strong.length) {
    return {
      answer: "I don't know based on the provided context.",
      retrieved,
      confidence: 0
    };
  }

  return {
    answer: `Based on the retrieved chunks, "${question}" is answered by: ${strong
      .slice(0, 2)
      .map((chunk) => chunk.content.split(/(?<=[.!?])\s+/).slice(0, 2).join(" "))
      .join(" ")}\n\nSources: ${strong.map((chunk) => `[chunk ${chunk.chunkIndex + 1}]`).join(", ")}`,
    retrieved,
    confidence: Math.max(...strong.map((chunk) => chunk.score))
  };
}
