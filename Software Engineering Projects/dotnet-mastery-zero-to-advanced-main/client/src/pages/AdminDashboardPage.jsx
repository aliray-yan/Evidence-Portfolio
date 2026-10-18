import { RefreshCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge.jsx";
import EmptyState from "../components/EmptyState.jsx";
import { api } from "../services/api.js";

const resources = [
  ["levels", "Levels"],
  ["modules", "Modules"],
  ["lessons", "Lessons"],
  ["quiz-questions", "Quiz Questions"],
  ["practice-exercises", "Practice Exercises"],
  ["guided-projects", "Guided Projects"]
];

const samples = {
  levels: { title: "LEVEL 26: Capstone", description: "Capstone delivery.", order: 26, difficulty: "Professional", estimatedHours: 12 },
  modules: { levelId: "00000000-0000-0000-0000-000000000000", title: "Capstone Foundations", description: "Plan the capstone.", order: 1, difficulty: "Professional" },
  lessons: {
    moduleId: "00000000-0000-0000-0000-000000000000",
    title: "Capstone planning",
    slug: "capstone-planning",
    difficulty: "Professional",
    estimatedMinutes: 45,
    simpleExplanation: "Plan the work before writing code.",
    eli10Explanation: "Draw the map before the trip.",
    analogy: "A blueprint before construction.",
    whyItMatters: "Professional systems need intentional scope.",
    codeExample: "Console.WriteLine(\"Plan first\");",
    lineByLineExplanation: "Line 1 prints the planning reminder.",
    commonMistakes: ["Skipping requirements"],
    miniPracticeTask: "Write three requirements.",
    summary: "Planning reduces rework.",
    nextLessonId: null,
    tags: ["capstone", "architecture"]
  },
  "quiz-questions": {
    lessonId: null,
    moduleId: null,
    levelId: null,
    question: "What is the safest first step?",
    options: ["Clarify requirements", "Deploy immediately", "Ignore tests", "Hard-code secrets"],
    correctAnswer: "Clarify requirements",
    explanation: "Requirements shape implementation choices.",
    difficulty: "Professional",
    type: "scenario"
  },
  "practice-exercises": {
    moduleId: "00000000-0000-0000-0000-000000000000",
    lessonId: null,
    title: "Capstone exercise",
    difficulty: "Professional",
    problemStatement: "Create a small proof of concept.",
    hints: ["Start small"],
    expectedOutput: "A working proof.",
    solution: "Console.WriteLine(\"Proof\");",
    explanation: "Proofs reduce uncertainty.",
    tags: ["capstone"]
  },
  "guided-projects": {
    moduleId: "00000000-0000-0000-0000-000000000000",
    title: "Capstone API",
    difficulty: "Professional",
    description: "Build a production-style API.",
    requirements: ["Auth", "CRUD", "Tests"],
    steps: ["Design", "Build", "Test"],
    expectedResult: "A runnable API.",
    starterCode: "dotnet new webapi",
    finalCode: "dotnet run",
    explanation: "Capstones integrate multiple skills.",
    extensionIdeas: ["Add CI/CD"]
  }
};

export default function AdminDashboardPage() {
  const [resource, setResource] = useState("levels");
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [json, setJson] = useState(JSON.stringify(samples.levels, null, 2));
  const [error, setError] = useState("");

  const selected = useMemo(() => items.find((item) => item.id === selectedId), [items, selectedId]);

  async function load(activeResource = resource) {
    setError("");
    try {
      const [statsResult, listResult] = await Promise.all([api.adminStats(), api.adminList(activeResource)]);
      setStats(statsResult);
      setItems(listResult);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    setJson(JSON.stringify(samples[resource], null, 2));
    setSelectedId("");
    load(resource);
  }, [resource]);

  useEffect(() => {
    if (selected) {
      const { id, ...rest } = selected;
      setJson(JSON.stringify(rest, null, 2));
    }
  }, [selected]);

  async function save() {
    setError("");
    try {
      const payload = JSON.parse(json);
      if (selectedId) {
        await api.adminUpdate(resource, selectedId, payload);
      } else {
        await api.adminCreate(resource, payload);
      }
      await load();
      setSelectedId("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    setError("");
    try {
      await api.adminDelete(resource, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Admin dashboard</span>
        <h1>Content management system</h1>
      </div>

      {stats && (
        <div className="stat-grid compact">
          {Object.entries(stats).map(([key, value]) => <div className="stat-card" key={key}><span>{key}</span><strong>{value}</strong></div>)}
        </div>
      )}

      <div className="admin-tabs">
        {resources.map(([key, label]) => (
          <button className={resource === key ? "active" : ""} key={key} type="button" onClick={() => setResource(key)}>{label}</button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>{resources.find(([key]) => key === resource)?.[1]}</h2>
            <button className="icon-btn" title="Refresh" type="button" onClick={() => load()}>
              <RefreshCcw size={17} />
            </button>
          </div>
          {items.length ? (
            <div className="admin-list">
              {items.map((item) => (
                <div className={selectedId === item.id ? "admin-row selected" : "admin-row"} key={item.id}>
                  <button type="button" onClick={() => setSelectedId(item.id)}>
                    <strong>{item.title || item.question}</strong>
                    <span>{item.difficulty || item.type || item.email}</span>
                  </button>
                  <button className="icon-btn" title="Delete" type="button" onClick={() => remove(item.id)}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No records loaded" body="Use refresh or create a new record." />
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>{selectedId ? "Edit record" : "Create record"}</h2>
            <Badge>{resource}</Badge>
          </div>
          <textarea className="json-editor" value={json} onChange={(e) => setJson(e.target.value)} rows={24} spellCheck="false" />
          <div className="toolbar-row">
            <button className="btn btn-primary" type="button" onClick={save}><Save size={17} /> Save</button>
            <button className="btn btn-secondary" type="button" onClick={() => { setSelectedId(""); setJson(JSON.stringify(samples[resource], null, 2)); }}>New</button>
          </div>
        </div>
      </div>
    </section>
  );
}
