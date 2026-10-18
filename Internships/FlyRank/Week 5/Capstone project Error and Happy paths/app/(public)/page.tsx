import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import Reveal from "@/components/motion/Reveal";
import { SITE_OWNER } from "@/lib/constants";
import { getFeaturedProjects } from "@/lib/data/projects";
import { SKILL_CATEGORIES } from "@/lib/data/skills";

export default function HomePage() {
  const featuredProjects = getFeaturedProjects(3);

  return (
    <>
      {/* Hero — the dot grid is a quiet nod to network/node diagrams rather
          than a loud "hacker" motif; it fades out toward the bottom edge
          via the mask in .bg-grid-dots so it never fights the copy. */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="bg-grid-dots absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <Reveal trigger="mount" staggerMs={110}>
            <p className="mb-5 font-mono text-sm uppercase tracking-wide text-primary">
              Hi, I&apos;m {SITE_OWNER}
            </p>
            <h1 className="font-display max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-6xl">
              Cybersecurity student{" "}
              <span className="text-primary">&amp; frontend AI engineer</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              SOC analyst intern building Wazuh and Sentinel detections,
              FortiGate log pipelines, phishing analysis, and the automation
              that turns raw alerts into analyst-ready context.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <LinkButton href="/projects" size="lg">
                View My Projects
              </LinkButton>
              <LinkButton href="/contact" variant="outline" size="lg">
                Contact Me
              </LinkButton>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Featured Projects */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-wide text-primary">Selected work</p>
          <h2 className="font-display mt-2 text-2xl font-semibold text-foreground">
            Featured Projects
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A few recent builds — browse the full list, or ask the AI
            assistant (bottom right) to filter by category.
          </p>

          <Reveal trigger="scroll" staggerMs={100} className="mt-10 grid gap-6 md:grid-cols-3">
            {featuredProjects.map((project) => (
              <Card key={project.slug} interactive className="flex flex-col">
                <h3 className="text-lg font-semibold text-foreground">
                  {project.title}
                </h3>
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
                {project.githubUrl ? (
                  <LinkButton
                    href={project.githubUrl}
                    external
                    variant="outline"
                    className="mt-6"
                    fullWidth
                  >
                    GitHub
                  </LinkButton>
                ) : (
                  <Button variant="outline" disabled fullWidth className="mt-6">
                    GitHub
                  </Button>
                )}
              </Card>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Skills Preview */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <p className="font-mono text-xs uppercase tracking-wide text-primary">Capabilities</p>
          <h2 className="font-display mt-2 text-2xl font-semibold text-foreground">Core Skills</h2>

          <Reveal trigger="scroll" staggerMs={120} className="mt-10 grid gap-8 md:grid-cols-3">
            {SKILL_CATEGORIES.map((category) => (
              <div key={category.title}>
                <h3 className="font-mono text-sm font-medium uppercase tracking-wide text-primary">
                  {category.title}
                </h3>
                <ul className="mt-3 space-y-2">
                  {category.skills.slice(0, 4).map((skill) => (
                    <li key={skill.name} className="text-sm text-muted-foreground">
                      {skill.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/40">
        <Reveal trigger="scroll" staggerMs={100} className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="font-display text-2xl font-semibold text-foreground md:text-3xl">
            Interested in working together?
          </h2>
          <div className="mt-8">
            <LinkButton href="/contact">Get in Touch</LinkButton>
          </div>
        </Reveal>
      </section>
    </>
  );
}
