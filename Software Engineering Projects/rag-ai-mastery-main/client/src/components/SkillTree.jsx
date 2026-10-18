import ProgressBar from "./ProgressBar.jsx";

export default function SkillTree({ levels = [] }) {
  return (
    <div className="skill-tree">
      {levels.map((level) => (
        <div className="skill-node" key={level.id || level.number}>
          <div className="skill-dot">{level.number}</div>
          <div className="skill-body">
            <strong>{level.title.replace(/^LEVEL \d+:\s*/, "")}</strong>
            <ProgressBar value={level.percent || 0} label={`${level.completed || 0}/${level.total || 0} lessons`} />
          </div>
        </div>
      ))}
    </div>
  );
}
