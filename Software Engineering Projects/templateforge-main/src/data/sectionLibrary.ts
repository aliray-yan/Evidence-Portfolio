import { TemplateSection } from "@/lib/types";

const base = {
  visible: true,
  styles: {
    paddingY: 76,
    radius: 20,
    align: "split" as const
  }
};

export const sectionLibrary: TemplateSection[] = [
  {
    ...base,
    id: "lib-hero-editorial",
    type: "hero",
    title: "Editorial Hero",
    content: {
      eyebrow: "New collection",
      heading: "A composed landing page with a strong editorial lead.",
      body: "Use this section when the first impression needs quiet confidence and a sharp call to action.",
      primaryCta: "Explore",
      secondaryCta: "View details"
    },
    styles: { ...base.styles, align: "split", columns: 2 }
  },
  {
    ...base,
    id: "lib-navbar-center",
    type: "navbar",
    title: "Centered Navbar",
    content: {
      brand: "TemplateForge",
      links: "Work, Services, Pricing, Contact",
      cta: "Start"
    },
    styles: { ...base.styles, paddingY: 24, align: "center" }
  },
  {
    ...base,
    id: "lib-features-grid",
    type: "features",
    title: "Feature Grid",
    content: {
      eyebrow: "Capabilities",
      heading: "Everything needed for a complete website.",
      body: "A clean grid for features, services, or platform benefits."
    },
    items: [
      { title: "Visual editing", body: "Adjust copy, colors, spacing, and imagery." },
      { title: "Responsive canvas", body: "Preview desktop, tablet, and mobile." },
      { title: "Export-ready", body: "Generate clean files for handoff." }
    ],
    styles: { ...base.styles, columns: 3, align: "center" }
  },
  {
    ...base,
    id: "lib-pricing-three",
    type: "pricing",
    title: "Three-Tier Pricing",
    content: {
      eyebrow: "Plans",
      heading: "Simple pricing for every stage.",
      body: "Use for SaaS, services, memberships, and creator offers."
    },
    items: [
      { title: "Starter", price: "$19", body: "Launch-ready essentials." },
      { title: "Studio", price: "$49", body: "Advanced sections and support." },
      { title: "Scale", price: "$99", body: "Everything for growing teams." }
    ],
    styles: { ...base.styles, columns: 3, align: "center" }
  },
  {
    ...base,
    id: "lib-testimonials",
    type: "testimonials",
    title: "Testimonials",
    content: {
      eyebrow: "Loved by clients",
      heading: "Clear proof with a polished rhythm.",
      body: "Drop in quotes, client names, and short outcomes."
    },
    items: [
      { quote: "The site felt premium on day one.", author: "Mira Chen" },
      { quote: "We moved faster without losing taste.", author: "Owen Brooks" },
      { quote: "A tidy system for a messy launch.", author: "Nadia Hart" }
    ],
    styles: { ...base.styles, columns: 3, align: "center" }
  },
  {
    ...base,
    id: "lib-faq",
    type: "faq",
    title: "FAQ",
    content: {
      eyebrow: "Questions",
      heading: "Answers before the handoff.",
      body: "A compact FAQ section for common conversion blockers."
    },
    items: [
      { question: "Can this be customized?", answer: "Yes, every major section has editable content and style settings." },
      { question: "Is the export clean?", answer: "Exports are structured by assets, pages, components, and README files." },
      { question: "Does it support mobile?", answer: "The templates and editor preview are responsive." }
    ],
    styles: { ...base.styles, columns: 1, align: "left" }
  },
  {
    ...base,
    id: "lib-product-cards",
    type: "products",
    title: "Product Cards",
    content: {
      eyebrow: "Shop",
      heading: "A focused product grid.",
      body: "Cards include title, price, badge, and action text."
    },
    items: [
      { title: "Core Tee", price: "$48", badge: "New" },
      { title: "Canvas Tote", price: "$34", badge: "Popular" },
      { title: "Studio Cap", price: "$29", badge: "Limited" },
      { title: "Weekend Set", price: "$88", badge: "Bundle" }
    ],
    styles: { ...base.styles, columns: 4, align: "center" }
  },
  {
    ...base,
    id: "lib-contact",
    type: "contact",
    title: "Contact Form",
    content: {
      eyebrow: "Contact",
      heading: "Start the conversation.",
      body: "A simple lead capture block with name, email, and project details.",
      primaryCta: "Send message"
    },
    styles: { ...base.styles, columns: 2, align: "split" }
  },
  {
    ...base,
    id: "lib-newsletter",
    type: "newsletter",
    title: "Newsletter",
    content: {
      eyebrow: "Newsletter",
      heading: "Get launches and notes in your inbox.",
      body: "A clean signup section with a concise promise.",
      primaryCta: "Subscribe"
    },
    styles: { ...base.styles, align: "center" }
  },
  {
    ...base,
    id: "lib-footer",
    type: "footer",
    title: "Footer",
    content: {
      brand: "TemplateForge",
      links: "Privacy, Terms, Contact, Instagram",
      body: "Built with care for fast launches."
    },
    styles: { ...base.styles, paddingY: 42, align: "split" }
  },
  {
    ...base,
    id: "lib-team",
    type: "team",
    title: "Team Grid",
    content: {
      eyebrow: "Team",
      heading: "People behind the work.",
      body: "A flexible team section for agencies, startups, and collectives."
    },
    items: [
      { name: "Ava Stone", role: "Creative Director" },
      { name: "Leo Park", role: "Product Designer" },
      { name: "Sam Rivera", role: "Frontend Engineer" }
    ],
    styles: { ...base.styles, columns: 3, align: "center" }
  },
  {
    ...base,
    id: "lib-logo-wall",
    type: "logoWall",
    title: "Logo Wall",
    content: {
      eyebrow: "Trusted by",
      heading: "A compact brand proof section.",
      body: "Use this for client logos, press mentions, or integration partners."
    },
    items: [
      { title: "Northline" },
      { title: "Orbital" },
      { title: "Minato" },
      { title: "Velvet" },
      { title: "Juniper" }
    ],
    styles: { ...base.styles, columns: 5, align: "center" }
  },
  {
    ...base,
    id: "lib-blog-cards",
    type: "blog",
    title: "Blog Cards",
    content: {
      eyebrow: "Journal",
      heading: "Latest stories and guides.",
      body: "A compact editorial block for articles and updates."
    },
    items: [
      { title: "Designing a calmer launch", body: "A practical note on homepage hierarchy." },
      { title: "Product pages that convert", body: "A checklist for commerce storytelling." },
      { title: "Motion with restraint", body: "How to add polish without distraction." }
    ],
    styles: { ...base.styles, columns: 3, align: "center" }
  }
];
