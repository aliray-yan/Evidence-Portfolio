import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import PlaceholderBanner from "@/components/ui/PlaceholderBanner";
import { getPostBySlug } from "@/lib/data/blog";

interface BlogDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs font-medium uppercase tracking-wide text-primary">Article</p>
      <PageHeader title={post?.title ?? slug} className="mt-2" />

      {post && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{post.date}</span>
          {post.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      )}

      <div className="mt-8">
        <PlaceholderBanner
          message="Blog content coming in Phase 5."
          phase="Phase 5"
        />
      </div>

      <article className="mt-10 max-w-none leading-relaxed text-muted-foreground">
        <p>
          {post?.excerpt ??
            "This article's full content will be rendered here once the blog CMS is connected in a future phase."}{" "}
          For now, this page confirms that dynamic routing resolves correctly
          for any article slug.
        </p>
      </article>
    </div>
  );
}
