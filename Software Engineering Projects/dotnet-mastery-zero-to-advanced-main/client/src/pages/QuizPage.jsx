import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import { useAsync } from "../hooks/useAsync.js";
import { api } from "../services/api.js";

export default function QuizPage() {
  const { scope, id } = useParams();
  const { data, error, loading } = useAsync(() => api.quiz(scope, id), [scope, id]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState("");

  const title = useMemo(() => {
    if (scope === "final") return "Final exam";
    if (scope === "module") return "Module quiz";
    return "Lesson quiz";
  }, [scope]);

  function choose(questionId, answer) {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
  }

  async function submit() {
    setSubmitError("");
    try {
      const payload = {
        quizId: `${scope}-${id}`,
        lessonId: scope === "lesson" ? id : null,
        moduleId: scope === "module" ? id : null,
        levelId: scope === "final" ? id : null,
        answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }))
      };
      setResult(await api.submitQuiz(payload));
    } catch (err) {
      setSubmitError(err.message);
    }
  }

  if (loading) return <div className="page-loader">Loading quiz...</div>;
  if (error) return <EmptyState title="Quiz unavailable" body={error} />;
  if (!data?.length) return <EmptyState title="No questions yet" body="This quiz has no questions in the current seed set." />;

  return (
    <section className="page-stack quiz-page">
      <div className="page-heading">
        <span className="eyebrow">Assessment</span>
        <h1>{title}</h1>
      </div>

      {data.map((question, index) => (
        <div className="question-card" key={question.id}>
          <span className="question-index">Question {index + 1}</span>
          <h2>{question.question}</h2>
          <div className="option-list">
            {question.options?.map((option) => (
              <button
                className={answers[question.id] === option ? "option selected" : "option"}
                key={option}
                type="button"
                onClick={() => choose(question.id, option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}

      {submitError && <div className="alert alert-error">{submitError}</div>}
      <button className="btn btn-primary" type="button" onClick={submit}>
        <CheckCircle2 size={17} /> Submit quiz
      </button>

      {result && (
        <div className="result-panel">
          <h2>{result.passed ? "Passed" : "Keep practicing"} · {result.score}/{result.total}</h2>
          <div className="feedback-list">
            {result.feedback?.map((item) => (
              <div key={item.id} className={item.isCorrect ? "feedback correct" : "feedback incorrect"}>
                <strong>{item.isCorrect ? "Correct" : "Review"}</strong>
                <span>Your answer: {item.userAnswer || "No answer"}</span>
                <span>Correct answer: {item.correctAnswer}</span>
                <p>{item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
