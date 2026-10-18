import { Brain, Code2, Download, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "../components/ProgressBar.jsx";
import StatCard from "../components/StatCard.jsx";
import { codeLabs, getCodeLabProgress } from "../data/codeLabs.js";

export default function StandaloneDashboardPage() {
  const progress = getCodeLabProgress();
  const completedCodeLabs = codeLabs.filter((lab) => progress[lab.id]?.passed).length;
  const percent = Math.round((completedCodeLabs / codeLabs.length) * 100);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <span className="eyebrow">Standalone Android mode</span>
          <h1>RAG AI Mastery Offline Lab</h1>
          <p>
            This APK build runs free local learning on device: offline lessons, validated Code Labs, local RAG playground
            previews, evaluation checklists, notes, bookmarks, and certificate practice.
          </p>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard label="Code labs" value={`${completedCodeLabs}/${codeLabs.length}`} helper="Validated locally" icon={Code2} />
        <StatCard label="Curriculum" value="Offline" helper="Bundled lessons" icon={Brain} />
        <StatCard label="Privacy" value="Local" helper="Runs in app WebView" icon={ShieldCheck} />
      </section>

      <section className="two-column">
        <div className="surface">
          <div className="section-title">
            <h2>Must-Code Progress</h2>
            <span>{percent}%</span>
          </div>
          <ProgressBar value={percent} label="Code labs complete" />
          <div className="compact-list standalone-actions">
            <Link to="/code-labs">
              <strong>Open Code Labs</strong>
              <span>Write and validate chunking, retrieval, prompt, citation, and safety code.</span>
            </Link>
            <Link to="/playground">
              <strong>Open Local RAG Playground</strong>
              <span>Chunk sample documents and ask questions with mock retrieval.</span>
            </Link>
            <Link to="/learning-path">
              <strong>Open Offline Lessons</strong>
              <span>Study the zero-to-advanced RAG path without a backend server.</span>
            </Link>
          </div>
        </div>

        <div className="surface">
          <div className="section-title">
            <h2>What Works Offline</h2>
            <Download size={18} />
          </div>
          <ul>
            <li>Bundled curriculum, search, quizzes, notes, and bookmarks run without PostgreSQL.</li>
            <li>Validated coding challenges run in a local browser worker.</li>
            <li>RAG playground can chunk text and answer from local mock retrieval.</li>
            <li>Lesson and code progress is stored on the device.</li>
            <li>No paid APIs or cloud services are required.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
