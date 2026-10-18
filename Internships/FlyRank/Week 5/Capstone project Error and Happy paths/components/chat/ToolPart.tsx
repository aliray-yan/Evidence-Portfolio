import type { PortfolioAddToolResult, PortfolioToolPart } from "@/lib/ai/message-types";
import ProjectSearchPart from "./tool-parts/ProjectSearchPart";
import SkillsRadarPart from "./tool-parts/SkillsRadarPart";
import IntroEmailPart from "./tool-parts/IntroEmailPart";

/**
 * components/chat/ToolPart.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Routes a single tool-* message part to its dedicated renderer. Each tool
 * gets its own component (not a shared generic "tool card") because the
 * three tools have genuinely different shapes: a findings table, a chart,
 * and a two-button confirmation flow — see components/chat/tool-parts/.
 */
export default function ToolPart({
  part,
  addToolResult,
}: {
  part: PortfolioToolPart;
  addToolResult: PortfolioAddToolResult;
}) {
  switch (part.type) {
    case "tool-searchProjects":
      return <ProjectSearchPart part={part} />;
    case "tool-getSkillsRadar":
      return <SkillsRadarPart part={part} />;
    case "tool-draftIntroEmail":
      return <IntroEmailPart part={part} addToolResult={addToolResult} />;
    default:
      return null;
  }
}
