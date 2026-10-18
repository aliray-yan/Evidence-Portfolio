export default function RetrievalResults({ results = [] }) {
  if (!results.length) {
    return <div className="empty-state">No retrieved chunks yet.</div>;
  }

  return (
    <div className="retrieval-list">
      {results.map((chunk) => (
        <article className="retrieval-card" key={chunk.id || chunk.chunkIndex}>
          <div className="retrieval-top">
            <strong>Source chunk {chunk.chunkIndex + 1}</strong>
            <span>{Math.round((chunk.score || 0) * 100)}% match</span>
          </div>
          <p>{chunk.content}</p>
          <div className="score-row">
            <span>Vector {chunk.vectorScore}</span>
            <span>Keyword {chunk.keywordScore}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
