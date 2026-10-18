import PlaceholderBanner from "@/components/ui/PlaceholderBanner";

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="font-mono text-sm text-cyan-400">Project</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-100 md:text-4xl">
        {slug}
      </h1>

      <div className="mt-8">
        <PlaceholderBanner
          message="Full project details coming in Phase 3 when database is connected."
          phase="Phase 3"
        />
      </div>

      <div className="mt-10 space-y-8">
        <section>
          <h2 className="font-mono text-sm text-cyan-400">Overview</h2>
          <p className="mt-2 text-slate-400">
            A high-level summary of the project will appear here once content
            is sourced from the database.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-sm text-cyan-400">Problem</h2>
          <p className="mt-2 text-slate-400">
            The problem this project set out to solve will be described here.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-sm text-cyan-400">Solution</h2>
          <p className="mt-2 text-slate-400">
            The approach taken to solve the problem will be described here.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-sm text-cyan-400">Tech Stack</h2>
          <p className="mt-2 text-slate-400">
            Technologies used in this project will be listed here.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-sm text-cyan-400">Links</h2>
          <p className="mt-2 text-slate-400">
            GitHub repository and live demo links will appear here.
          </p>
        </section>
      </div>
    </div>
  );
}
