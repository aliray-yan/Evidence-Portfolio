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
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
        <Reveal trigger="mount" staggerMs={110}>
          <p className="mb-4 font-semibold uppercase tracking-wide text-sm text-primary">
            Hi, I&apos;m {SITE_OWNER}
          </p>
          <h1 className="font-display max-w-3xl text-4xl uppercase leading-[1.05] tracking-tight text-foreground md:text-6xl">
            Cybersecurity Student{" "}
            <span className="text-primary">&amp;&nbsp;Frontend AI Engineer</span>
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
      </section>

      {/* Featured Projects */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-2xl uppercase text-foreground">
            Featured Projects
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A few recent builds — browse the full list, or ask the AI
            assistant (bottom right) to filter by category.
          </p>

          <Reveal trigger="scroll" staggerMs={100} className="mt-10 grid gap-6 md:grid-cols-3">
            {featuredProjects.map((project) => (
              <Card key={project.slug} className="flex flex-col">
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
          <h2 className="font-display text-2xl uppercase text-foreground">Core Skills</h2>

          <Reveal trigger="scroll" staggerMs={120} className="mt-10 grid gap-8 md:grid-cols-3">
            {SKILL_CATEGORIES.map((category) => (
              <div key={category.title}>
                <h3 className="font-semibold uppercase tracking-wide text-sm text-primary">
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
          <h2 className="font-display text-2xl uppercase text-foreground md:text-3xl">
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
