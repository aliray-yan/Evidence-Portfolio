import PlaceholderBanner from "@/components/ui/PlaceholderBanner";

interface BlogDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-sm text-cyan-400">Article</p>
      <h1 className="mt-2 text-3xl font-bold text-slate-100 md:text-4xl">
        {slug}
      </h1>

      <div className="mt-8">
        <PlaceholderBanner
          message="Blog content coming in Phase 5."
          phase="Phase 5"
        />
      </div>

      <article className="mt-10 max-w-none leading-relaxed text-slate-400">
        <p>
          This article&apos;s full content will be rendered here once the
          blog CMS is connected in a future phase. For now, this page
          confirms that dynamic routing resolves correctly for any article
          slug.
        </p>
      </article>
    </div>
  );
}
