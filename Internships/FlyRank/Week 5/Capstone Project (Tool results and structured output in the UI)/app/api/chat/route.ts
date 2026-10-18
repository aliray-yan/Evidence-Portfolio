/**
 * app/api/chat/route.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Streaming chat endpoint for the AI Portfolio Assistant.
 *
 * POST /api/chat  { messages: UIMessage[] }  →  streamed UIMessage response
 *
 * This is the only place in the app that touches the model call. The
 * API key (OPENROUTER_API_KEY) is read from server-side environment
 * variables only, inside lib/ai/config.ts — it is never exposed to the
 * browser. Model choice and the system prompt both live in
 * lib/ai/config.ts, not here.
 */

import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { chatModel, chatSettings, SYSTEM_PROMPT } from "@/lib/ai/config";
import { portfolioTools } from "@/lib/ai/tools";

// Streamed responses shouldn't be cached, and can run a little longer than
// a typical API route while the model is generating.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: chatModel,
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages, { tools: portfolioTools }),
    tools: portfolioTools,
    // Default stopWhen is a single step. Tool calls need at least one more
    // step after the tool result comes back so the model can turn a
    // findings table / chart into a short, human sentence instead of
    // ending its turn right after the tool call. 5 gives headroom for a
    // visitor question that touches more than one tool in a single turn.
    stopWhen: stepCountIs(5),
    ...chatSettings,
  });

  // toUIMessageStream() turns the model's token stream into UI message
  // chunks the useChat hook understands (text deltas, start/finish events,
  // etc.) — this is what gives us token-by-token rendering, the
  // thinking/streaming status transitions, and abort (stop button) support
  // for free. createUIMessageStreamResponse() wraps that into an SSE
  // Response.
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        // Surface a safe, generic message to the client; log the real one
        // server-side. Never leak provider error details (which can
        // include request internals) to the browser.
        console.error("[/api/chat] streamText error:", error);
        return "The assistant hit an error generating a response. Please try again.";
      },
    }),
  });
}
