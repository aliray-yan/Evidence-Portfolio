export default function VectorBars({ vector = [] }) {
  const preview = vector.slice(0, 12);
  return (
    <div className="vector-bars" aria-label="Embedding vector preview">
      {preview.map((value, index) => (
        <span
          key={`${index}-${value}`}
          title={`dimension ${index + 1}: ${value}`}
          style={{
            height: `${Math.max(8, Math.abs(value) * 70)}px`,
            transform: value < 0 ? "scaleY(-1)" : "none"
          }}
        />
      ))}
    </div>
  );
}
