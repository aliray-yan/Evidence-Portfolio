export type TemplateCategory = "static" | "framework" | "animated" | "react";

export type WebsiteType = "portfolio" | "ecommerce" | "shopline" | "shopify";

export type ExportType = "static" | "framework" | "animated" | "shopline" | "shopify";

export type DeviceMode = "desktop" | "tablet" | "mobile";

export type SectionType =
  | "announcement"
  | "navbar"
  | "hero"
  | "about"
  | "features"
  | "projects"
  | "products"
  | "productDetail"
  | "cart"
  | "collection"
  | "search"
  | "reviews"
  | "pricing"
  | "testimonials"
  | "faq"
  | "newsletter"
  | "contact"
  | "footer"
  | "team"
  | "logoWall"
  | "blog";

export type DesignProfile =
  | "swiss-editorial"
  | "brutalist-poster"
  | "saas-luminous"
  | "luxury-editorial"
  | "cyber-interface"
  | "pastel-collage"
  | "zen-minimal"
  | "retro-console"
  | "glass-lab"
  | "corporate-signal";

export type EditableSettings = {
  colors: {
    background: string;
    text: string;
    muted: string;
    accent: string;
    accent2: string;
    surface: string;
  };
  typography: {
    fontFamily: string;
    headingSize: number;
    bodySize: number;
    fontWeight: number;
    lineHeight: number;
  };
  layout: {
    radius: number;
    spacing: number;
    shadow: "none" | "soft" | "bold";
  };
  reduceMotion: boolean;
};

export type TemplateSection = {
  id: string;
  type: SectionType;
  title: string;
  visible: boolean;
  locked?: boolean;
  content: Record<string, string>;
  image?: string;
  items?: Array<Record<string, string>>;
  styles: {
    background?: string;
    text?: string;
    accent?: string;
    paddingY?: number;
    radius?: number;
    columns?: number;
    align?: "left" | "center" | "split";
    profile?: DesignProfile;
    layoutVariant?: "magazine" | "poster" | "dashboard" | "catalog" | "gallery" | "console" | "minimal" | "glass" | "corporate" | "collage";
    texture?: "grid" | "noise" | "scanline" | "paper" | "chrome" | "none";
    contrast?: "soft" | "high" | "dark";
  };
};

export type TemplatePage = {
  id: string;
  name: string;
  slug: string;
  sections: TemplateSection[];
};

export type TemplateMetadata = {
  id: string;
  name: string;
  category: TemplateCategory;
  websiteType: WebsiteType;
  framework: string;
  animationLibrary?: string;
  tags: string[];
  previewImage: string;
  description: string;
  colorStyle: string;
  layoutStyle: string;
  navStyle: string;
  heroStyle: string;
  designProfile: DesignProfile;
  pages: TemplatePage[];
  sections: TemplateSection[];
  editableSettings: EditableSettings;
  exportType: ExportType;
};

export type Project = {
  id: string;
  name: string;
  templateId: string;
  updatedAt: string;
  createdAt: string;
  pages: TemplatePage[];
  settings: EditableSettings;
};

export type ExportFile = {
  path: string;
  content: string;
};
