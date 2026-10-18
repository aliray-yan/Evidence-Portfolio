"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { SITE_EMAIL } from "@/lib/constants";
import type { PortfolioAddToolResult, PortfolioUIMessage } from "@/lib/ai/message-types";
import { ToolErrorPanel, ToolIcon, ToolShell, TerminalLine } from "./shared";

type IntroEmailPartType = Extract<
  PortfolioUIMessage["parts"][number],
  { type: "tool-draftIntroEmail" }
>;

interface IntroEmailPartProps {
  part: IntroEmailPartType;
  addToolResult: PortfolioAddToolResult;
}

/**
 * The "confirmation before an action runs" tool. draftIntroEmail has no
 * `execute` (see lib/ai/tools.ts), so the SDK never runs it on its own —
 * the call arrives here in 'input-available' state and just sits there
 * until this component calls addToolResult, which is the ONLY thing that
 * moves it forward. Nothing is sent anywhere until that happens.
 */
export default function IntroEmailPart({ part, addToolResult }: IntroEmailPartProps) {
  const key = `${part.toolCallId}-${part.state}`;
  const [isResolving, setIsResolving] = useState(false);

  switch (part.state) {
    case "input-streaming":
      return (
        <ToolShell tone="streaming" icon={<ToolIcon.Terminal className="h-4 w-4" />} label="draft_intro_email" stateKey={key}>
          <TerminalLine>{part.input?.subject ? `subject: ${part.input.subject}` : "drafting a message…"}</TerminalLine>
        </ToolShell>
      );

    case "input-available": {
      const { subject, note } = part.input;

      function resolve(confirmed: boolean) {
        setIsResolving(true);
        if (confirmed) {
          // mailto: is handled by the OS/email client, not a page
          // navigation — the chat stays exactly where it is.
          const mailto = `mailto:${SITE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(note)}`;
          window.location.href = mailto;
        }
        addToolResult({
          tool: "draftIntroEmail",
          toolCallId: part.toolCallId,
          output: { confirmed, method: confirmed ? "mailto" : null },
        });
      }

      return (
        <ToolShell tone="pending" icon={<ToolIcon.Spinner className="h-4 w-4" />} label="draft_intro_email · confirm to send" stateKey={key}>
          <div className="space-y-2">
            <div className="rounded-lg border border-border/60 bg-background/60 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">To</p>
              <p className="text-xs text-foreground">{SITE_EMAIL}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">Subject</p>
              <p className="text-xs font-medium text-foreground">{subject}</p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">Message</p>
              <p className="whitespace-pre-wrap text-xs text-foreground">{note}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="primary" disabled={isResolving} onClick={() => resolve(true)}>
                Send via email
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={isResolving} onClick={() => resolve(false)}>
                Cancel
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Opens your email client with this pre-filled — nothing sends automatically.
            </p>
          </div>
        </ToolShell>
      );
    }

    case "output-error":
      return (
        <ToolErrorPanel
          stateKey={key}
          title="draft_intro_email · failed"
          message={part.errorText || "Couldn't prepare that email. Try asking again."}
        />
      );

    case "output-available": {
      const { confirmed } = part.output;
      return (
        <ToolShell
          tone={confirmed ? "success" : "streaming"}
          icon={confirmed ? <ToolIcon.Check className="h-4 w-4" /> : <ToolIcon.Terminal className="h-4 w-4" />}
          label={confirmed ? "draft_intro_email · sent to email client" : "draft_intro_email · cancelled"}
          stateKey={key}
        >
          <p className="text-xs text-muted-foreground">
            {confirmed
              ? `Opened your email client addressed to ${SITE_EMAIL}.`
              : "No email was drafted — the visitor cancelled."}
          </p>
        </ToolShell>
      );
    }

    default:
      return null;
  }
}
