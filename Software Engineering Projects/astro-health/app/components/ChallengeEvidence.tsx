import { ExternalLink, FlaskConical } from "lucide-react";

const evidence = [
  ["Resting heart rate & sleep", "Simulated sensor-style readings; personal trend screening."],
  ["Bone mineral density", "Modeled research trajectory; no daily wearable bone-density measurement."],
  ["Radiation", "Simulated cumulative dosimeter values; mission exposure excludes prior career dose."],
  ["Immune index", "Experimental synthetic index; no validated assay or disease prediction."],
  ["Crew wellbeing", "Your daily self-report; mood, fatigue, stress, and sleep context."],
];

export default function ChallengeEvidence() {
  return <div className="rounded-2xl border border-hull-700 bg-hull-850/60 p-5">
    <h2 className="flex items-center gap-2 text-base font-semibold text-hull-100"><FlaskConical size={18} className="text-signal-teal" /> Built for astronaut autonomy</h2>
    <p className="mt-2 text-sm leading-6 text-hull-300">Gather indicators, compare personal trends, record follow-up, and prepare a report for medical support. Local detection and rule-based explanations run without a cloud AI connection once the app is installed.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {evidence.map(([title, copy]) => <div key={title} className="rounded-lg border border-hull-700 p-3"><p className="text-xs font-semibold text-hull-200">{title}</p><p className="mt-1 text-xs leading-5 text-hull-400">{copy}</p></div>)}
    </div>
    <p className="mt-4 text-xs leading-5 text-hull-400">Research prototype. Unusual values do not establish a diagnosis, and an expected trend can still be harmful. Four-person, three-day Inspiration4 biomarker variability is mapped heuristically to simulator noise; this does not validate long-mission forecasts. No clinical sensitivity or specificity has been established.</p>
    <div className="mt-4 flex flex-wrap gap-4 text-xs text-signal-teal">
      {[
        ["Space Apps challenge", "https://www.spaceappschallenge.org/2026/challenges/create-health-monitoring-software-for-astronauts-on-space-missions/"],
        ["NASA spaceflight hazards", "https://www.nasa.gov/hrp/hazards/"],
        ["OSDR blood serum study", "https://osdr.nasa.gov/bio/repo/data/studies/OSD-575"],
        ["OSDR urine inflammation study", "https://osdr.nasa.gov/bio/repo/data/studies/OSD-656"],
      ].map(([label, href]) => <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 hover:underline">{label}<ExternalLink size={12} /></a>)}
    </div>
  </div>;
}
