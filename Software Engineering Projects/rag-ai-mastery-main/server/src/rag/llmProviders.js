import { config } from "../config.js";

export async function generateWithOpenAICompatible({ question, context }) {
  if (!config.openAiApiKey) {
    return null;
  }

  const response = await fetch(`${config.openAiCompatibleBaseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openAiApiKey}`
    },
    body: JSON.stringify({
      model: config.openAiModel,
      messages: [
        {
          role: "system",
          content:
            "You are a grounded RAG tutor. Answer only from the provided context. If context is insufficient, say you do not know based on the provided context."
        },
        {
          role: "user",
          content: `Context:\n${context}\n\nQuestion: ${question}`
        }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    throw new Error("OpenAI-compatible provider request failed");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || null;
}

export async function generateWithOllama({ question, context }) {
  const response = await fetch(`${config.ollamaBaseUrl.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.ollamaModel,
      prompt: `Answer only from the context. If missing, say "I don't know based on the provided context."\n\nContext:\n${context}\n\nQuestion: ${question}`,
      stream: false,
      options: { temperature: 0.2 }
    })
  });

  if (!response.ok) {
    throw new Error("Ollama request failed");
  }

  const data = await response.json();
  return data.response || null;
}
