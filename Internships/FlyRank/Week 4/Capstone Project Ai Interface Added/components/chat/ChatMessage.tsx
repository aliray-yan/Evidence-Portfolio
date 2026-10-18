import type { UIMessage } from "ai";
import { Streamdown } from "streamdown";
import ThinkingDots from "./ThinkingDots";

interface ChatMessageProps {
  message: UIMessage;
  showThinking: boolean;
}

export default function ChatMessage({ message, showThinking }: ChatMessageProps) {
  const isUser = message.role === "user";
  const textContent = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "border border-border bg-card text-foreground"
        }`}
      >
        {/* Thinking indicator and text occupy the same cell and crossfade,
            so the handoff reads as one continuous motion rather than a
            flicker (indicator vanishing a frame before text appears). */}
        <div className="relative min-h-[1.25rem]">
          <div
            className={`transition-opacity duration-200 ${
              showThinking ? "opacity-100" : "hidden opacity-0"
            }`}
          >
            <ThinkingDots />
          </div>
          <div
            className={`transition-opacity duration-200 ${
              showThinking ? "hidden opacity-0" : "opacity-100"
            }`}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{textContent}</p>
            ) : (
              <Streamdown>{textContent}</Streamdown>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
