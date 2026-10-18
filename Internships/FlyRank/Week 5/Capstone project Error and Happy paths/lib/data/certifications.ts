/**
 * lib/data/certifications.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Certification data, read by /certifications. Credential links are only
 * included where a real, public verification URL exists — we don't invent
 * "Verify" links that go nowhere.
 */

export interface Certification {
  name: string;
  issuer: string;
  year: string;
  credentialUrl?: string;
}

export const CERTIFICATIONS: Certification[] = [
  {
    name: "Cybersecurity Analyst Professional Certificate",
    issuer: "IBM",
    year: "2025",
  },
  {
    name: "SOC Level 1",
    issuer: "TryHackMe",
    year: "2025",
  },
  {
    name: "Cybersecurity Fundamentals, Volume 1",
    issuer: "Independent Study",
    year: "2024",
  },
];
