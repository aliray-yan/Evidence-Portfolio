import { Brain, Database, FileText, MessageSquare, Search, SplitSquareVertical } from "lucide-react";

const steps = [
  { label: "Documents", icon: FileText },
  { label: "Chunks", icon: SplitSquareVertical },
  { label: "Embeddings", icon: Brain },
  { label: "Vector Store", icon: Database },
  { label: "Retrieval", icon: Search },
  { label: "Grounded Answer", icon: MessageSquare }
];

export default function PipelineDiagram() {
  return (
    <div className="pipeline-diagram" aria-label="RAG pipeline">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div className="pipeline-step" key={step.label}>
            <span className="step-index">{index + 1}</span>
            <Icon size={22} />
            <strong>{step.label}</strong>
          </div>
        );
      })}
    </div>
  );
}
