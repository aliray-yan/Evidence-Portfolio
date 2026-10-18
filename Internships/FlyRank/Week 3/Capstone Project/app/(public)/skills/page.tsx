import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Skills | Cyber Portfolio CMS",
  description: "Technical abilities across security and development.",
};

const SKILL_SECTIONS = [
  {
    title: "Cybersecurity",
    skills: [
      { name: "SIEM (Wazuh, Elastic)", level: "Advanced" },
      { name: "Threat Intelligence", level: "Intermediate" },
      { name: "Incident Response", level: "Intermediate" },
      { name: "Network Security", level: "Intermediate" },
    ],
  },
  {
    title: "Development",
    skills: [
      { name: "TypeScript / JavaScript", level: "Advanced" },
      { name: "Next.js / React", level: "Intermediate" },
      { name: "Node.js / Express", level: "Intermediate" },
      { name: "PostgreSQL", level: "Intermediate" },
    ],
  },
  {
    title: "Tools",
    skills: [
      { name: "Wireshark", level: "Advanced" },
      { name: "Kali Linux", level: "Intermediate" },
      { name: "Git / GitHub", level: "Advanced" },
      { name: "Nmap", level: "Intermediate" },
    ],
  },
];

export default function SkillsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-100 md:text-4xl">
        Skills
      </h1>

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {SKILL_SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="font-mono text-sm text-cyan-400">
              {section.title}
            </h2>
            <ul className="mt-4 space-y-3">
              {section.skills.map((skill) => (
                <li
                  key={skill.name}
                  className="rounded-lg border border-navy-800 bg-navy-800 p-4"
                >
                  <p className="text-sm font-medium text-slate-100">
                    {skill.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{skill.level}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
