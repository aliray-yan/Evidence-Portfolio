import VectorBars from "./VectorBars.jsx";

export default function ChunkVisualizer({ chunks = [] }) {
  if (!chunks.length) {
    return <div className="empty-state">Add text or upload a document to see chunks.</div>;
  }

  return (
    <div className="chunk-grid">
      {chunks.map((chunk) => (
        <article className="chunk-card" key={chunk.id || chunk.chunkIndex}>
          <div className="chunk-card-header">
            <strong>Chunk {chunk.chunkIndex + 1}</strong>
            <span>{chunk.tokenEstimate} tokens</span>
          </div>
          <p>{chunk.content}</p>
          <VectorBars vector={chunk.vector || chunk.vectorPreview || []} />
        </article>
      ))}
    </div>
  );
}
