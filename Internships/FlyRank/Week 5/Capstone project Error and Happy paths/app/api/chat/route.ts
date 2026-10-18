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
 *
 * Error handling (Week 5 resilience assignment) — two genuinely different
 * failure windows, handled differently on purpose:
 *
 *   1. Setup failures (before any token has streamed): malformed request
 *      body, an empty/invalid messages array, or convertToModelMessages /
 *      streamText throwing synchronously. These return a plain non-2xx
 *      Response with a descriptive text body. useChat's default transport
 *      reads that body as `response.text()` and throws it as `error.message`
 *      verbatim (see DefaultChatTransport in the ai package) — so the text
 *      returned here IS what the retry banner shows, and it's written for a
 *      visitor to read, not a stack trace.
 *
 *   2. Mid-stream failures (the model/provider errors out after streaming
 *      has already started — a dropped connection, a 429, a provider
 *      outage): caught by onError below, which runs inside the stream
 *      itself. Its return value becomes an error part in the UI message
 *      stream, which useChat also surfaces via the same `error.message` —
 *      from the chat widget's point of view these two failure windows look
 *      identical, which is deliberate; the retry action is the same either
 *      way (see ChatWidget.tsx's error banner + Retry).
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
import { describeError } from "@/lib/ai/errors";

// Streamed responses shouldn't be cached, and can run a little longer than
// a typical API route while the model is generating.
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  let messages: UIMessage[];

  try {
    ({ messages } = await req.json());
  } catch (error) {
    console.error("[/api/chat] request body was not valid JSON:", error);
    return new Response("That request got garbled on the way here. Please try again.", {
      status: 400,
    });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response("No message to respond to.", { status: 400 });
  }

  try {
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
          // Surface a safe, tailored message to the client; log the real
          // one server-side. Never leak provider error details (which can
          // include request internals) to the browser.
          console.error("[/api/chat] stream error:", error);
          return describeError(error);
        },
      }),
    });
  } catch (error) {
    // Setup threw synchronously before any streaming began — e.g.
    // convertToModelMessages choked on a malformed part from the client.
    // Same rule as above: log the real error, return a plain, readable one.
    console.error("[/api/chat] request setup failed:", error);
    return new Response(describeError(error), { status: 502 });
  }
}
