/**
 * lib/data/experience.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Internship / work history, read by the About page. Sourced from the
 * "Experience" section of Ali's live portfolio.
 */

export interface ExperienceEntry {
  role: string;
  organization: string;
  period: string;
  description: string;
}

export const EXPERIENCE: ExperienceEntry[] = [
  {
    role: "SOC Analyst Intern — Blue Team",
    organization: "Cyberster",
    period: "Mar – May 2026",
    description:
      "Deployed a Wazuh 4.14 SIEM lab, wrote MITRE-mapped detection rules, integrated FortiGate logging, simulated insider-threat activity, and produced a NIST SP 800-61 incident report.",
  },
  {
    role: "Cybersecurity Threat Research Intern",
    organization: "Tech Hierarchy",
    period: "Mar – Apr 2026",
    description:
      "Researched major incidents including FBR tax fraud, TPS ransomware, and the MOVEit CVE-2023-34362 exploit, mapping TTPs to MITRE ATT&CK and writing defense-focused recommendations.",
  },
  {
    role: "Cybersecurity Analyst",
    organization: "Talosec",
    period: "Dec 2025 – Feb 2026",
    description:
      "Designed an enterprise SOC virtual lab with VMware, FortiGate, and Active Directory, then configured Wazuh dashboards and rules for reconnaissance and brute-force detection.",
  },
  {
    role: "SOC Analyst Apprentice",
    organization: "Empirical Training",
    period: "Jun – Aug 2025",
    description:
      "Investigated alerts in Sentinel and Sumo Logic labs, built Elastic/Tines automation, deployed Suricata IDS and honeypots, and created an n8n threat intelligence pipeline.",
  },
];
