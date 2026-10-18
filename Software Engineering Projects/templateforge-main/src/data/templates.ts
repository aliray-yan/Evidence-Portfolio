import { slugify } from "@/lib/id";
import {
  DesignProfile,
  EditableSettings,
  ExportType,
  SectionType,
  TemplateCategory,
  TemplateMetadata,
  TemplatePage,
  TemplateSection,
  WebsiteType
} from "@/lib/types";

type Archetype = {
  label: string;
  profile: DesignProfile;
  layoutVariant: NonNullable<TemplateSection["styles"]["layoutVariant"]>;
  texture: NonNullable<TemplateSection["styles"]["texture"]>;
  contrast: NonNullable<TemplateSection["styles"]["contrast"]>;
  colorStyle: string;
  layoutStyle: string;
  navStyle: string;
  heroStyle: string;
  palette: EditableSettings["colors"];
  fontFamily: string;
  tags: string[];
};

const categories: Array<{ id: TemplateCategory; label: string }> = [
  { id: "static", label: "Static Websites" },
  { id: "framework", label: "Framework-Based Websites" },
  { id: "animated", label: "Animated Websites" },
  { id: "react", label: "React Component Websites" }
];

const websiteTypes: Array<{ id: WebsiteType; label: string; noun: string }> = [
  { id: "portfolio", label: "Portfolio Websites", noun: "portfolio" },
  { id: "ecommerce", label: "E-commerce Websites", noun: "store" },
  { id: "shopline", label: "Simple Shopline Storefront Projects", noun: "Shopline storefront" },
  { id: "shopify", label: "Simple Shopify Storefront Projects", noun: "Shopify theme" }
];

const archetypes: Archetype[] = [
  {
    label: "Minimal Swiss Editorial",
    profile: "swiss-editorial",
    layoutVariant: "magazine",
    texture: "grid",
    contrast: "soft",
    colorStyle: "white, graphite, signal red",
    layoutStyle: "asymmetric editorial grid",
    navStyle: "thin top rail",
    heroStyle: "large left-aligned headline with index panel",
    palette: {
      background: "#f7f5ef",
      text: "#151515",
      muted: "#6f6a60",
      accent: "#e23d28",
      accent2: "#111111",
      surface: "#ffffff"
    },
    fontFamily: "Aquire, Orbitron, Rajdhani, Arial, sans-serif",
    tags: ["minimal", "editorial", "swiss"]
  },
  {
    label: "Brutalist Studio",
    profile: "brutalist-poster",
    layoutVariant: "poster",
    texture: "paper",
    contrast: "high",
    colorStyle: "paper, black, acid green",
    layoutStyle: "boxed grid with visible dividers",
    navStyle: "blocky utility bar",
    heroStyle: "oversized headline with stacked cards",
    palette: {
      background: "#fbfbef",
      text: "#080808",
      muted: "#4b4b43",
      accent: "#b7ff2a",
      accent2: "#ff4f1f",
      surface: "#f2f0df"
    },
    fontFamily: "Aquire, 'Arial Black', Arial, sans-serif",
    tags: ["brutalist", "bold", "grid"]
  },
  {
    label: "Modern SaaS",
    profile: "saas-luminous",
    layoutVariant: "dashboard",
    texture: "none",
    contrast: "soft",
    colorStyle: "cloud white, blue, fresh green",
    layoutStyle: "clean conversion layout",
    navStyle: "pill navigation with right CTA",
    heroStyle: "product-led split hero",
    palette: {
      background: "#f6f9fc",
      text: "#172033",
      muted: "#64748b",
      accent: "#2f7df6",
      accent2: "#22c55e",
      surface: "#ffffff"
    },
    fontFamily: "Aquire, Inter, ui-sans-serif, system-ui",
    tags: ["saas", "startup", "clean"]
  },
  {
    label: "Luxury Fashion",
    profile: "luxury-editorial",
    layoutVariant: "gallery",
    texture: "paper",
    contrast: "soft",
    colorStyle: "ivory, cocoa, champagne",
    layoutStyle: "full-bleed editorial product story",
    navStyle: "spaced serif navigation",
    heroStyle: "cinematic image composition with small type",
    palette: {
      background: "#f5efe4",
      text: "#221915",
      muted: "#806f64",
      accent: "#a36b3d",
      accent2: "#d4af72",
      surface: "#fffaf2"
    },
    fontFamily: "Vorage, 'Bodoni 72', Didot, Georgia, serif",
    tags: ["luxury", "fashion", "premium"]
  },
  {
    label: "Dark Cyberpunk",
    profile: "cyber-interface",
    layoutVariant: "console",
    texture: "scanline",
    contrast: "dark",
    colorStyle: "near-black, cyan, magenta",
    layoutStyle: "dense dashboard-inspired panels",
    navStyle: "terminal tab bar",
    heroStyle: "glowing command-center hero",
    palette: {
      background: "#090b13",
      text: "#f8fbff",
      muted: "#9ca3af",
      accent: "#20d7ff",
      accent2: "#ff36b9",
      surface: "#121725"
    },
    fontFamily: "Aquire, Orbitron, Inter, ui-sans-serif, system-ui",
    tags: ["dark", "cyberpunk", "tech"]
  },
  {
    label: "Pastel Creative Agency",
    profile: "pastel-collage",
    layoutVariant: "collage",
    texture: "noise",
    contrast: "soft",
    colorStyle: "rose, mint, butter, ink",
    layoutStyle: "playful overlapping blocks",
    navStyle: "soft tab navigation",
    heroStyle: "friendly collage hero",
    palette: {
      background: "#fff7fb",
      text: "#24302f",
      muted: "#687675",
      accent: "#ff8fb3",
      accent2: "#8edfc4",
      surface: "#ffffff"
    },
    fontFamily: "Vorage, Inter, ui-sans-serif, system-ui",
    tags: ["pastel", "agency", "creative"]
  },
  {
    label: "Japanese Minimal",
    profile: "zen-minimal",
    layoutVariant: "minimal",
    texture: "paper",
    contrast: "soft",
    colorStyle: "warm rice, sumi black, vermilion",
    layoutStyle: "quiet vertical rhythm",
    navStyle: "minimal inline navigation",
    heroStyle: "calm whitespace with small image band",
    palette: {
      background: "#f7f2e8",
      text: "#1b1b1b",
      muted: "#736d62",
      accent: "#c8492c",
      accent2: "#2f5d50",
      surface: "#fffaf0"
    },
    fontFamily: "Vorage, 'Trebuchet MS', Inter, sans-serif",
    tags: ["japanese", "minimal", "calm"]
  },
  {
    label: "Retro Y2K",
    profile: "retro-console",
    layoutVariant: "console",
    texture: "chrome",
    contrast: "high",
    colorStyle: "silver, violet, bubblegum",
    layoutStyle: "chrome cards and compact widgets",
    navStyle: "rounded chrome tabs",
    heroStyle: "nostalgic stacked panels",
    palette: {
      background: "#eceef7",
      text: "#161529",
      muted: "#6c6b7e",
      accent: "#7c3aed",
      accent2: "#ff4fb8",
      surface: "#ffffff"
    },
    fontFamily: "Aquire, Verdana, Inter, sans-serif",
    tags: ["retro", "y2k", "playful"]
  },
  {
    label: "Glassmorphism",
    profile: "glass-lab",
    layoutVariant: "glass",
    texture: "grid",
    contrast: "soft",
    colorStyle: "mist, teal, violet",
    layoutStyle: "layered translucent panels",
    navStyle: "floating glass pill",
    heroStyle: "soft dimensional hero",
    palette: {
      background: "#edf7f7",
      text: "#152529",
      muted: "#61777a",
      accent: "#00a4a6",
      accent2: "#8b5cf6",
      surface: "rgba(255,255,255,0.78)"
    },
    fontFamily: "Aquire, Inter, ui-sans-serif, system-ui",
    tags: ["glass", "modern", "soft"]
  },
  {
    label: "Corporate Professional",
    profile: "corporate-signal",
    layoutVariant: "corporate",
    texture: "none",
    contrast: "soft",
    colorStyle: "white, navy, amber",
    layoutStyle: "trust-focused business layout",
    navStyle: "classic corporate navigation",
    heroStyle: "measured headline with proof strip",
    palette: {
      background: "#f8fafc",
      text: "#15233c",
      muted: "#667085",
      accent: "#1e4f8f",
      accent2: "#d99a2b",
      surface: "#ffffff"
    },
    fontFamily: "Aquire, Inter, ui-sans-serif, system-ui",
    tags: ["corporate", "professional", "trust"]
  }
];

const frameworkOptions = ["Tailwind CSS", "Bootstrap", "Bulma", "Foundation", "Vanilla CSS"];
const animationOptions = ["GSAP", "Framer Motion", "CSS animations", "Lenis smooth scroll", "Scroll-triggered CSS"];

const pageSets: Record<WebsiteType, Array<{ id: string; name: string; slug: string }>> = {
  portfolio: [
    { id: "home", name: "Home", slug: "/" },
    { id: "about", name: "About", slug: "/about" },
    { id: "case-study", name: "Case Study", slug: "/case-study" },
    { id: "contact", name: "Contact", slug: "/contact" }
  ],
  ecommerce: [
    { id: "home", name: "Home", slug: "/" },
    { id: "collection", name: "Collection", slug: "/collection" },
    { id: "product", name: "Product Detail", slug: "/product" },
    { id: "checkout", name: "Checkout Mockup", slug: "/checkout" }
  ],
  shopline: [
    { id: "home", name: "Home", slug: "/" },
    { id: "collection", name: "Collection", slug: "/collection" },
    { id: "product", name: "Product Detail", slug: "/product" },
    { id: "cart", name: "Cart", slug: "/cart" }
  ],
  shopify: [
    { id: "home", name: "Home", slug: "/" },
    { id: "collection", name: "Collection", slug: "/collections/all" },
    { id: "product", name: "Product", slug: "/products/example" },
    { id: "page", name: "Page", slug: "/pages/about" }
  ]
};

function settingFromArchetype(arch: Archetype, index: number): EditableSettings {
  return {
    colors: arch.palette,
    typography: {
      fontFamily: arch.fontFamily,
      headingSize: [54, 62, 48, 68, 50][index % 5],
      bodySize: [16, 17, 18, 15][index % 4],
      fontWeight: [600, 700, 800, 500][index % 4],
      lineHeight: [1.15, 1.22, 1.3, 1.45][index % 4]
    },
    layout: {
      radius: [0, 8, 14, 22, 32][index % 5],
      spacing: [56, 72, 88, 104][index % 4],
      shadow: (["none", "soft", "bold"] as const)[index % 3]
    },
    reduceMotion: false
  };
}

function cloneItems(type: SectionType, kind: WebsiteType) {
  if (type === "products" || type === "collection") {
    const nouns =
      kind === "portfolio"
        ? ["Brand Sprint", "Identity System", "Commerce Redesign", "Motion Kit"]
        : ["Atelier Jacket", "Studio Lamp", "Cloud Runner", "Daily Serum"];
    return nouns.map((title, index) => ({
      title,
      price: kind === "portfolio" ? `Case ${index + 1}` : `$${[84, 129, 56, 42][index]}`,
      badge: ["New", "Featured", "Limited", "Best Seller"][index],
      body: kind === "portfolio" ? "A concise project story with measurable results." : "Clean product copy with a flexible merchandising angle."
    }));
  }

  if (type === "features") {
    return ["Strategy", "Design System", "Conversion", "Launch"].map((title, index) => ({
      title,
      body: [
        "Sharpen the message and section order.",
        "Reusable blocks with consistent design controls.",
        "Pages shaped for exploration and action.",
        "Export a clean structure for the next step."
      ][index]
    }));
  }

  if (type === "faq") {
    return [
      { question: "Can I edit this visually?", answer: "Yes, content, colors, typography, spacing, visibility, and section order are editable." },
      { question: "Can I export the code?", answer: "Yes, exports include project files, README instructions, and platform-specific structure where needed." },
      { question: "Does it include mobile layouts?", answer: "Templates are responsive and can be previewed in desktop, tablet, and mobile modes." }
    ];
  }

  if (type === "reviews" || type === "testimonials") {
    return [
      { quote: "The template gave us a polished start without boxing us in.", author: "Jordan Lee" },
      { quote: "Fast to customize, clear to hand off, and good on mobile.", author: "Priya Shah" },
      { quote: "The export structure saved hours during implementation.", author: "Marcus Reed" }
    ];
  }

  if (type === "pricing") {
    return [
      { title: "Launch", price: "$29", body: "Core pages and essential blocks." },
      { title: "Growth", price: "$79", body: "Expanded sections and storefront flows." },
      { title: "Studio", price: "$149", body: "Everything for a multi-page launch." }
    ];
  }

  return undefined;
}

function profileCopy(arch: Archetype, type: SectionType, kind: WebsiteType) {
  const commerce = kind !== "portfolio";
  const profileBodies: Record<DesignProfile, string> = {
    "swiss-editorial": "Structured grids, index labels, and confident negative space create a premium editorial rhythm.",
    "brutalist-poster": "Poster-scale typography, hard borders, and intentional friction make every section feel loud and authored.",
    "saas-luminous": "Soft product surfaces, luminous CTAs, and crisp comparison blocks make the offer easy to scan.",
    "luxury-editorial": "High-contrast serif moments, cinematic image crops, and restrained copy create a luxury magazine feel.",
    "cyber-interface": "Neon telemetry, scanline panels, and animated command surfaces create a futuristic launch system.",
    "pastel-collage": "Layered collage blocks, playful cards, and friendly color shifts create a creative studio personality.",
    "zen-minimal": "Calm spacing, quiet dividers, and precise type hierarchy create a considered browsing experience.",
    "retro-console": "Chrome panels, compact widgets, and nostalgic interaction details create a playful Y2K interface.",
    "glass-lab": "Translucent cards, depth cues, and clean gradients make the template feel dimensional and modern.",
    "corporate-signal": "Trust-led structure, proof rows, and measured hierarchy create a professional conversion path."
  };

  if (type === "hero") {
    return commerce
      ? `${arch.label} storefront with ${arch.heroStyle}, real commerce flows, and a visual system that feels campaign-ready.`
      : `${arch.label} portfolio with ${arch.heroStyle}, authored project stories, and motion-ready presentation.`;
  }

  return profileBodies[arch.profile];
}

function section(
  type: SectionType,
  title: string,
  arch: Archetype,
  kind: WebsiteType,
  index: number,
  overrides: Partial<TemplateSection> = {}
): TemplateSection {
  const commerce = kind !== "portfolio";
  const content: Record<string, string> = {
    brand: arch.label.split(" ")[0] || "Forge",
    eyebrow: arch.label,
    heading:
      type === "hero"
        ? commerce
          ? `${arch.label} storefront built for confident browsing.`
          : `${arch.label} portfolio for memorable work.`
        : title,
    body: profileCopy(arch, type, kind),
    primaryCta: commerce ? "Shop collection" : "View projects",
    secondaryCta: commerce ? "Read reviews" : "Download resume",
    links: commerce ? "Shop, Collections, Journal, Support" : "Work, About, Services, Contact"
  };

  return {
    id: `${type}-${index}`,
    type,
    title,
    visible: true,
    content,
    items: cloneItems(type, kind),
    styles: {
      background: index % 2 === 0 ? arch.palette.background : arch.palette.surface,
      text: arch.palette.text,
      accent: arch.palette.accent,
      paddingY: [48, 64, 82, 96][index % 4],
      radius: [0, 10, 18, 28][index % 4],
      columns: type === "products" || type === "features" ? 4 : type === "testimonials" || type === "pricing" ? 3 : 2,
      align:
        arch.layoutVariant === "minimal"
          ? "left"
          : arch.layoutVariant === "poster" || arch.layoutVariant === "magazine"
            ? index % 2 === 0
              ? "split"
              : "left"
            : type === "hero"
              ? "split"
              : index % 3 === 0
                ? "center"
                : "left",
      profile: arch.profile,
      layoutVariant: arch.layoutVariant,
      texture: arch.texture,
      contrast: arch.contrast
    },
    ...overrides
  };
}

function baseSections(type: WebsiteType, arch: Archetype): TemplateSection[] {
  const shared: TemplateSection[] = [
    section("navbar", "Navigation", arch, type, 1),
    section("hero", "Hero", arch, type, 2),
    section("features", type === "portfolio" ? "Services and Skills" : "Features", arch, type, 3)
  ];

  if (type === "portfolio") {
    return [
      ...shared,
      section("projects", "Selected Projects", arch, type, 4, { items: cloneItems("products", type) }),
      section("about", "About", arch, type, 5),
      section("testimonials", "Client Notes", arch, type, 6),
      section("contact", "Contact", arch, type, 7),
      section("footer", "Footer", arch, type, 8)
    ];
  }

  return [
    section("announcement", "Announcement Bar", arch, type, 0),
    ...shared,
    section("products", "Product Grid", arch, type, 4),
    section("productDetail", "Product Detail Gallery", arch, type, 5, { items: cloneItems("products", type) }),
    section("collection", "Collection and Filters", arch, type, 6),
    section("search", "Search Interface", arch, type, 7),
    section("cart", "Cart and Checkout", arch, type, 8),
    section("reviews", "Reviews", arch, type, 9),
    section("newsletter", "Newsletter", arch, type, 10),
    section("faq", "FAQ", arch, type, 11),
    section("footer", "Footer", arch, type, 12)
  ];
}

function pageSections(pageId: string, type: WebsiteType, sections: TemplateSection[]) {
  const byType = (wanted: SectionType[]) => sections.filter((entry) => wanted.includes(entry.type));

  if (type === "portfolio") {
    if (pageId === "about") return byType(["navbar", "about", "features", "testimonials", "contact", "footer"]);
    if (pageId === "case-study") return byType(["navbar", "projects", "features", "testimonials", "contact", "footer"]);
    if (pageId === "contact") return byType(["navbar", "contact", "faq", "footer"]);
  } else {
    if (pageId === "collection") return byType(["announcement", "navbar", "collection", "products", "reviews", "footer"]);
    if (pageId === "product") return byType(["announcement", "navbar", "productDetail", "reviews", "faq", "footer"]);
    if (pageId === "checkout" || pageId === "cart") return byType(["announcement", "navbar", "cart", "faq", "footer"]);
    if (pageId === "page") return byType(["announcement", "navbar", "about", "features", "newsletter", "footer"]);
  }

  return sections;
}

function frameworkFor(category: TemplateCategory, index: number) {
  if (category === "static") return "HTML/CSS/JavaScript";
  if (category === "react") return ["React + Tailwind Components", "React + GSAP Components", "React + Headless UI Patterns", "React + Component Bento Kit"][index % 4];
  if (category === "framework") return frameworkOptions[index % frameworkOptions.length];
  return `Tailwind CSS + ${animationOptions[index % animationOptions.length]}`;
}

function exportTypeFor(category: TemplateCategory, type: WebsiteType): ExportType {
  if (type === "shopify") return "shopify";
  if (type === "shopline") return "shopline";
  if (category === "static") return "static";
  if (category === "animated") return "animated";
  if (category === "react") return "framework";
  return "framework";
}

function animationFor(category: TemplateCategory, index: number) {
  return category === "animated" ? animationOptions[index % animationOptions.length] : undefined;
}

function buildTemplate(category: TemplateCategory, type: WebsiteType, arch: Archetype, index: number): TemplateMetadata {
  const categoryLabel = categories.find((entry) => entry.id === category)?.label ?? category;
  const typeLabel = websiteTypes.find((entry) => entry.id === type)?.label ?? type;
  const settings = settingFromArchetype(arch, index);
  const framework = frameworkFor(category, index);
  const templateName = `${arch.label} ${typeLabel.replace(" Websites", "").replace("Simple ", "").replace(" Projects", "")}`;
  const id = slugify(`${category}-${type}-${arch.label}-${index + 1}`);
  const sections = baseSections(type, arch).map((entry, sectionIndex) => ({
    ...entry,
    id: `${id}-${entry.type}-${sectionIndex}`,
    content: {
      ...entry.content,
      category,
      ...(category === "react" && sectionIndex >= 2
        ? {
            componentPack: ["Bento Intelligence", "Command Surface", "Metric Streams", "Configurator Lab"][sectionIndex % 4]
          }
        : {})
    }
  }));
  const pages: TemplatePage[] = pageSets[type].map((page) => ({
    ...page,
    sections: pageSections(page.id, type, sections).map((entry) => ({ ...entry }))
  }));

  return {
    id,
    name: templateName,
    category,
    websiteType: type,
    framework,
    animationLibrary: animationFor(category, index),
    tags: [...arch.tags, categoryLabel, typeLabel, framework],
    previewImage: `/assets/template-${(index % 6) + 1}.svg`,
    description: `${arch.label} ${typeLabel.toLowerCase()} with ${arch.heroStyle}, ${arch.navStyle}, and a ${arch.layoutStyle}. Export type: ${exportTypeFor(category, type)}.`,
    colorStyle: arch.colorStyle,
    layoutStyle: arch.layoutStyle,
    navStyle: arch.navStyle,
    heroStyle: arch.heroStyle,
    designProfile: arch.profile,
    pages,
    sections,
    editableSettings: settings,
    exportType: exportTypeFor(category, type)
  };
}

export const templates: TemplateMetadata[] = categories.flatMap((category) =>
  websiteTypes.flatMap((type) => archetypes.map((arch, index) => buildTemplate(category.id, type.id, arch, index)))
);

export const categoryOptions = categories;
export const websiteTypeOptions = websiteTypes;
export const frameworkFilterOptions = ["All", "HTML/CSS/JavaScript", ...frameworkOptions, ...animationOptions, "Shopify Liquid", "Shopline-ready"];

export function getTemplateById(id: string) {
  return templates.find((template) => template.id === id);
}

export function getFeaturedTemplates() {
  return [
    templates.find((template) => template.category === "animated" && template.websiteType === "portfolio"),
    templates.find((template) => template.category === "framework" && template.websiteType === "ecommerce"),
    templates.find((template) => template.category === "static" && template.websiteType === "shopify"),
    templates.find((template) => template.category === "animated" && template.websiteType === "shopline")
  ].filter(Boolean) as TemplateMetadata[];
}
