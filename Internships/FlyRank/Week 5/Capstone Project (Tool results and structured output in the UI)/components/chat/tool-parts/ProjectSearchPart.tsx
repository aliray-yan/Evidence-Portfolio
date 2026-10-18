import Badge from "@/components/ui/Badge";
import LinkButton from "@/components/ui/LinkButton";
import type { PortfolioUIMessage } from "@/lib/ai/message-types";
import { ToolErrorPanel, ToolIcon, ToolShell, TerminalLine } from "./shared";

type SearchProjectsPart = Extract<
  PortfolioUIMessage["parts"][number],
  { type: "tool-searchProjects" }
>;

const MAX_TAGS_SHOWN = 3;

export default function ProjectSearchPart({ part }: { part: SearchProjectsPart }) {
  const key = `${part.toolCallId}-${part.state}`;

  switch (part.state) {
    case "input-streaming": {
      const draft = part.input?.query ?? part.input?.category ?? "";
      return (
        <ToolShell tone="streaming" icon={<ToolIcon.Terminal className="h-4 w-4" />} label="search_projects" stateKey={key}>
          <TerminalLine>{draft ? `query: ${draft}` : "composing search…"}</TerminalLine>
        </ToolShell>
      );
    }

    case "input-available": {
      const { query, category } = part.input;
      const scope = category ? `in ${category}` : "across all categories";
      return (
        <ToolShell tone="pending" icon={<ToolIcon.Spinner className="h-4 w-4" />} label="search_projects · running" stateKey={key}>
          <p className="text-xs text-secondary-foreground/80">
            Searching {query ? `for “${query}” ` : ""}
            {scope}…
          </p>
        </ToolShell>
      );
    }

    case "output-error":
      return (
        <ToolErrorPanel
          stateKey={key}
          title="search_projects · failed"
          message={part.errorText || "The project search couldn't complete. Try asking again."}
        />
      );

    case "output-available": {
      const { projects, returned, totalMatches, query, category } = part.output;
      return (
        <ToolShell
          tone="success"
          icon={<ToolIcon.Check className="h-4 w-4" />}
          label={`search_projects · ${returned} of ${totalMatches}`}
          stateKey={key}
        >
          {returned === 0 ? (
            <p className="text-xs text-muted-foreground">
              No projects matched{query ? ` “${query}”` : ""}
              {category ? ` in ${category}` : ""}. Try a broader keyword, or ask
              to browse by category.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {projects.map((project) => (
                <li key={project.slug} className="rounded-xl border border-border/60 bg-background/60 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">{project.title}</p>
                    <Badge variant="outline" className="shrink-0">
                      {project.category}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{project.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {project.tags.slice(0, MAX_TAGS_SHOWN).map((tag) => (
                      <Badge key={tag} variant="muted" className="px-2 py-0.5 text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                    {project.tags.length > MAX_TAGS_SHOWN && (
                      <span className="text-[10px] text-muted-foreground">
                        +{project.tags.length - MAX_TAGS_SHOWN}
                      </span>
                    )}
                    {project.githubUrl && (
                      <LinkButton href={project.githubUrl} external size="sm" variant="outline" className="ml-auto px-3 py-1 text-[11px]">
                        GitHub
                      </LinkButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ToolShell>
      );
    }

    default:
      return null;
  }
}
