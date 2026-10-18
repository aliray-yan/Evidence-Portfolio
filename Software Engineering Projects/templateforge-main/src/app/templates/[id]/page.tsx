import { TemplatePreviewClient } from "@/components/preview/TemplatePreviewClient";

export default async function TemplatePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplatePreviewClient templateId={id} />;
}
