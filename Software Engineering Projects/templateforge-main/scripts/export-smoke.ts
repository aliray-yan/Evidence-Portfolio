import JSZip from "jszip";
import { templates } from "../src/data/templates";
import { getExportFiles } from "../src/lib/exporter";
import { makeProjectFromTemplate } from "../src/lib/projects";

const expected = {
  static: 40,
  framework: 40,
  animated: 40,
  react: 40,
  portfolio: 40,
  ecommerce: 40,
  shopline: 40,
  shopify: 40
};

const counts = {
  static: templates.filter((template) => template.category === "static").length,
  framework: templates.filter((template) => template.category === "framework").length,
  animated: templates.filter((template) => template.category === "animated").length,
  react: templates.filter((template) => template.category === "react").length,
  portfolio: templates.filter((template) => template.websiteType === "portfolio").length,
  ecommerce: templates.filter((template) => template.websiteType === "ecommerce").length,
  shopline: templates.filter((template) => template.websiteType === "shopline").length,
  shopify: templates.filter((template) => template.websiteType === "shopify").length
};

for (const [key, value] of Object.entries(expected)) {
  if (counts[key as keyof typeof counts] !== value) {
    throw new Error(`Expected ${value} ${key} templates, found ${counts[key as keyof typeof counts]}`);
  }
}

async function main() {
  for (const exportType of ["static", "framework", "animated", "shopline", "shopify"] as const) {
    const template = templates.find((entry) => entry.exportType === exportType);
    if (!template) {
      throw new Error(`No template for export type ${exportType}`);
    }

    const project = makeProjectFromTemplate(template);
    const files = getExportFiles(project, "project", project.pages[0]?.id);
    if (files.length < 4) {
      throw new Error(`Export ${exportType} generated too few files`);
    }

    const zip = new JSZip();
    files.forEach((file) => zip.file(file.path, file.content));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    if (buffer.length < 1000) {
      throw new Error(`Export ${exportType} ZIP is unexpectedly small`);
    }

    console.log(`${exportType}: ${files.length} files, ${buffer.length} bytes`);
  }

  const reactTemplate = templates.find((entry) => entry.category === "react" && entry.websiteType === "portfolio");
  if (!reactTemplate) {
    throw new Error("No React portfolio template found");
  }

  const reactProject = makeProjectFromTemplate(reactTemplate);
  const reactFiles = getExportFiles(reactProject, "project", reactProject.pages[0]?.id);
  for (const required of ["src/main.jsx", "src/components/ComponentShowcase.jsx", "src/style.css"]) {
    if (!reactFiles.some((file) => file.path === required)) {
      throw new Error(`React export is missing ${required}`);
    }
  }
  console.log(`react-category: ${reactFiles.length} files with component source`);

  console.log(`Template counts OK: ${JSON.stringify(counts)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
