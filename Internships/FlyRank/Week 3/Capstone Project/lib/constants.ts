export const SITE_NAME = "Cyber Portfolio CMS";
export const SITE_OWNER = "Ali Rayyan";
export const SITE_TAGLINE = "Cybersecurity Student & Frontend AI Engineer";
export const SITE_EMAIL = "ali@example.com";
export const GITHUB_URL = "https://github.com/alirayyan";
export const LINKEDIN_URL = "https://linkedin.com/in/alirayyan";

export interface NavLink {
  label: string;
  href: string;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Certifications", href: "/certifications" },
  { label: "Skills", href: "/skills" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const DASHBOARD_LINKS: NavLink[] = [
  { label: "Overview", href: "/dashboard" },
  { label: "Projects", href: "/dashboard/projects" },
  { label: "Blog", href: "/dashboard/blog" },
  { label: "Certifications", href: "/dashboard/certifications" },
  { label: "Skills", href: "/dashboard/skills" },
  { label: "Settings", href: "/dashboard/settings" },
];
