/**
 * lib/data/blog.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Placeholder blog post metadata, read by /blog and /blog/[slug]. Topics
 * are grounded in Ali's real internship and lab work (Wazuh, phishing
 * analysis) rather than generic filler — full article bodies will land
 * with the CMS in Phase 5.
 */

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "deploying-a-4-vm-wazuh-siem-lab",
    title: "Deploying a 4-VM Wazuh SIEM Lab: Detection Rules from Scratch",
    date: "2026-05-20",
    excerpt:
      "Notes from building a Wazuh 4.14 lab from the ground up, including custom MITRE-mapped rules and a 120-second brute-force detection threshold.",
    tags: ["SIEM", "Tutorial", "Wazuh"],
  },
  {
    slug: "investigating-a-phishing-campaign",
    title: "Investigating a Phishing Campaign: From Headers to IOCs",
    date: "2026-04-08",
    excerpt:
      "A walkthrough of analyzing phishing email headers, payloads, and sender patterns to extract indicators of compromise.",
    tags: ["Research", "Email Security"],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
