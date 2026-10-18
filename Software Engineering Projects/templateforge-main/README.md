# TemplateForge

TemplateForge is a local visual website-template builder for browsing, previewing, customizing, saving, and exporting website templates.

## What is included

- Next.js, TypeScript, and Tailwind CSS app.
- 160 generated templates across Static Websites, Framework-Based Websites, Animated Websites, and React Component Websites.
- Portfolio, e-commerce, Shopline-style, and Shopify-style template types in every top-level category.
- Framer-style editor with pages, layers, live canvas, right-side style/content controls, responsive preview modes, undo/redo, local saving, and exports.
- Aquire/Vorage-inspired display typography with local font hooks and GSAP-powered page motion.
- Template intelligence with quality scores, design DNA, stack labels, reusable creative briefs, and curated filter presets.
- Favorites, compare mode, and portfolio presentation mode for faster shortlisting and internship/demo storytelling.
- Builder one-click visual systems and selected-section treatments for faster design exploration.
- In-browser ZIP export for static, framework, animated, Shopify Liquid-style, and Shopline-ready structures.
- Windows launcher source for a double-click `TemplateForge.exe`.

## Install

```powershell
npm install
```

## Development

```powershell
npm run dev
```

Open `http://127.0.0.1:3000`.

## Build

```powershell
npm run build
```

## Export smoke test

```powershell
npm run smoke:exports
```

## Build the Windows launcher

```powershell
python scripts\make_icon.py
npm run launcher:build
Copy-Item launcher\TemplateForgeLauncher\bin\Release\net10.0-windows\win-x64\publish\TemplateForge.exe .\TemplateForge.exe -Force
powershell -ExecutionPolicy Bypass -File scripts\Create-TemplateForgeShortcut.ps1
```

Double-click `TemplateForge.exe`. It starts the local Next.js server, opens Chrome, and stops the server when the Chrome window closes.

The built `TemplateForge.exe` is intentionally ignored by Git because it is larger than GitHub's normal single-file upload limit. Keep the launcher source in the repo and publish the built executable as a GitHub Release asset when needed.

## Template system

Template data lives in `src/data/templates.ts`. Templates are generated from structured archetypes, category definitions, website types, page sets, editable settings, and section recipes. Each template includes metadata such as `id`, `name`, `category`, `websiteType`, `framework`, `animationLibrary`, `tags`, `previewImage`, `pages`, `sections`, `editableSettings`, and `exportType`.

Reusable section presets live in `src/data/sectionLibrary.ts`.

Shared template scoring and brief generation lives in `src/lib/templateInsights.ts`. The library cards, preview screen, and future export/portfolio surfaces can reuse this logic instead of duplicating marketing copy.

## Design profiles

Templates now carry a design profile and layout variant such as `cyber-interface`, `luxury-editorial`, `brutalist-poster`, `glass-lab`, `pastel-collage`, and `zen-minimal`. The live renderer and exporter use those fields to change typography, section texture, visual frames, card treatments, contrast, and motion behavior. This keeps templates data-driven while making the actual designs feel meaningfully different.

## Adding templates

Add a new archetype in `src/data/templates.ts` to automatically create variants across all categories and website types, or add a new website type/page set and section recipe if the new template family needs a different structure. Add preview art under `public/assets` and reference it from the generator.

## Export architecture

`src/lib/exporter.ts` converts the current saved project into `ExportFile[]` entries, previews the folder tree, copies individual section HTML, and packages files with JSZip. Export modes are selected from the source template's `exportType`.

Shopify exports are Liquid-style theme structures with `layout`, `templates`, `sections`, `snippets`, `assets`, `config`, and README files. Shopline exports are modular storefront folders with integration notes.

## Known limitations

- Projects are saved in browser localStorage, so they are local to this browser profile.
- Shopify exports are clean starter theme structures, not fully validated production Shopify themes. Real deployment may require Shopify CLI validation, locale files, app blocks, merchant settings, and schema tuning.
- Shopline exports are platform-adaptable storefront code. Product data, cart APIs, checkout routes, and platform theme hooks must be connected inside the target Shopline environment.
- The visual editor focuses on practical section-level editing rather than full freeform absolute-position design.
