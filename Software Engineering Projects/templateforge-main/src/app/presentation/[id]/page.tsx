import { PortfolioPresentationClient } from "@/components/presentation/PortfolioPresentationClient";

export default async function PresentationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortfolioPresentationClient templateId={id} />;
}
