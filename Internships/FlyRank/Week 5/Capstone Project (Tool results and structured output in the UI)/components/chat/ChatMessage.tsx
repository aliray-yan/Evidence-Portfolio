import { Streamdown } from "streamdown";
import ThinkingDots from "./ThinkingDots";
import ToolPart from "./ToolPart";
import { isPortfolioToolPart, type PortfolioAddToolResult, type PortfolioUIMessage } from "@/lib/ai/message-types";

interface ChatMessageProps {
  message: PortfolioUIMessage;
  showThinking: boolean;
  addToolResult: PortfolioAddToolResult;
}

function TextBubble({ text, isUser }: { text: string; isUser: boolean }) {
  return (
    <div
      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"
      }`}
    >
      {isUser ? <p className="whitespace-pre-wrap">{text}</p> : <Streamdown>{text}</Streamdown>}
    </div>
  );
}

export default function ChatMessage({ message, showThinking, addToolResult }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      {/* Thinking indicator occupies its own slot before anything has
          streamed in yet (no text, no tool call started). Once the first
          part arrives — text OR a tool call — this gives way to it, since
          a tool card's own input-streaming/pending states take over as
          the "working" signal from that point on. */}
      {showThinking && (
        <div className="max-w-[85%] rounded-2xl border border-border bg-card px-4 py-2.5 text-sm">
          <ThinkingDots />
        </div>
      )}

      {message.parts.map((part, index) => {
        if (part.type === "text") {
          if (!part.text) return null;
          return <TextBubble key={`${message.id}-text-${index}`} text={part.text} isUser={isUser} />;
        }

        if (isPortfolioToolPart(part)) {
          return (
            <ToolPart
              // toolCallId is stable across a call's lifecycle states, so
              // React keeps this element identity through
              // input-streaming → ... → output-available instead of
              // remounting it — that's what lets the crossfade transition
              // (useStateTransition) animate rather than hard-swap.
              key={part.toolCallId}
              part={part}
              addToolResult={addToolResult}
            />
          );
        }

        // step-start and other bookkeeping parts render nothing.
        return null;
      })}
    </div>
  );
}
