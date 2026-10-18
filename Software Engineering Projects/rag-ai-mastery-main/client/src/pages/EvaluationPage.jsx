const metrics = [
  ["Retrieval quality", 82, "Relevant chunks appear in the top results."],
  ["Groundedness", 76, "The answer is supported by retrieved context."],
  ["Context precision", 70, "Retrieved chunks contain little irrelevant noise."],
  ["Context recall", 64, "The answer evidence was not missed."],
  ["Faithfulness", 88, "The model does not add unsupported claims."],
  ["Citation quality", 80, "Sources are visible and tied to claims."]
];

export default function EvaluationPage() {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Evaluation dashboard</span>
          <h1>Measure RAG quality</h1>
          <p>Use golden questions, human review, retrieval checks, and groundedness scoring before trusting a RAG assistant.</p>
        </div>
      </section>
      <section className="surface">
        <div className="eval-grid">
          {metrics.map(([label, value, description]) => (
            <article className="eval-card" key={label}>
              <div className="eval-score">{value}%</div>
              <h2>{label}</h2>
              <p>{description}</p>
              <div className="progress-track">
                <span style={{ width: `${value}%` }} />
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="two-column">
        <div className="surface">
          <h2>Golden question checklist</h2>
          <ul>
            <li>Known answer exists in the uploaded documents.</li>
            <li>Retriever returns the exact supporting chunk.</li>
            <li>Answer cites the source chunk.</li>
            <li>Unsupported question returns an uncertainty response.</li>
          </ul>
        </div>
        <div className="surface">
          <h2>Diagnosis flow</h2>
          <ol>
            <li>Inspect retrieved chunks.</li>
            <li>Check chunk size, overlap, and metadata.</li>
            <li>Compare keyword, semantic, and hybrid retrieval.</li>
            <li>Review prompt template and refusal rule.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
