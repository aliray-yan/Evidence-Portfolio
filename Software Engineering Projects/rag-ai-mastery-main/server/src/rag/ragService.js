import { config } from "../config.js";
import { chunkText } from "./chunker.js";
import { cosineSimilarity, fakeEmbedding, keywordOverlapScore } from "./embeddings.js";
import { generateWithOllama, generateWithOpenAICompatible } from "./llmProviders.js";

export function prepareChunks(text, options = {}) {
  return chunkText(text, options).map((chunk) => ({
    ...chunk,
    vector: fakeEmbedding(chunk.content)
  }));
}

export function retrieveChunks(question, chunks, topK = 4) {
  const queryVector = fakeEmbedding(question);
  return chunks
    .map((chunk) => {
      const vectorScore = cosineSimilarity(queryVector, chunk.vector || fakeEmbedding(chunk.content));
      const keywordScore = keywordOverlapScore(question, chunk.content);
      const score = vectorScore * 0.7 + keywordScore * 0.3;
      return {
        id: chunk.id,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        tokenEstimate: chunk.tokenEstimate,
        metadata: chunk.metadata,
        vectorPreview: (chunk.vector || []).slice(0, 8),
        score: Number(score.toFixed(4)),
        vectorScore: Number(vectorScore.toFixed(4)),
        keywordScore: Number(keywordScore.toFixed(4))
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function buildMockAnswer(question, retrieved) {
  const strong = retrieved.filter((chunk) => chunk.score > 0.12);
  if (!strong.length) {
    return {
      answer: "I don't know based on the provided context.",
      confidence: 0
    };
  }

  const contextSentences = strong
    .slice(0, 2)
    .map((chunk) => chunk.content.split(/(?<=[.!?])\s+/).slice(0, 2).join(" "))
    .join(" ");

  return {
    answer:
      `Based on the retrieved chunks, the best supported answer to "${question}" is: ${contextSentences}` +
      `\n\nSources: ${strong.map((chunk) => `[chunk ${chunk.chunkIndex + 1}]`).join(", ")}`,
    confidence: Math.max(...strong.map((chunk) => chunk.score))
  };
}

export async function answerQuestion({ question, chunks, mode = config.ragMode, topK = 4 }) {
  const retrieved = retrieveChunks(question, chunks, topK);
  const context = retrieved.map((chunk) => `[chunk ${chunk.chunkIndex + 1}]\n${chunk.content}`).join("\n\n");
  const mock = buildMockAnswer(question, retrieved);

  if (mock.confidence === 0 || mode === "mock") {
    return { ...mock, retrieved, mode: "mock" };
  }

  try {
    if (mode === "openai") {
      const answer = await generateWithOpenAICompatible({ question, context });
      if (answer) {
        return { answer, confidence: mock.confidence, retrieved, mode: "openai" };
      }
    }

    if (mode === "ollama") {
      const answer = await generateWithOllama({ question, context });
      if (answer) {
        return { answer, confidence: mock.confidence, retrieved, mode: "ollama" };
      }
    }
  } catch (error) {
    return {
      answer: `${mock.answer}\n\nProvider fallback: ${error.message}`,
      confidence: mock.confidence,
      retrieved,
      mode: "mock"
    };
  }

  return { ...mock, retrieved, mode: "mock" };
}
