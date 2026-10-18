"use client";

import JSZip from "jszip";
import { saveAs } from "file-saver";
import { getTemplateById } from "@/data/templates";
import { ExportFile, Project, TemplatePage, TemplateSection } from "@/lib/types";
import { slugify } from "@/lib/id";

export type ExportScope = "page" | "project";

function esc(value?: string) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemCards(section: TemplateSection) {
  return (section.items ?? [])
    .map((item) => {
      const title = esc(item.title ?? item.name ?? item.question ?? "Item");
      const body = esc(item.body ?? item.answer ?? item.quote ?? "");
      return `<article class="tf-card">
  <div class="tf-card-media"></div>
  <div class="tf-card-row">
    <h3>${title}</h3>
    ${item.price ? `<strong>${esc(item.price)}</strong>` : ""}
  </div>
  ${item.badge ? `<span class="tf-badge">${esc(item.badge)}</span>` : ""}
  ${body ? `<p>${body}</p>` : ""}
  ${item.author ? `<small>${esc(item.author)}</small>` : ""}
</article>`;
    })
    .join("\n");
}

function sectionClass(section: TemplateSection, extra = "") {
  const profile = section.styles.profile ? ` tf-profile-${section.styles.profile}` : "";
  const variant = section.styles.layoutVariant ? ` tf-variant-${section.styles.layoutVariant}` : "";
  const texture = section.styles.texture ? ` tf-texture-${section.styles.texture}` : "";
  return `tf-section${extra ? ` ${extra}` : ""}${profile}${variant}${texture}`;
}

export function sectionToHtml(section: TemplateSection) {
  const c = section.content;

  if (section.type === "navbar") {
    const links = (c.links ?? "")
      .split(",")
      .map((link) => `<a href="#">${esc(link.trim())}</a>`)
      .join("");

    return `<header class="${sectionClass(section, "tf-navbar")}">
  <a class="tf-brand" href="#">${esc(c.brand)}</a>
  <nav>${links}</nav>
  <a class="tf-button" href="#">${esc(c.primaryCta)}</a>
</header>`;
  }

  if (section.type === "announcement") {
    return `<div class="tf-announcement">${esc(c.eyebrow)} - ${esc(c.body)}</div>`;
  }

  if (section.type === "hero") {
    return `<section class="${sectionClass(section, "tf-hero")}">
  <div>
    <p class="tf-eyebrow">${esc(c.eyebrow)}</p>
    <h1>${esc(c.heading)}</h1>
    <p>${esc(c.body)}</p>
    <div class="tf-actions">
      <a class="tf-button" href="#">${esc(c.primaryCta)}</a>
      <a class="tf-button tf-button-secondary" href="#">${esc(c.secondaryCta)}</a>
    </div>
  </div>
  <div class="tf-visual">${section.image ? `<img src="${esc(section.image)}" alt="">` : ""}</div>
</section>`;
  }

  if (["products", "projects", "features", "pricing", "testimonials", "faq", "reviews", "team", "logoWall", "blog", "collection"].includes(section.type)) {
    return `<section class="${sectionClass(section)}">
  <div class="tf-intro">
    <p class="tf-eyebrow">${esc(c.eyebrow)}</p>
    <h2>${esc(c.heading)}</h2>
    <p>${esc(c.body)}</p>
  </div>
  <div class="tf-grid">${itemCards(section)}</div>
</section>`;
  }

  if (section.type === "productDetail") {
    return `<section class="${sectionClass(section, "tf-split")}">
  <div class="tf-visual">${section.image ? `<img src="${esc(section.image)}" alt="">` : ""}</div>
  <div>
    <p class="tf-eyebrow">${esc(c.eyebrow)}</p>
    <h2>${esc(c.heading)}</h2>
    <p>${esc(c.body)}</p>
    <div class="tf-options"><button>XS</button><button>S</button><button>M</button><button>L</button></div>
    <button class="tf-button">Add to cart</button>
  </div>
</section>`;
  }

  if (section.type === "cart" || section.type === "search") {
    return `<section class="${sectionClass(section, "tf-split")}">
  <div>
    <p class="tf-eyebrow">${esc(c.eyebrow)}</p>
    <h2>${esc(c.heading)}</h2>
    <p>${esc(c.body)}</p>
  </div>
  <aside class="tf-panel">
    <h3>${section.type === "cart" ? "Cart summary" : "Search and filters"}</h3>
    <label><span>Search</span><input placeholder="Search products"></label>
    <label><span>Category</span><select><option>All</option><option>Featured</option></select></label>
    <button class="tf-button">Apply</button>
  </aside>
</section>`;
  }

  if (section.type === "contact") {
    return `<section class="${sectionClass(section, "tf-split")}">
  <div>
    <p class="tf-eyebrow">${esc(c.eyebrow)}</p>
    <h2>${esc(c.heading)}</h2>
    <p>${esc(c.body)}</p>
  </div>
  <form class="tf-form">
    <input aria-label="Name" placeholder="Name">
    <input aria-label="Email" placeholder="Email">
    <textarea aria-label="Project details" placeholder="Project details"></textarea>
    <button class="tf-button" type="button">${esc(c.primaryCta)}</button>
  </form>
</section>`;
  }

  if (section.type === "footer") {
    return `<footer class="${sectionClass(section, "tf-footer")}">
  <strong>${esc(c.brand)}</strong>
  <p>${esc(c.body)}</p>
  <nav>${(c.links ?? "").split(",").map((link) => `<a href="#">${esc(link.trim())}</a>`).join("")}</nav>
</footer>`;
  }

  return `<section class="${sectionClass(section)}"><h2>${esc(c.heading)}</h2><p>${esc(c.body)}</p></section>`;
}

function pageHtml(project: Project, page: TemplatePage, extraHead = "", bodyAttrs = "") {
  const template = getTemplateById(project.templateId);
  const visibleSections = page.sections.filter((section) => section.visible).map(sectionToHtml).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(project.name)} - ${esc(page.name)}</title>
  <meta name="description" content="${esc(template?.description ?? "Exported TemplateForge website")}">
  <link rel="stylesheet" href="./assets/styles.css">
  ${extraHead}
</head>
<body ${bodyAttrs}>
${visibleSections}
<script src="./assets/script.js"></script>
</body>
</html>`;
}

function css(project: Project, animated = false) {
  const { colors, typography, layout, reduceMotion } = project.settings;
  const shadow = layout.shadow === "bold" ? "0 24px 60px rgba(15,23,42,.22)" : layout.shadow === "soft" ? "0 18px 44px rgba(15,23,42,.12)" : "none";

  return `:root {
  --tf-bg: ${colors.background};
  --tf-ink: ${colors.text};
  --tf-muted: ${colors.muted};
  --tf-accent: ${colors.accent};
  --tf-accent-2: ${colors.accent2};
  --tf-soft: ${colors.surface};
  --tf-radius: ${layout.radius}px;
  --tf-shadow: ${shadow};
  font-family: ${typography.fontFamily};
}
@font-face { font-family: "Aquire"; src: local("Aquire"), local("Aquire Regular"), local("Aquire-BW0ox"); font-display: swap; }
@font-face { font-family: "Vorage"; src: local("Vorage"), local("Vorage Regular"); font-display: swap; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--tf-bg); color: var(--tf-ink); font-size: ${typography.bodySize}px; line-height: ${typography.lineHeight}; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }
.tf-section { padding: ${layout.spacing}px clamp(22px, 6vw, 76px); border-bottom: 1px solid color-mix(in srgb, var(--tf-ink), transparent 90%); }
.tf-section { position: relative; overflow: hidden; }
.tf-texture-grid::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .16; background-image: linear-gradient(rgba(0,0,0,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.18) 1px, transparent 1px); background-size: 44px 44px; }
.tf-texture-scanline::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .16; background: repeating-linear-gradient(0deg, rgba(255,255,255,.25) 0, rgba(255,255,255,.25) 1px, transparent 1px, transparent 8px); }
.tf-texture-paper::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .18; background-image: radial-gradient(circle at 20% 20%, rgba(0,0,0,.18), transparent 1px); background-size: 18px 18px; }
.tf-section > * { position: relative; z-index: 1; }
.tf-navbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-block: 22px; background: var(--tf-soft); position: sticky; top: 0; z-index: 10; }
.tf-navbar nav, .tf-footer nav { display: flex; flex-wrap: wrap; gap: 18px; color: var(--tf-muted); font-size: 14px; font-weight: 700; }
.tf-brand { font-size: 22px; font-weight: 900; }
.tf-announcement { padding: 12px 22px; text-align: center; background: var(--tf-ink); color: white; font-weight: 800; }
.tf-hero, .tf-split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .9fr); gap: clamp(28px, 5vw, 72px); align-items: center; }
.tf-eyebrow { color: var(--tf-accent); font-size: 12px; font-weight: 900; letter-spacing: .2em; text-transform: uppercase; }
h1, h2, h3, p { margin-top: 0; }
h1 { font-size: clamp(42px, 7vw, ${typography.headingSize}px); line-height: 1.02; letter-spacing: 0; }
h2 { font-size: clamp(30px, 5vw, ${Math.round(typography.headingSize * 0.68)}px); line-height: 1.08; letter-spacing: 0; }
p { color: var(--tf-muted); }
.tf-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
.tf-button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; border: 1px solid var(--tf-accent); border-radius: calc(var(--tf-radius) * .55); background: var(--tf-accent); color: white; padding: 0 18px; font-weight: 800; cursor: pointer; }
.tf-button-secondary { background: transparent; color: var(--tf-ink); border-color: currentColor; }
.tf-visual { min-height: 300px; border-radius: var(--tf-radius); background: linear-gradient(135deg, var(--tf-accent), var(--tf-accent-2)); box-shadow: var(--tf-shadow); overflow: hidden; position: relative; }
.tf-visual::before { content: "TF"; position: absolute; left: 20px; top: 18px; z-index: 1; border: 1px solid rgba(255,255,255,.4); border-radius: 999px; padding: 5px 10px; color: white; font-size: 11px; font-weight: 900; letter-spacing: .2em; }
.tf-visual::after { content: ""; position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px); background-size: 36px 36px; opacity: .42; }
.tf-visual img { width: 100%; height: 100%; object-fit: cover; }
.tf-intro { max-width: 780px; margin: 0 auto 34px; text-align: center; }
.tf-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
.tf-card, .tf-panel, .tf-form { border: 1px solid color-mix(in srgb, var(--tf-ink), transparent 86%); border-radius: var(--tf-radius); background: var(--tf-soft); padding: 18px; box-shadow: var(--tf-shadow); }
.tf-variant-poster .tf-card, .tf-variant-poster.tf-hero, .tf-variant-poster .tf-panel { border: 3px solid currentColor; border-radius: 0; box-shadow: none; }
.tf-variant-console { background: #05070d; color: white; }
.tf-variant-console p { color: color-mix(in srgb, white, transparent 35%); }
.tf-variant-console .tf-card, .tf-variant-console .tf-panel { background: rgba(255,255,255,.06); border-color: color-mix(in srgb, var(--tf-accent), transparent 45%); color: white; }
.tf-variant-gallery h1, .tf-variant-gallery h2, .tf-profile-luxury-editorial h1, .tf-profile-luxury-editorial h2 { font-family: "Vorage", "Cormorant Garamond", Georgia, serif; font-weight: 600; letter-spacing: .02em; }
.tf-variant-glass .tf-card, .tf-variant-glass .tf-panel { background: rgba(255,255,255,.42); backdrop-filter: blur(18px); }
.tf-card-media { aspect-ratio: 4/3; border-radius: calc(var(--tf-radius) * .7); margin-bottom: 16px; background: linear-gradient(135deg, var(--tf-accent), color-mix(in srgb, var(--tf-accent-2), white 34%)); }
.tf-card-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.tf-badge { display: inline-flex; border-radius: 999px; background: white; padding: 5px 8px; font-size: 11px; font-weight: 900; }
.tf-form { display: grid; gap: 12px; }
.tf-form input, .tf-form textarea, .tf-panel input, .tf-panel select { width: 100%; min-height: 44px; border: 1px solid color-mix(in srgb, var(--tf-ink), transparent 84%); border-radius: 10px; padding: 10px 12px; }
.tf-form textarea { min-height: 120px; }
.tf-options { display: flex; gap: 8px; margin: 18px 0; }
.tf-options button { width: 42px; height: 42px; border: 1px solid currentColor; background: transparent; border-radius: 10px; font-weight: 800; }
.tf-footer { display: flex; align-items: center; justify-content: space-between; gap: 22px; background: var(--tf-ink); color: white; }
.tf-footer p { color: color-mix(in srgb, white, transparent 25%); }
${animated ? `.tf-section { opacity: 0; transform: translateY(22px); animation: tf-rise .7s ease forwards; }
.tf-section:nth-child(2) { animation-delay: .08s; }
.tf-section:nth-child(3) { animation-delay: .16s; }
.tf-button, .tf-card { transition: transform .2s ease, box-shadow .2s ease; }
.tf-button:hover, .tf-card:hover { transform: translateY(-2px); }
@keyframes tf-rise { to { opacity: 1; transform: translateY(0); } }` : ""}
${reduceMotion ? "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }" : ""}
@media (max-width: 860px) {
  .tf-hero, .tf-split { grid-template-columns: 1fr; }
  .tf-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tf-navbar, .tf-footer { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 560px) {
  .tf-section { padding-inline: 18px; }
  .tf-grid { grid-template-columns: 1fr; }
}`;
}

function script(project: Project, animated = false) {
  if (!animated) {
    return `console.log("${project.name} exported from TemplateForge");`;
  }

  return `const reduceMotion = document.body.dataset.reduceMotion === "true" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) {
  if (window.gsap) {
    gsap.from(".tf-section", { y: 34, opacity: 0, duration: 0.75, ease: "power3.out", stagger: 0.08 });
    document.querySelectorAll(".tf-card, .tf-button").forEach((element) => {
      element.addEventListener("mouseenter", () => gsap.to(element, { y: -3, duration: 0.22, ease: "power2.out" }));
      element.addEventListener("mouseleave", () => gsap.to(element, { y: 0, duration: 0.22, ease: "power2.out" }));
    });
  } else {
    document.querySelectorAll(".tf-card, .tf-button").forEach((element) => {
      element.addEventListener("pointermove", () => element.style.transform = "translateY(-2px)");
      element.addEventListener("pointerleave", () => element.style.transform = "");
    });
  }
}`;
}

function readme(project: Project, exportKind: string) {
  const template = getTemplateById(project.templateId);
  return `# ${project.name}

Exported from TemplateForge.

## Technology

- Template: ${template?.name ?? project.templateId}
- Category: ${template?.category ?? "custom"}
- Website type: ${template?.websiteType ?? "custom"}
- Framework/technology: ${template?.framework ?? exportKind}
- Animation library: ${template?.animationLibrary ?? "None"}
- Export type: ${exportKind}

## Run

Open \`index.html\` directly for static exports, or run the framework project commands below when a package.json is included.

## Edit

Pages are generated into the root folder. Shared styles are in \`assets/styles.css\`; interactive behavior is in \`assets/script.js\`.

## Shopify and Shopline notes

Shopify exports include Liquid-style folders for theme adaptation. They are intentionally clean and educational, but a real Shopify deployment may require schema tuning, Shopify CLI validation, app blocks, locale files, and merchant-specific settings.

Shopline exports use modular HTML/CSS/JS storefront components. Shopline platform integration points vary by merchant setup, so connect product data, cart APIs, checkout routes, and theme settings inside the target Shopline environment.
`;
}

function baseFiles(project: Project, pages: TemplatePage[], animated = false): ExportFile[] {
  return [
    ...pages.map((page, index) => ({
      path: index === 0 ? "index.html" : `${slugify(page.name)}.html`,
      content: pageHtml(project, page, animated ? '<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>' : "", `data-reduce-motion="${project.settings.reduceMotion}"`)
    })),
    { path: "assets/styles.css", content: css(project, animated) },
    { path: "assets/script.js", content: script(project, animated) },
    { path: "README.md", content: readme(project, animated ? "animated" : "static") }
  ];
}

function packageJson(project: Project, animated = false) {
  const template = getTemplateById(project.templateId);
  const reactTemplate = template?.category === "react";
  const deps = animated
    ? {
        "@studio-freight/lenis": "^1.0.42",
        gsap: "^3.12.5",
        "framer-motion": "^11.0.0",
        ...(reactTemplate ? { react: "^19.0.0", "react-dom": "^19.0.0" } : {})
      }
    : reactTemplate
      ? { react: "^19.0.0", "react-dom": "^19.0.0", gsap: "^3.12.5" }
      : {};

  return JSON.stringify(
    {
      name: slugify(project.name),
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "vite --host 127.0.0.1",
        build: "vite build",
        preview: "vite preview --host 127.0.0.1"
      },
      dependencies: deps,
      devDependencies: {
        vite: "^6.0.0",
        tailwindcss: "^3.4.17",
        autoprefixer: "^10.4.20",
        postcss: "^8.4.49"
      }
    },
    null,
    2
  );
}

function frameworkFiles(project: Project, pages: TemplatePage[], animated = false): ExportFile[] {
  const files = baseFiles(project, pages, animated);
  const template = getTemplateById(project.templateId);
  const usesTailwind = template?.framework.toLowerCase().includes("tailwind") || animated;
  const reactTemplate = template?.category === "react";

  return [
    ...files,
    ...(reactTemplate ? reactSourceFiles(project) : []),
    { path: "package.json", content: packageJson(project, animated) },
    { path: "postcss.config.js", content: "module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } };\n" },
    ...(usesTailwind
      ? [
          {
            path: "tailwind.config.js",
            content: `module.exports = { content: ["./*.html", "./src/**/*.{js,ts,jsx,tsx}"], theme: { extend: {} }, plugins: [] };\n`
          }
        ]
      : []),
    {
      path: "README.md",
      content: `${readme(project, animated ? "animated framework" : "framework")}

## Development commands

\`\`\`bash
npm install
npm run dev
npm run build
\`\`\`

Framework note: this export is labeled as ${template?.framework ?? "framework-ready"} and includes the setup files needed to continue work locally.
${reactTemplate ? "React note: source components are included in `src/components` and can be wired into a Vite React entry." : ""}
`
    }
  ];
}

function reactSourceFiles(project: Project): ExportFile[] {
  return [
    {
      path: "src/main.jsx",
      content: `import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { ComponentShowcase } from "./components/ComponentShowcase.jsx";

createRoot(document.getElementById("root")).render(<ComponentShowcase />);
`
    },
    {
      path: "src/components/ComponentShowcase.jsx",
      content: `import React from "react";

const panels = [
  ["Command Menu", "Search actions, pages, products, and automations.", "CMD"],
  ["Live Metrics", "Conversion, revenue, visitors, and engagement streams.", "+28%"],
  ["Configurator", "Variant controls, swatches, pricing, and checkout actions.", "$128"],
  ["Timeline", "Launch plan, case-study milestones, and status updates.", "04"]
];

export function ComponentShowcase() {
  return (
    <main className="react-showcase">
      <section className="react-hero">
        <p>React Component Website</p>
        <h1>${esc(project.name)}</h1>
        <span>Component-driven layout exported from TemplateForge.</span>
      </section>
      <section className="react-grid">
        {panels.map(([title, body, metric]) => (
          <article className="react-card" key={title}>
            <strong>{metric}</strong>
            <h2>{title}</h2>
            <p>{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
`
    },
    {
      path: "src/style.css",
      content: `.react-showcase { min-height: 100vh; padding: 48px; background: #080a12; color: white; font-family: Inter, system-ui, sans-serif; }
.react-hero { max-width: 980px; border: 1px solid rgba(255,255,255,.14); border-radius: 28px; padding: 48px; background: radial-gradient(circle at 20% 20%, rgba(32,215,255,.28), transparent 30%), rgba(255,255,255,.06); }
.react-hero p { color: #20d7ff; text-transform: uppercase; letter-spacing: .24em; font-size: 12px; font-weight: 900; }
.react-hero h1 { font-size: clamp(42px, 8vw, 110px); line-height: .95; margin: 16px 0; }
.react-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 18px; margin-top: 24px; }
.react-card { border: 1px solid rgba(255,255,255,.14); border-radius: 22px; padding: 24px; background: rgba(255,255,255,.06); backdrop-filter: blur(16px); }
.react-card strong { display: inline-flex; border-radius: 999px; padding: 8px 12px; background: #ff36b9; color: white; }
.react-card h2 { margin: 22px 0 8px; }
.react-card p { color: rgba(255,255,255,.68); line-height: 1.7; }`
    }
  ];
}

function liquidSection(section: TemplateSection) {
  return `{% comment %} TemplateForge section: ${section.title} {% endcomment %}
${sectionToHtml(section).replace(/\.\/assets\//g, "{{ '").replace(/\.css/g, ".css' | asset_url }}")}
{% schema %}
{
  "name": "${esc(section.title)}",
  "settings": [
    { "type": "text", "id": "heading", "label": "Heading", "default": "${esc(section.content.heading)}" },
    { "type": "textarea", "id": "body", "label": "Body", "default": "${esc(section.content.body)}" }
  ],
  "presets": [{ "name": "${esc(section.title)}" }]
}
{% endschema %}
`;
}

function shopifyFiles(project: Project, pages: TemplatePage[]): ExportFile[] {
  const home = pages[0];
  const sections = home.sections.filter((section) => section.visible);
  return [
    {
      path: "layout/theme.liquid",
      content: `<!doctype html>
<html lang="{{ request.locale.iso_code }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  {{ content_for_header }}
  {{ 'templateforge.css' | asset_url | stylesheet_tag }}
</head>
<body>
  {{ content_for_layout }}
  {{ 'templateforge.js' | asset_url | script_tag }}
</body>
</html>`
    },
    {
      path: "templates/index.json",
      content: JSON.stringify(
        {
          sections: Object.fromEntries(sections.map((section, index) => [`templateforge_${index}`, { type: slugify(section.title) }])),
          order: sections.map((_, index) => `templateforge_${index}`)
        },
        null,
        2
      )
    },
    { path: "snippets/product-card.liquid", content: `<article class="tf-card"><div class="tf-card-media"></div><h3>{{ product.title }}</h3><p>{{ product.price | money }}</p></article>` },
    { path: "assets/templateforge.css", content: css(project, false) },
    { path: "assets/templateforge.js", content: script(project, false) },
    {
      path: "config/settings_schema.json",
      content: JSON.stringify(
        [
          { name: "theme_info", theme_name: project.name, theme_version: "1.0.0", theme_author: "TemplateForge" },
          { name: "Colors", settings: [{ type: "color", id: "accent", label: "Accent", default: project.settings.colors.accent }] }
        ],
        null,
        2
      )
    },
    ...sections.map((section) => ({ path: `sections/${slugify(section.title)}.liquid`, content: liquidSection(section) })),
    { path: "README.md", content: readme(project, "shopify") }
  ];
}

function shoplineFiles(project: Project, pages: TemplatePage[]): ExportFile[] {
  return [
    ...baseFiles(project, pages, false).map((file) => ({ ...file, path: `storefront/${file.path}` })),
    ...pages.flatMap((page) =>
      page.sections
        .filter((section) => section.visible)
        .map((section) => ({ path: `storefront/components/${slugify(page.name)}-${slugify(section.title)}.html`, content: sectionToHtml(section) }))
    ),
    {
      path: "integration-notes.md",
      content: `${readme(project, "shopline")}

## Suggested Shopline integration points

- Map product card fields to Shopline product data.
- Replace cart mockup controls with Shopline cart endpoints or theme helpers.
- Connect search and filters to collection data.
- Move shared sections into the target theme's modular component format.
`
    }
  ];
}

export function getExportFiles(project: Project, scope: ExportScope = "project", pageId?: string): ExportFile[] {
  const template = getTemplateById(project.templateId);
  const pages = scope === "page" ? project.pages.filter((page) => page.id === pageId).slice(0, 1) : project.pages;
  const safePages = pages.length ? pages : [project.pages[0]];

  if (template?.exportType === "shopify") return shopifyFiles(project, safePages);
  if (template?.exportType === "shopline") return shoplineFiles(project, safePages);
  if (template?.exportType === "framework") return frameworkFiles(project, safePages);
  if (template?.exportType === "animated") return frameworkFiles(project, safePages, true);
  return baseFiles(project, safePages);
}

export async function downloadZip(project: Project, scope: ExportScope = "project", pageId?: string) {
  const zip = new JSZip();
  getExportFiles(project, scope, pageId).forEach((file) => zip.file(file.path, file.content));
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${slugify(project.name)}-${scope}.zip`);
}

export async function copyToClipboard(content: string) {
  await navigator.clipboard.writeText(content);
}
