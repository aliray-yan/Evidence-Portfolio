import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import PlaceholderBanner from "@/components/ui/PlaceholderBanner";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import LinkButton from "@/components/ui/LinkButton";
import { PROJECTS } from "@/lib/data/projects";

export const metadata: Metadata = {
  title: "Projects | Cyber Portfolio CMS",
  description: "Security tools, development projects, and research work.",
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <PageHeader
        title="Projects"
        subtitle="Security tools, development projects, and research work."
      />

      <div className="mt-8">
        <PlaceholderBanner
          message="Project data will load from the database."
          phase="Phase 3"
        />
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((project) => (
          <Card key={project.slug} className="flex flex-col">
            <Badge className="w-fit">{project.category}</Badge>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              {project.title}
            </h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">
              {project.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <Badge key={tag} variant="muted">
                  {tag}
                </Badge>
              ))}
            </div>
            <LinkButton
              href={`/projects/${project.slug}`}
              variant="outline"
              className="mt-6"
              fullWidth
            >
              View Details &rarr;
            </LinkButton>
          </Card>
        ))}
      </div>
    </div>
  );
}
