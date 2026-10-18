import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";
import { api } from "../services/api.js";

function isCorrectFeedback(feedback, questionId) {
  return feedback?.find((item) => item.questionId === questionId);
}

export default function QuizRunner({ lessonId, questions = [] }) {
  const [answers, setAnswers] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!questions.length) {
    return <div className="empty-state">No quiz questions for this lesson yet.</div>;
  }

  function setAnswer(question, value) {
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const data = await api.post("/progress/quiz-attempts", { lessonId, answers });
      setFeedback(data.feedback);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="quiz-runner">
      {questions.map((question) => {
        const itemFeedback = isCorrectFeedback(feedback, question.id);
        return (
          <article className="quiz-question" key={question.id}>
            <div className="quiz-question-top">
              <span>{question.type.replace(/_/g, " ")}</span>
              {itemFeedback && (
                <strong className={itemFeedback.correct ? "correct" : "incorrect"}>
                  {itemFeedback.correct ? "Correct" : "Review"}
                </strong>
              )}
            </div>
            <h3>{question.question}</h3>

            {question.type === "TRUE_FALSE" ? (
              <div className="choice-grid two">
                {[true, false].map((choice) => (
                  <button
                    key={String(choice)}
                    className={answers[question.id] === choice ? "selected" : ""}
                    onClick={() => setAnswer(question, choice)}
                    type="button"
                  >
                    {String(choice)}
                  </button>
                ))}
              </div>
            ) : question.type === "ORDERING" ? (
              <div className="ordering-box">
                <ol>
                  {question.options.map((option, index) => (
                    <li key={option}>
                      {index}: {option}
                    </li>
                  ))}
                </ol>
                <input
                  value={(answers[question.id] || []).join(",")}
                  onChange={(event) =>
                    setAnswer(
                      question,
                      event.target.value
                        .split(",")
                        .map((item) => Number(item.trim()))
                        .filter((item) => Number.isInteger(item))
                    )
                  }
                  placeholder="Enter order like 0,1,2,3"
                />
              </div>
            ) : (
              <div className="choice-grid">
                {question.options.map((option, index) => (
                  <button
                    key={option}
                    className={answers[question.id] === index ? "selected" : ""}
                    onClick={() => setAnswer(question, index)}
                    type="button"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {itemFeedback && <p className="feedback-text">{itemFeedback.explanation}</p>}
          </article>
        );
      })}

      {error && <div className="form-error">{error}</div>}
      <button className="primary-button" type="button" onClick={submit} disabled={submitting}>
        {feedback ? <CheckCircle2 size={18} /> : <Send size={18} />}
        {feedback ? "Submitted" : submitting ? "Checking..." : "Submit Quiz"}
      </button>
    </div>
  );
}
