import { TemplateMetadata } from "@/lib/types";

const profileLabels: Record<TemplateMetadata["designProfile"], string> = {
  "swiss-editorial": "Swiss editorial discipline",
  "brutalist-poster": "Neo-brutalist impact",
  "saas-luminous": "Luminous SaaS clarity",
  "luxury-editorial": "Luxury editorial atmosphere",
  "cyber-interface": "Cyber interface energy",
  "pastel-collage": "Pastel creative collage",
  "zen-minimal": "Japanese-inspired restraint",
  "retro-console": "Retro Y2K chrome",
  "glass-lab": "Glassmorphism lab system",
  "corporate-signal": "Corporate trust signal"
};

export type TemplateInsight = {
  score: number;
  designDna: string;
  motionDepth: string;
  exportReadiness: string;
  commerceDepth: string;
  strengths: string[];
  brief: string;
};

export function getTemplateInsight(template: TemplateMetadata): TemplateInsight {
  const pageDepth = Math.min(template.pages.length * 4, 18);
  const sectionDepth = Math.min(template.sections.length * 2, 18);
  const motionDepth = template.category === "animated" ? 16 : template.category === "react" ? 10 : 4;
  const commerceDepth = ["ecommerce", "shopline", "shopify"].includes(template.websiteType) ? 14 : 7;
  const exportDepth = template.exportType === "shopify" ? 15 : template.exportType === "shopline" ? 13 : template.category === "react" ? 12 : 10;
  const score = Math.min(98, 42 + pageDepth + sectionDepth + motionDepth + commerceDepth + exportDepth);

  const strengths = [
    profileLabels[template.designProfile],
    `${template.framework} export path`,
    template.animationLibrary ? `${template.animationLibrary} motion system` : "Performance-first static rendering",
    `${template.pages.length} editable pages`,
    `${template.sections.length} reusable sections`
  ];

  if (template.category === "react") strengths.splice(2, 0, "Component showcase architecture");
  if (template.websiteType === "shopify") strengths.push("Theme-style Liquid folder structure");
  if (template.websiteType === "shopline") strengths.push("Platform-adaptable storefront modules");

  return {
    score,
    designDna: profileLabels[template.designProfile],
    motionDepth: template.animationLibrary ?? (template.category === "react" ? "React micro-interactions ready" : "No animation dependency"),
    exportReadiness: `${template.exportType.toUpperCase()} export with README and source folders`,
    commerceDepth: ["ecommerce", "shopline", "shopify"].includes(template.websiteType)
      ? "Product grid, detail, search, filters, cart, reviews, and checkout-style flows"
      : "Portfolio case-study, services, proof, contact, and resume-ready surfaces",
    strengths,
    brief: `${template.name} is a ${template.designProfile.replace(/-/g, " ")} ${template.websiteType} template using ${template.framework}. It focuses on ${template.heroStyle}, ${template.navStyle}, and a ${template.layoutStyle} structure.`
  };
}

export function getTemplateStackLabel(template: TemplateMetadata) {
  const parts = [template.framework, template.animationLibrary, template.exportType.toUpperCase()].filter(Boolean);
  return parts.join(" / ");
}
