export const codeLabs = [
  {
    id: "normalize-text",
    title: "Normalize Ingested Text",
    module: "Document Ingestion",
    difficulty: "Beginner",
    estimatedMinutes: 15,
    goal: "Clean raw document text before chunking.",
    whyItMatters:
      "RAG retrieval gets worse when extracted text contains repeated spaces, messy line breaks, tabs, or invisible formatting noise.",
    instructions:
      "Write a function named normalizeText(raw). It should trim the text, convert tabs to spaces, collapse repeated spaces, normalize Windows newlines, and collapse three or more newlines into two.",
    starterCode: `function normalizeText(raw) {
  // Return clean text ready for chunking.
}`,
    tests: [
      {
        name: "trims and collapses spaces",
        functionName: "normalizeText",
        args: ["  RAG     needs    clean text.  "],
        assert: { type: "equals", expected: "RAG needs clean text." }
      },
      {
        name: "normalizes tabs and Windows newlines",
        functionName: "normalizeText",
        args: ["Line 1\r\n\tLine   2"],
        assert: { type: "equals", expected: "Line 1\n Line 2" }
      },
      {
        name: "collapses excessive blank lines",
        functionName: "normalizeText",
        args: ["A\n\n\n\nB"],
        assert: { type: "equals", expected: "A\n\nB" }
      }
    ],
    solution: `function normalizeText(raw) {
  return String(raw || "")
    .replace(/\\r\\n/g, "\\n")
    .replace(/\\t/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\\n{3,}/g, "\\n\\n")
    .trim();
}`
  },
  {
    id: "estimate-tokens",
    title: "Estimate Token Budget",
    module: "LLM Basics",
    difficulty: "Beginner",
    estimatedMinutes: 10,
    goal: "Create a rough token estimator for prompt budgeting.",
    whyItMatters:
      "Every RAG prompt has a context budget. A rough token estimate helps you avoid overloading the prompt with too many chunks.",
    instructions:
      "Write estimateTokens(text). Use the common rough estimate of one token per four characters. Return the ceiling of length divided by four.",
    starterCode: `function estimateTokens(text) {
  // Return an integer token estimate.
}`,
    tests: [
      {
        name: "empty text is zero",
        functionName: "estimateTokens",
        args: [""],
        assert: { type: "equals", expected: 0 }
      },
      {
        name: "sixteen characters is four tokens",
        functionName: "estimateTokens",
        args: ["abcdefghijklmnop"],
        assert: { type: "equals", expected: 4 }
      },
      {
        name: "rounds up",
        functionName: "estimateTokens",
        args: ["hello"],
        assert: { type: "equals", expected: 2 }
      }
    ],
    solution: `function estimateTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}`
  },
  {
    id: "chunk-with-overlap",
    title: "Chunk Text With Overlap",
    module: "Chunking",
    difficulty: "Core",
    estimatedMinutes: 25,
    goal: "Split words into focused chunks while preserving boundary context.",
    whyItMatters:
      "Chunking is one of the highest-impact RAG skills. Bad chunks cause bad retrieval, no matter how good the model is.",
    instructions:
      "Write chunkText(text, maxWords, overlapWords). Split by whitespace. Return an array of chunk strings. Each next chunk should step forward by maxWords - overlapWords. Avoid infinite loops.",
    starterCode: `function chunkText(text, maxWords, overlapWords) {
  // Return an array of chunk strings.
}`,
    tests: [
      {
        name: "creates overlapping chunks",
        functionName: "chunkText",
        args: ["one two three four five six seven", 3, 1],
        assert: { type: "deepEqual", expected: ["one two three", "three four five", "five six seven"] }
      },
      {
        name: "handles no overlap",
        functionName: "chunkText",
        args: ["a b c d", 2, 0],
        assert: { type: "deepEqual", expected: ["a b", "c d"] }
      },
      {
        name: "single short chunk",
        functionName: "chunkText",
        args: ["short doc", 10, 2],
        assert: { type: "deepEqual", expected: ["short doc"] }
      }
    ],
    solution: `function chunkText(text, maxWords, overlapWords) {
  const words = String(text || "").split(/\\s+/).filter(Boolean);
  const size = Math.max(1, Number(maxWords) || 1);
  const overlap = Math.max(0, Math.min(Number(overlapWords) || 0, size - 1));
  const step = size - overlap;
  const chunks = [];

  for (let start = 0; start < words.length; start += step) {
    chunks.push(words.slice(start, start + size).join(" "));
    if (start + size >= words.length) break;
  }

  return chunks;
}`
  },
  {
    id: "chunk-metadata",
    title: "Attach Chunk Metadata",
    module: "Document Processing",
    difficulty: "Beginner",
    estimatedMinutes: 15,
    goal: "Create metadata that survives from ingestion to citations.",
    whyItMatters:
      "Without metadata, a RAG answer cannot show useful sources, enforce permissions, or debug bad retrieval.",
    instructions:
      "Write makeMetadata(source, page, heading, chunkIndex). Return an object with source, page, heading, chunkIndex, and citationLabel like source#page-chunkIndex.",
    starterCode: `function makeMetadata(source, page, heading, chunkIndex) {
  // Return metadata for a chunk.
}`,
    tests: [
      {
        name: "creates citation-ready metadata",
        functionName: "makeMetadata",
        args: ["policy.md", 4, "Refunds", 2],
        assert: {
          type: "objectIncludes",
          expected: {
            source: "policy.md",
            page: 4,
            heading: "Refunds",
            chunkIndex: 2,
            citationLabel: "policy.md#4-2"
          }
        }
      }
    ],
    solution: `function makeMetadata(source, page, heading, chunkIndex) {
  return {
    source,
    page,
    heading,
    chunkIndex,
    citationLabel: \`\${source}#\${page}-\${chunkIndex}\`
  };
}`
  },
  {
    id: "cosine-similarity",
    title: "Implement Cosine Similarity",
    module: "Embeddings",
    difficulty: "Core",
    estimatedMinutes: 25,
    goal: "Compare query and document vectors.",
    whyItMatters:
      "Vector search ranks chunks by mathematical similarity. You do not need deep math first, but you should code the basic comparison once.",
    instructions:
      "Write cosineSimilarity(a, b). Return dot(a,b) divided by magnitude(a) times magnitude(b). Return 0 if either vector has zero magnitude.",
    starterCode: `function cosineSimilarity(a, b) {
  // Return a number between -1 and 1.
}`,
    tests: [
      {
        name: "same direction is one",
        functionName: "cosineSimilarity",
        args: [
          [1, 0],
          [1, 0]
        ],
        assert: { type: "approx", expected: 1, tolerance: 0.0001 }
      },
      {
        name: "orthogonal is zero",
        functionName: "cosineSimilarity",
        args: [
          [1, 0],
          [0, 1]
        ],
        assert: { type: "approx", expected: 0, tolerance: 0.0001 }
      },
      {
        name: "zero vector is safe",
        functionName: "cosineSimilarity",
        args: [
          [0, 0],
          [1, 1]
        ],
        assert: { type: "equals", expected: 0 }
      }
    ],
    solution: `function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    dot += a[i] * b[i];
    magA += a[i] ** 2;
    magB += b[i] ** 2;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}`
  },
  {
    id: "keyword-overlap",
    title: "Score Keyword Overlap",
    module: "Hybrid Search",
    difficulty: "Core",
    estimatedMinutes: 20,
    goal: "Build a simple keyword score for hybrid retrieval.",
    whyItMatters:
      "Pure vector search can miss exact IDs, names, and error codes. Hybrid search often starts with simple keyword signals.",
    instructions:
      "Write keywordOverlap(query, text). Lowercase both strings, split on non-alphanumeric characters, and return matched query tokens divided by unique query token count.",
    starterCode: `function keywordOverlap(query, text) {
  // Return a score from 0 to 1.
}`,
    tests: [
      {
        name: "two of three query words match",
        functionName: "keywordOverlap",
        args: ["refund policy deadline", "The refund policy is listed here."],
        assert: { type: "approx", expected: 0.6666, tolerance: 0.01 }
      },
      {
        name: "no query words match",
        functionName: "keywordOverlap",
        args: ["database vector", "fresh mango juice"],
        assert: { type: "equals", expected: 0 }
      }
    ],
    solution: `function keywordOverlap(query, text) {
  const tokenize = value => String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const queryTokens = new Set(tokenize(query));
  const textTokens = new Set(tokenize(text));
  if (queryTokens.size === 0) return 0;

  let matches = 0;
  for (const token of queryTokens) {
    if (textTokens.has(token)) matches += 1;
  }
  return matches / queryTokens.size;
}`
  },
  {
    id: "retrieve-top-k",
    title: "Retrieve Top-K Chunks",
    module: "Retrieval",
    difficulty: "Core",
    estimatedMinutes: 30,
    goal: "Rank chunks and return the best evidence IDs.",
    whyItMatters:
      "RAG answers are only as good as the evidence retrieved. This lab makes retrieval visible and testable.",
    instructions:
      "Write retrieveTopK(query, chunks, k). Each chunk has { id, text }. Rank chunks by keyword overlap using your own scoring logic and return an array of top chunk IDs.",
    starterCode: `function retrieveTopK(query, chunks, k) {
  // Return IDs of the top K chunks.
}`,
    tests: [
      {
        name: "returns the best policy chunks first",
        functionName: "retrieveTopK",
        args: [
          "refund policy deadline",
          [
            { id: "a", text: "Password reset instructions for employees." },
            { id: "b", text: "Refund policy says requests must arrive within 30 days." },
            { id: "c", text: "Policy deadlines are reviewed every quarter." }
          ],
          2
        ],
        assert: { type: "deepEqual", expected: ["b", "c"] }
      },
      {
        name: "respects k",
        functionName: "retrieveTopK",
        args: [
          "vector database",
          [
            { id: "x", text: "A vector database stores embeddings." },
            { id: "y", text: "A chatbot writes responses." }
          ],
          1
        ],
        assert: { type: "deepEqual", expected: ["x"] }
      }
    ],
    solution: `function retrieveTopK(query, chunks, k) {
  const tokenize = value => String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  const queryTokens = new Set(tokenize(query));
  const score = text => {
    const textTokens = new Set(tokenize(text));
    let matches = 0;
    for (const token of queryTokens) {
      if (textTokens.has(token)) matches += 1;
    }
    return queryTokens.size ? matches / queryTokens.size : 0;
  };

  return [...chunks]
    .map(chunk => ({ ...chunk, score: score(chunk.text) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(chunk => chunk.id);
}`
  },
  {
    id: "build-rag-prompt",
    title: "Build a Grounded RAG Prompt",
    module: "Prompting for RAG",
    difficulty: "Core",
    estimatedMinutes: 25,
    goal: "Create a prompt that separates rules, context, and the user question.",
    whyItMatters:
      "A good prompt will not save bad retrieval, but a bad prompt can ruin good retrieval.",
    instructions:
      "Write buildRagPrompt(question, chunks). Chunks have { id, text }. Return a string that includes a refusal rule, each chunk with its ID, the question, and a citation instruction.",
    starterCode: `function buildRagPrompt(question, chunks) {
  // Return a grounded prompt string.
}`,
    tests: [
      {
        name: "includes refusal rule",
        functionName: "buildRagPrompt",
        args: ["What is the refund deadline?", [{ id: "chunk-1", text: "Refunds are allowed within 30 days." }]],
        assert: { type: "includes", expected: "I don't know based on the provided context" }
      },
      {
        name: "includes chunk ID and question",
        functionName: "buildRagPrompt",
        args: ["What is the refund deadline?", [{ id: "chunk-1", text: "Refunds are allowed within 30 days." }]],
        assert: { type: "includesAll", expected: ["chunk-1", "Refunds are allowed within 30 days.", "What is the refund deadline?", "Cite"] }
      }
    ],
    solution: `function buildRagPrompt(question, chunks) {
  const context = chunks
    .map(chunk => \`[\${chunk.id}] \${chunk.text}\`)
    .join("\\n\\n");

  return [
    "You are a grounded RAG assistant.",
    "Answer only from the provided context.",
    "If the answer is missing, say: I don't know based on the provided context.",
    "Cite chunk IDs for factual claims.",
    "",
    "Context:",
    context,
    "",
    \`Question: \${question}\`
  ].join("\\n");
}`
  },
  {
    id: "refusal-gate",
    title: "Implement Missing-Context Refusal",
    module: "Hallucination Reduction",
    difficulty: "Core",
    estimatedMinutes: 20,
    goal: "Decide when a RAG assistant should refuse to answer.",
    whyItMatters:
      "A professional assistant should say it does not know when retrieval finds weak or empty evidence.",
    instructions:
      "Write shouldRefuse(retrievedChunks, minScore). Return true when there are no chunks or when the best score is below minScore. Return false otherwise.",
    starterCode: `function shouldRefuse(retrievedChunks, minScore) {
  // Return true when the assistant should not answer.
}`,
    tests: [
      {
        name: "refuses empty retrieval",
        functionName: "shouldRefuse",
        args: [[], 0.25],
        assert: { type: "equals", expected: true }
      },
      {
        name: "refuses weak evidence",
        functionName: "shouldRefuse",
        args: [[{ id: "a", score: 0.1 }], 0.25],
        assert: { type: "equals", expected: true }
      },
      {
        name: "answers strong evidence",
        functionName: "shouldRefuse",
        args: [[{ id: "a", score: 0.8 }], 0.25],
        assert: { type: "equals", expected: false }
      }
    ],
    solution: `function shouldRefuse(retrievedChunks, minScore) {
  if (!Array.isArray(retrievedChunks) || retrievedChunks.length === 0) {
    return true;
  }
  const bestScore = Math.max(...retrievedChunks.map(chunk => Number(chunk.score) || 0));
  return bestScore < minScore;
}`
  },
  {
    id: "extract-citations",
    title: "Extract Source Citations",
    module: "Answer Verification",
    difficulty: "Intermediate",
    estimatedMinutes: 20,
    goal: "Parse citation markers from an answer.",
    whyItMatters:
      "Citation parsing lets a UI connect answer claims back to source cards and detect unsupported answer text.",
    instructions:
      "Write extractCitations(answer). Return an array of citation IDs found inside square brackets, without the brackets. Preserve order and remove duplicates.",
    starterCode: `function extractCitations(answer) {
  // Return citation IDs like ["chunk-1", "policy.md#4-2"].
}`,
    tests: [
      {
        name: "extracts unique citations",
        functionName: "extractCitations",
        args: ["Refunds are 30 days [chunk-1]. Exceptions are listed separately [chunk-2]. See again [chunk-1]."],
        assert: { type: "deepEqual", expected: ["chunk-1", "chunk-2"] }
      },
      {
        name: "handles no citations",
        functionName: "extractCitations",
        args: ["No sources here."],
        assert: { type: "deepEqual", expected: [] }
      }
    ],
    solution: `function extractCitations(answer) {
  const matches = String(answer || "").match(/\\[([^\\]]+)\\]/g) || [];
  const citations = matches.map(item => item.slice(1, -1));
  return [...new Set(citations)];
}`
  },
  {
    id: "redact-pii",
    title: "Redact Simple PII Before Logging",
    module: "Security and Privacy",
    difficulty: "Intermediate",
    estimatedMinutes: 25,
    goal: "Protect logs from obvious sensitive data.",
    whyItMatters:
      "RAG logs often contain user questions and retrieved context. Logging raw PII can create privacy and compliance risk.",
    instructions:
      "Write redactPII(text). Replace email addresses with [EMAIL] and US-style phone numbers like 555-123-4567 with [PHONE].",
    starterCode: `function redactPII(text) {
  // Return text safe enough for simple demo logging.
}`,
    tests: [
      {
        name: "redacts email",
        functionName: "redactPII",
        args: ["Contact ali@example.com for access."],
        assert: { type: "equals", expected: "Contact [EMAIL] for access." }
      },
      {
        name: "redacts phone",
        functionName: "redactPII",
        args: ["Call 555-123-4567 before upload."],
        assert: { type: "equals", expected: "Call [PHONE] before upload." }
      },
      {
        name: "redacts both",
        functionName: "redactPII",
        args: ["ali@example.com 555-123-4567"],
        assert: { type: "equals", expected: "[EMAIL] [PHONE]" }
      }
    ],
    solution: `function redactPII(text) {
  return String(text || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/\\b\\d{3}[-.]\\d{3}[-.]\\d{4}\\b/g, "[PHONE]");
}`
  }
];

export function getCodeLabProgress() {
  try {
    return JSON.parse(localStorage.getItem("rag_mastery_code_labs") || "{}");
  } catch (_error) {
    return {};
  }
}

export function saveCodeLabProgress(progress) {
  localStorage.setItem("rag_mastery_code_labs", JSON.stringify(progress));
}
