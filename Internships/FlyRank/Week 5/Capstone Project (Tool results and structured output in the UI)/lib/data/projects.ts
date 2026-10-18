/**
 * lib/data/projects.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Project data sourced from Ali's live portfolio (aliray-yan.github.io/Portfolio).
 * Single source of truth — the home page's "Featured Projects" section and
 * /projects both read from here, so they can never drift out of sync.
 *
 * The shape mirrors the Project fields the PRD specifies for the eventual
 * Prisma schema (title, description, technologies, category, links,
 * featured flag), so swapping this module for a database query in Phase 3
 * is a drop-in replacement rather than a rewrite.
 */

export type ProjectCategory = "Security" | "Development" | "Research";

export interface Project {
  slug: string;
  title: string;
  description: string;
  category: ProjectCategory;
  tags: string[];
  githubUrl?: string;
  featured?: boolean;
}

export const PROJECTS: Project[] = [
  {
    slug: "secureops-workbench",
    title: "SecureOps SOC Analyst Workbench",
    description:
      "Full-stack SOC workbench for alert triage, threat-intel enrichment, cases, playbooks, report exports, live WebSockets, and idempotent EDR ingestion.",
    category: "Security",
    tags: ["React", "FastAPI", "EDR Ingest"],
    githubUrl: "https://github.com/aliray-yan/secureops",
    featured: true,
  },
  {
    slug: "ihadrs-windows-edr",
    title: "IHADRS Windows EDR",
    description:
      "Standalone Python EDR with MITRE-mapped rules, behavioral correlation, Isolation Forest anomaly detection, automated response, and dashboards.",
    category: "Security",
    tags: ["Python", "FastAPI", "MITRE ATT&CK"],
    githubUrl: "https://github.com/aliray-yan/EDR-Ihadrs",
    featured: true,
  },
  {
    slug: "ai-threat-feed-automation",
    title: "AI Threat Feed Automation System",
    description:
      "Automated threat intelligence collection and enrichment with n8n, structured alerts, and analyst-facing output.",
    category: "Security",
    tags: ["n8n", "Threat Intel", "Automation"],
    githubUrl:
      "https://github.com/aliray-yan/Evidence-Portfolio/tree/master/AI%20Automation%20Cyber%20Projects/Ai%20Threat%20Feed%20Automation%20n8n",
    featured: true,
  },
  {
    slug: "ihadrs-mobile",
    title: "IHADRS Mobile",
    description:
      "Offline-first Android Mobile Threat Defense foundation with Compose UI, Room storage, Hilt, WorkManager, and foreground monitoring.",
    category: "Security",
    tags: ["Kotlin", "Compose", "Room"],
    githubUrl: "https://github.com/aliray-yan/IHADRSMobile",
  },
  {
    slug: "tines-phishing-analysis",
    title: "Tines Phishing Email Analysis",
    description:
      "Parsed email artifacts, enriched indicators, and routed analyst-ready phishing notifications.",
    category: "Security",
    tags: ["Tines", "Elastic SIEM", "Phishing"],
    githubUrl:
      "https://github.com/aliray-yan/Evidence-Portfolio/tree/master/AI%20Automation%20Cyber%20Projects/Tines%20Phishing%20Email%20Analysis%20Automation",
  },
  {
    slug: "suricata-ids-monitoring",
    title: "Suricata IDS Monitoring",
    description:
      "Configured IDS monitoring, generated alerts, and reviewed eve.json and fast.log evidence.",
    category: "Security",
    tags: ["Suricata", "IDS", "Packet Analysis"],
    githubUrl:
      "https://github.com/aliray-yan/Evidence-Portfolio/tree/master/SOC%20%2B%20Apprenticeship/Projects/Suricata%20Project",
  },
  {
    slug: "nessus-vulnerability-scan",
    title: "Nessus Vulnerability Scan",
    description:
      "Configured scans, reviewed risk, and documented remediation priorities from vulnerability findings.",
    category: "Security",
    tags: ["Nessus", "CVSS", "Remediation"],
    githubUrl:
      "https://github.com/aliray-yan/Evidence-Portfolio/tree/master/SOC%20%2B%20Apprenticeship/Projects/Nessus%20Project",
  },
  {
    slug: "nmap-scanning-enumeration",
    title: "Nmap Scanning & Enumeration",
    description:
      "Performed host discovery, port scanning, service detection, OS fingerprinting, and NSE checks.",
    category: "Security",
    tags: ["Nmap", "Enumeration", "Network"],
    githubUrl:
      "https://github.com/aliray-yan/Evidence-Portfolio/tree/master/SOC%20%2B%20Apprenticeship/Projects/Nmap%20Scan%20Project",
  },
  {
    slug: "rag-ai-mastery",
    title: "RAG AI Mastery",
    description:
      "Full-stack AI and RAG learning platform with a RAG playground, code labs, quizzes, and progress tracking.",
    category: "Development",
    tags: ["RAG", "React", "Prisma"],
    githubUrl: "https://github.com/aliray-yan/rag-ai-mastery",
  },
  {
    slug: "dotnet-mastery",
    title: ".NET Mastery",
    description:
      "Full-stack C# and .NET learning platform with React, ASP.NET Core, EF Core, PostgreSQL, and JWT/RBAC auth.",
    category: "Development",
    tags: ["React", "ASP.NET Core", "PostgreSQL"],
    githubUrl: "https://github.com/aliray-yan/dotnet-mastery-zero-to-advanced",
  },
];

export function getFeaturedProjects(limit = 3): Project[] {
  return PROJECTS.filter((project) => project.featured).slice(0, limit);
}

export function getProjectBySlug(slug: string): Project | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}
