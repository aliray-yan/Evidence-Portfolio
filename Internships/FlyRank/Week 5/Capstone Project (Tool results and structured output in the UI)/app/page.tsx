import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ChatWidget from "@/components/chat/ChatWidget";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";
import { SITE_OWNER } from "@/lib/constants";
import { getFeaturedProjects } from "@/lib/data/projects";
import { SKILL_CATEGORIES } from "@/lib/data/skills";

export default function HomePage() {
  const featuredProjects = getFeaturedProjects(3);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <p className="mb-4 font-mono text-sm text-cyan-400">
            Hi, I&apos;m {SITE_OWNER}
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight  md:text-6xl">
            Cybersecurity Student &amp;{" "}
            <span className="text-cyan-400">Frontend AI Engineer</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-slate-400">
            SOC analyst intern building Wazuh and Sentinel detections,
            FortiGate log pipelines, phishing analysis, and the automation
            that turns raw alerts into analyst-ready context.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <LinkButton href="/projects">View My Projects</LinkButton>
            <LinkButton href="/contact" variant="outline">
              Contact Me
            </LinkButton>
          </div>
        </section>

        {/* Featured Projects */}
        <section className="border-t border-navy-800 bg-navy-900/40">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-2xl font-bold ">
              Featured Projects
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Projects will be loaded from the CMS in a future phase.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {featuredProjects.map((project) => (
                <Card key={project.slug} className="flex flex-col">
                  <h3 className="text-lg font-semibold ">
                    {project.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm text-slate-400">
                    {project.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <Badge key={tag}>{tag}</Badge>
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
            </div>
          </div>
        </section>

        {/* Skills Preview */}
        <section className="border-t border-navy-800">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-2xl font-bold">Core Skills</h2>

            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {SKILL_CATEGORIES.map((category) => (
                <div key={category.title}>
                  <h3 className="font-mono text-sm text-cyan-400">
                    {category.title}
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {category.skills.slice(0, 4).map((skill) => (
                      <li key={skill.name} className="text-sm text-slate-400">
                        {skill.name}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-navy-800 bg-navy-900/40">
          <div className="mx-auto max-w-6xl px-6 py-20 text-center">
            <h2 className="text-2xl font-bold  md:text-3xl">
              Interested in working together?
            </h2>
            <div className="mt-8">
              <LinkButton href="/contact">Get in Touch</LinkButton>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <ChatWidget />
    </div>
  );
}
