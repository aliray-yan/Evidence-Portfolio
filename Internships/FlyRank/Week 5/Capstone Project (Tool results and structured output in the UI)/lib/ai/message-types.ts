/**
 * lib/ai/message-types.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Wires `portfolioTools` (lib/ai/tools.ts) into the AI SDK's UIMessage type
 * so every tool call rendered in the chat widget is fully typed end to end
 * — no `any`, no manual casting of `part.input` / `part.output` in the
 * tool-part components. One small file, shared by the widget, the message
 * list, and every tool-part renderer.
 */

import type { ChatAddToolOutputFunction, InferUITools, UIDataTypes, UIMessage } from "ai";
import type { portfolioTools } from "./tools";

export type PortfolioUITools = InferUITools<typeof portfolioTools>;

export type PortfolioUIMessage = UIMessage<unknown, UIDataTypes, PortfolioUITools>;

export type PortfolioMessagePart = PortfolioUIMessage["parts"][number];

/** Narrows PortfolioMessagePart down to just the tool-* parts. */
export type PortfolioToolPart = Extract<PortfolioMessagePart, { type: `tool-${string}` }>;

export type PortfolioAddToolResult = ChatAddToolOutputFunction<PortfolioUIMessage>;

/**
 * Runtime type guard matching PortfolioToolPart. `.type.startsWith("tool-")`
 * alone doesn't narrow for TypeScript (it's just a boolean), and the SDK's
 * own `isToolUIPart` widens to include DynamicToolUIPart (for MCP-style
 * runtime-discovered tools, which this app doesn't use) — this stays exact
 * to our three statically-defined tools.
 */
export function isPortfolioToolPart(part: PortfolioMessagePart): part is PortfolioToolPart {
  return part.type.startsWith("tool-");
}
