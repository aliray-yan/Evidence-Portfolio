"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import type { PortfolioUIMessage } from "@/lib/ai/message-types";
import { ToolErrorPanel, ToolIcon, ToolShell, TerminalLine } from "./shared";

type SkillsRadarPartType = Extract<
  PortfolioUIMessage["parts"][number],
  { type: "tool-getSkillsRadar" }
>;

type SkillsOutput = Extract<SkillsRadarPartType, { state: "output-available" }>["output"];

/** Hand-rolled horizontal bar chart — the "chart, not a table" stretch goal. */
function SkillsBarChart({ categories }: { categories: SkillsOutput["categories"] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const bars = el.querySelectorAll<HTMLElement>("[data-skill-bar]");
    if (bars.length === 0) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      bars.forEach((bar) => {
        bar.style.transform = "scaleX(1)";
      });
      return;
    }

    animate(Array.from(bars), {
      scaleX: [0, 1],
      duration: 650,
      delay: stagger(55),
      ease: "outCubic",
    });
  }, [categories]);

  return (
    <div ref={containerRef} className="space-y-3">
      {categories.map((cat) => (
        <div key={cat.title}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{cat.title}</p>
          <div className="mt-1.5 space-y-1.5">
            {cat.skills.map((skill) => (
              <div key={skill.name} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-foreground" title={skill.name}>
                  {skill.name}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    data-skill-bar
                    className="h-full origin-left rounded-full bg-primary"
                    style={{ width: `${(skill.score / skill.maxScore) * 100}%`, transform: "scaleX(0)" }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-[10px] text-muted-foreground">{skill.level}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SkillsRadarPart({ part }: { part: SkillsRadarPartType }) {
  const key = `${part.toolCallId}-${part.state}`;

  switch (part.state) {
    case "input-streaming":
      return (
        <ToolShell tone="streaming" icon={<ToolIcon.Terminal className="h-4 w-4" />} label="get_skills_radar" stateKey={key}>
          <TerminalLine>{part.input?.category ? `category: ${part.input.category}` : "loading proficiency…"}</TerminalLine>
        </ToolShell>
      );

    case "input-available":
      return (
        <ToolShell tone="pending" icon={<ToolIcon.Spinner className="h-4 w-4" />} label="get_skills_radar · running" stateKey={key}>
          <p className="text-xs text-secondary-foreground/80">
            Calculating proficiency{part.input.category ? ` for ${part.input.category}` : " across all categories"}…
          </p>
        </ToolShell>
      );

    case "output-error":
      return (
        <ToolErrorPanel
          stateKey={key}
          title="get_skills_radar · failed"
          message={part.errorText || "That skill category doesn't match anything in Ali's portfolio."}
        />
      );

    case "output-available":
      return (
        <ToolShell tone="success" icon={<ToolIcon.Check className="h-4 w-4" />} label="get_skills_radar · chart ready" stateKey={key}>
          <SkillsBarChart categories={part.output.categories} />
        </ToolShell>
      );

    default:
      return null;
  }
}
