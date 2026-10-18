import { useApiResource } from "../hooks/useApiResource.js";

export default function ExercisesPage() {
  const { data, loading, error } = useApiResource("/content/exercises", []);
  if (loading) return <div className="center-panel">Loading exercises...</div>;
  if (error) return <div className="form-error">{error}</div>;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Practice exercises</span>
          <h1>Apply RAG decisions</h1>
          <p>Work through chunking, metadata, retrieval diagnosis, groundedness, and safe design tasks.</p>
        </div>
      </section>
      <section className="exercise-grid">
        {data.exercises.map((exercise) => (
          <article className="exercise-card" key={exercise.id}>
            <div className="meta-row">
              <span>{exercise.difficulty}</span>
              <span>{exercise.module?.level?.title}</span>
            </div>
            <h2>{exercise.title}</h2>
            <p>{exercise.scenario}</p>
            <strong>Task</strong>
            <p>{exercise.prompt}</p>
            <strong>Expected outcome</strong>
            <p>{exercise.expectedOutcome}</p>
            <div className="tag-row">
              {exercise.hints.map((hint) => (
                <span key={hint}>{hint}</span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
