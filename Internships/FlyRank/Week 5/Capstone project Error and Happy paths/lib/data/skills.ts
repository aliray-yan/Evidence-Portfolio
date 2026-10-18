/**
 * lib/data/skills.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Skill data, read by /skills and the home page's "Core Skills" preview
 * (which just maps over category → skill names, ignoring proficiency).
 * Sourced from the "Skill Stack" section of Ali's live portfolio.
 */

export type ProficiencyLevel = "Beginner" | "Intermediate" | "Advanced";

export interface Skill {
  name: string;
  level: ProficiencyLevel;
}

export interface SkillCategory {
  title: string;
  skills: Skill[];
}

export const SKILL_CATEGORIES: SkillCategory[] = [
  {
    title: "SOC & SIEM",
    skills: [
      { name: "Wazuh", level: "Advanced" },
      { name: "Microsoft Sentinel", level: "Intermediate" },
      { name: "Elastic SIEM", level: "Intermediate" },
      { name: "Suricata", level: "Intermediate" },
      { name: "Sumo Logic", level: "Intermediate" },
    ],
  },
  {
    title: "Recon & Assessment",
    skills: [
      { name: "Nmap", level: "Advanced" },
      { name: "Nessus", level: "Intermediate" },
      { name: "Shodan", level: "Intermediate" },
      { name: "SpiderFoot", level: "Beginner" },
    ],
  },
  {
    title: "Automation & Development",
    skills: [
      { name: "n8n", level: "Advanced" },
      { name: "Tines", level: "Intermediate" },
      { name: "TypeScript / JavaScript", level: "Advanced" },
      { name: "React / Next.js", level: "Intermediate" },
      { name: "Python", level: "Intermediate" },
    ],
  },
];
