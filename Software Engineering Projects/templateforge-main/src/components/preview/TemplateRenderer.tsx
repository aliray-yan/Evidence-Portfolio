"use client";

import { CSSProperties } from "react";
import { TemplatePage, TemplateSection, EditableSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

type RendererProps = {
  page: TemplatePage;
  settings: EditableSettings;
  selectedSectionId?: string;
  editable?: boolean;
  compact?: boolean;
  onSelectSection?: (sectionId: string) => void;
  onUpdateSection?: (sectionId: string, patch: Partial<TemplateSection>) => void;
};

function textStyle(settings: EditableSettings): CSSProperties {
  return {
    "--tf-bg": settings.colors.background,
    "--tf-ink": settings.colors.text,
    "--tf-muted": settings.colors.muted,
    "--tf-accent": settings.colors.accent,
    "--tf-accent-2": settings.colors.accent2,
    "--tf-soft": settings.colors.surface,
    "--tf-radius": `${settings.layout.radius}px`,
    "--tf-font": settings.typography.fontFamily
  } as CSSProperties;
}

function EditableText({
  value,
  className,
  editable,
  onChange,
  as = "div",
  style
}: {
  value: string;
  className?: string;
  editable?: boolean;
  onChange?: (value: string) => void;
  as?: "h1" | "h2" | "p" | "span" | "div";
  style?: CSSProperties;
}) {
  const Tag = as;
  return (
    <Tag
      className={cn(editable && "rounded outline-none focus:ring-2 focus:ring-[var(--tf-accent)]", className)}
      style={style}
      contentEditable={editable}
      suppressContentEditableWarning
      onBlur={(event) => onChange?.(event.currentTarget.textContent ?? "")}
    >
      {value}
    </Tag>
  );
}

function updateContent(section: TemplateSection, key: string, value: string) {
  return { content: { ...section.content, [key]: value } };
}

function profileTag(section: TemplateSection) {
  return (section.styles.profile ?? "template").replace("-", " ");
}

function textureLayer(section: TemplateSection) {
  const texture = section.styles.texture ?? "none";
  if (texture === "none") return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 opacity-[0.18]",
        texture === "grid" && "tf-ambient-grid",
        texture === "scanline" && "bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.16)_0,rgba(255,255,255,0.16)_1px,transparent_1px,transparent_8px)]",
        texture === "paper" && "bg-[radial-gradient(circle_at_20%_20%,rgba(0,0,0,0.09),transparent_1px)] [background-size:18px_18px]",
        texture === "noise" && "bg-[radial-gradient(circle_at_25%_20%,rgba(0,0,0,0.14),transparent_2px),radial-gradient(circle_at_80%_40%,rgba(0,0,0,0.1),transparent_2px)] [background-size:34px_34px]",
        texture === "chrome" && "bg-[linear-gradient(135deg,rgba(255,255,255,0.45),transparent_18%,rgba(255,255,255,0.28)_34%,transparent_58%)]"
      )}
    />
  );
}

function VisualBlock({ section, index, compact }: { section: TemplateSection; index: number; compact?: boolean }) {
  const colors = ["var(--tf-accent)", "var(--tf-accent-2)", "var(--tf-soft)", "var(--tf-ink)"];
  const variant = section.styles.layoutVariant ?? "dashboard";
  const profile = section.styles.profile;
  const dark = section.styles.contrast === "dark";
  const baseClass = cn(
    "relative overflow-hidden border shadow-[0_22px_70px_rgba(0,0,0,0.16)]",
    compact ? "min-h-36 rounded-xl" : "min-h-64 rounded-[var(--tf-radius)]",
    variant === "poster" ? "border-[3px] border-current bg-[var(--tf-bg)]" : "border-black/10 bg-white/50",
    dark && "border-white/15 bg-black"
  );

  if (variant === "poster") {
    return (
      <div className={baseClass}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${colors[index % colors.length]} 0 34%, transparent 34% 100%)` }} />
        <div className="absolute left-6 top-6 border-[3px] border-current bg-[var(--tf-soft)] px-4 py-2 text-2xl font-black uppercase tracking-[0.08em]">
          {String(index + 1).padStart(2, "0")}
        </div>
        <div className="absolute bottom-6 left-6 right-6 grid grid-cols-[1fr_0.7fr] gap-4">
          <div className="h-20 border-[3px] border-current bg-[var(--tf-accent-2)]" />
          <div className="grid gap-3">
            <div className="h-5 bg-current" />
            <div className="h-5 w-2/3 bg-current" />
            <div className="h-12 border-[3px] border-current bg-[var(--tf-accent)]" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "gallery" || profile === "luxury-editorial") {
    return (
      <div className={baseClass}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, ${colors[index % colors.length]}, ${colors[(index + 2) % colors.length]})` }} />
        <div className="absolute inset-6 border border-white/55" />
        <div className="absolute bottom-8 left-8 right-8">
          <div className="mb-4 h-px bg-white/70" />
          <div className="font-luxury text-5xl uppercase leading-none text-white/95">Editorial</div>
          <div className="mt-3 max-w-48 text-xs uppercase tracking-[0.3em] text-white/70">{profileTag(section)}</div>
        </div>
        <div className="absolute right-8 top-8 h-36 w-24 rounded-full border border-white/60" />
      </div>
    );
  }

  if (variant === "console" || profile === "cyber-interface" || profile === "retro-console") {
    return (
      <div className={cn(baseClass, "tf-scanline")}>
        <div className="absolute inset-0 bg-black" />
        <div className="absolute inset-5 rounded-xl border border-[var(--tf-accent)]/70 bg-[var(--tf-soft)]/10 p-5">
          <div className="flex items-center justify-between">
            <div className="h-3 w-28 rounded-full bg-[var(--tf-accent)]" />
            <div className="flex gap-2">
              <span className="h-3 w-10 rounded-full bg-[var(--tf-accent-2)]" />
              <span className="h-3 w-10 rounded-full bg-[var(--tf-accent)]" />
            </div>
          </div>
          <div className="mt-10 flex items-end gap-3">
            {[42, 88, 64, 116, 72].map((height, barIndex) => (
              <div key={height} className="w-full rounded-t bg-[var(--tf-accent)]/80" style={{ height: compact ? height * 0.55 : height, opacity: 0.45 + barIndex * 0.1 }} />
            ))}
          </div>
          <div className="absolute bottom-5 left-5 right-5 grid grid-cols-3 gap-3">
            <div className="h-12 rounded-lg border border-[var(--tf-accent)]/40 bg-white/5" />
            <div className="h-12 rounded-lg border border-[var(--tf-accent-2)]/40 bg-white/5" />
            <div className="h-12 rounded-lg border border-white/20 bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "collage") {
    return (
      <div className={baseClass}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }} />
        <div className="absolute left-8 top-8 h-32 w-44 -rotate-6 rounded-2xl bg-white/80 shadow-xl" />
        <div className="absolute right-10 top-12 h-44 w-36 rotate-6 rounded-2xl bg-[var(--tf-accent-2)] shadow-xl" />
        <div className="absolute bottom-8 left-16 h-28 w-56 rounded-2xl bg-[var(--tf-soft)] shadow-xl" />
        <div className="absolute bottom-12 right-12 h-20 w-20 rounded-full bg-white/70" />
      </div>
    );
  }

  return (
    <div
      className={cn(baseClass, variant === "glass" && "backdrop-blur-xl", variant === "dashboard" && "bg-white/80")}
    >
      <div className="absolute inset-0 opacity-90" style={{ background: `linear-gradient(135deg, ${colors[index % colors.length]}, transparent 68%)` }} />
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full" style={{ background: colors[(index + 1) % colors.length], opacity: 0.58 }} />
      <div className="absolute left-5 top-5 rounded-full border border-white/35 bg-black/20 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white backdrop-blur">
        TF-{String(index + 1).padStart(2, "0")}
      </div>
      <div className="absolute right-5 top-5 grid w-24 gap-2">
        <div className="h-2 rounded-full bg-white/80" />
        <div className="h-2 rounded-full bg-white/45" />
        <div className="h-2 rounded-full bg-white/25" />
      </div>
      <div className="absolute bottom-5 left-5 right-5 grid gap-2">
        <div className="h-3 w-1/3 rounded-full bg-white/80" />
        <div className="h-3 w-2/3 rounded-full bg-white/60" />
        <div className="h-3 w-1/2 rounded-full bg-white/50" />
      </div>
      {section.image && (
        <img
          src={section.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
    </div>
  );
}

function CardGrid({ section, compact }: { section: TemplateSection; compact?: boolean }) {
  const items = section.items ?? [];
  const columns = Math.min(section.styles.columns ?? 3, 4);
  const variant = section.styles.layoutVariant ?? "dashboard";

  if (section.content.componentPack) {
    return <ReactComponentShowcase section={section} compact={compact} />;
  }

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: compact ? "repeat(2, minmax(0, 1fr))" : `repeat(${columns}, minmax(0, 1fr))`
      }}
    >
      {items.map((item, index) => (
        <article
          key={`${item.title ?? item.name ?? index}`}
          className={cn(
            "group relative overflow-hidden border border-black/10 bg-[var(--tf-soft)] p-4 transition hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(0,0,0,0.12)]",
            variant === "poster" ? "rounded-none border-[3px] border-current shadow-none" : "rounded-[calc(var(--tf-radius)*0.75)]",
            variant === "glass" && "bg-white/35 backdrop-blur-xl",
            variant === "console" && "border-[var(--tf-accent)]/40 bg-black/80 text-white"
          )}
        >
          <div className="relative mb-4 aspect-[4/3] overflow-hidden rounded-xl" style={{ background: `linear-gradient(135deg, var(--tf-accent), ${index % 2 ? "var(--tf-accent-2)" : "var(--tf-bg)"})` }}>
            <div className="absolute inset-x-4 top-4 h-2 rounded-full bg-white/70" />
            <div className="absolute bottom-4 left-4 h-12 w-12 rounded-full bg-white/35" />
            <div className="absolute bottom-4 right-4 h-8 w-20 rounded-full bg-black/25" />
            {variant === "poster" && <div className="absolute inset-0 border-[3px] border-current" />}
            {variant === "console" && <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_8px,rgba(255,255,255,.12)_9px)]" />}
          </div>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-sm font-black uppercase tracking-[0.08em]">{item.title ?? item.name}</h3>
            {item.price && <span className="text-xs font-bold text-[var(--tf-accent)]">{item.price}</span>}
          </div>
          {item.badge && <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-bold">{item.badge}</span>}
          {item.body && <p className="mt-3 text-xs leading-5 text-[var(--tf-muted)]">{item.body}</p>}
          {item.quote && <p className="text-sm leading-6 text-[var(--tf-muted)]">&ldquo;{item.quote}&rdquo;</p>}
          {item.author && <p className="mt-3 text-xs font-bold">{item.author}</p>}
          {item.question && <p className="text-sm font-bold">{item.question}</p>}
          {item.answer && <p className="mt-2 text-xs leading-5 text-[var(--tf-muted)]">{item.answer}</p>}
        </article>
      ))}
    </div>
  );
}

function ReactComponentShowcase({ section, compact }: { section: TemplateSection; compact?: boolean }) {
  const pack = section.content.componentPack;
  const panels = [
    {
      title: "Command Menu",
      body: "Search actions, pages, products, and automations.",
      metric: "CMD",
      accent: "var(--tf-accent)"
    },
    {
      title: "Live Metrics",
      body: "Conversion, revenue, visitors, and engagement streams.",
      metric: "+28%",
      accent: "var(--tf-accent-2)"
    },
    {
      title: "Configurator",
      body: "Variant controls, swatches, pricing, and checkout actions.",
      metric: "$128",
      accent: "var(--tf-accent)"
    },
    {
      title: "Timeline",
      body: "Launch plan, case-study milestones, and status updates.",
      metric: "04",
      accent: "var(--tf-accent-2)"
    }
  ];

  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-1" : "lg:grid-cols-[1.1fr_0.9fr]")}>
      <div className="relative overflow-hidden rounded-[var(--tf-radius)] border border-black/10 bg-[var(--tf-ink)] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,var(--tf-accent),transparent_26%),radial-gradient(circle_at_80%_10%,var(--tf-accent-2),transparent_22%)] opacity-30" />
        <div className="relative">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.28em] text-white/55">React Component Pack</div>
              <h3 className="mt-2 text-2xl font-black">{pack}</h3>
            </div>
            <div className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-black">LIVE</div>
          </div>
          <div className="grid gap-3">
            {["Generate hero variant", "Sync section props", "Export component source"].map((label, index) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-black text-xs font-black">{index + 1}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{label}</div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-[var(--tf-accent)]" style={{ width: `${45 + index * 22}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="text-2xl font-black">8.7</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Quality</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="text-2xl font-black">42ms</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Motion</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/10 p-3">
              <div className="text-2xl font-black">A11y</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Ready</div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {panels.map((panel, index) => (
          <article key={panel.title} className="rounded-[calc(var(--tf-radius)*0.75)] border border-black/10 bg-[var(--tf-soft)] p-4 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <span className="rounded-full px-3 py-1 text-xs font-black text-white" style={{ background: panel.accent }}>
                {panel.metric}
              </span>
              <span className="h-9 w-9 rounded-full border border-black/10 bg-white/50" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.08em]">{panel.title}</h3>
            <p className="mt-2 text-xs leading-5 text-[var(--tf-muted)]">{panel.body}</p>
            <div className="mt-4 grid gap-2">
              <div className="h-2 rounded-full bg-[var(--tf-accent)]/40" />
              <div className="h-2 w-2/3 rounded-full bg-[var(--tf-ink)]/20" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SectionBody({
  section,
  settings,
  editable,
  compact,
  onUpdateSection,
  index
}: RendererProps & { section: TemplateSection; index: number }) {
  const headingSize = compact ? Math.max(settings.typography.headingSize * 0.48, 28) : settings.typography.headingSize;
  const bodySize = compact ? 13 : settings.typography.bodySize;
  const contentPatch = (key: string, value: string) => onUpdateSection?.(section.id, updateContent(section, key, value));
  const buttonClass =
    "inline-flex min-h-11 items-center justify-center rounded-[calc(var(--tf-radius)*0.55)] bg-[var(--tf-accent)] px-5 text-sm font-bold text-white shadow-sm";
  const secondaryClass =
    "inline-flex min-h-11 items-center justify-center rounded-[calc(var(--tf-radius)*0.55)] border border-current px-5 text-sm font-bold";

  if (section.type === "navbar") {
    return (
      <div className="flex items-center justify-between gap-4">
        <EditableText value={section.content.brand} editable={editable} onChange={(value) => contentPatch("brand", value)} className="font-black" />
        <div className="hidden flex-wrap items-center gap-4 text-xs font-semibold text-[var(--tf-muted)] sm:flex">
          {(section.content.links ?? "").split(",").map((link) => (
            <span key={link.trim()}>{link.trim()}</span>
          ))}
        </div>
        <EditableText value={section.content.primaryCta ?? "Start"} editable={editable} onChange={(value) => contentPatch("primaryCta", value)} className={buttonClass} />
      </div>
    );
  }

  if (section.type === "announcement") {
    return (
      <div className="flex items-center justify-center gap-3 rounded-full bg-[var(--tf-ink)] px-4 py-3 text-center text-xs font-bold text-white">
        <span>{section.content.eyebrow}</span>
        <EditableText value={section.content.body} editable={editable} onChange={(value) => contentPatch("body", value)} as="span" />
      </div>
    );
  }

  if (section.type === "hero") {
    return (
      <div className={cn("grid items-center gap-8", compact ? "grid-cols-1" : "md:grid-cols-[1.05fr_0.95fr]")}>
        <div>
          <EditableText value={section.content.eyebrow} editable={editable} onChange={(value) => contentPatch("eyebrow", value)} className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-[var(--tf-accent)]" />
          <EditableText
            as="h1"
            value={section.content.heading}
            editable={editable}
            onChange={(value) => contentPatch("heading", value)}
            className="max-w-3xl font-black leading-tight"
            style={{ fontSize: headingSize, fontWeight: settings.typography.fontWeight, lineHeight: settings.typography.lineHeight }}
          />
          <EditableText
            as="p"
            value={section.content.body}
            editable={editable}
            onChange={(value) => contentPatch("body", value)}
            className="mt-5 max-w-2xl text-[var(--tf-muted)]"
            style={{ fontSize: bodySize, lineHeight: 1.75 }}
          />
          <div className="mt-7 flex flex-wrap gap-3">
            <EditableText value={section.content.primaryCta} editable={editable} onChange={(value) => contentPatch("primaryCta", value)} className={buttonClass} />
            <EditableText value={section.content.secondaryCta} editable={editable} onChange={(value) => contentPatch("secondaryCta", value)} className={secondaryClass} />
          </div>
        </div>
        <VisualBlock section={section} index={index} compact={compact} />
      </div>
    );
  }

  if (section.type === "contact") {
    return (
      <div className={cn("grid gap-8", compact ? "grid-cols-1" : "md:grid-cols-2")}>
        <SectionIntro section={section} editable={editable} onPatch={contentPatch} settings={settings} compact={compact} />
        <form className="grid gap-3 rounded-[var(--tf-radius)] border border-black/10 bg-[var(--tf-soft)] p-5">
          <input className="h-11 rounded-md border border-black/10 bg-white/80 px-3 text-sm" placeholder="Name" aria-label="Name" />
          <input className="h-11 rounded-md border border-black/10 bg-white/80 px-3 text-sm" placeholder="Email" aria-label="Email" />
          <textarea className="min-h-24 rounded-md border border-black/10 bg-white/80 px-3 py-2 text-sm" placeholder="Project details" aria-label="Project details" />
          <button className={buttonClass} type="button">
            {section.content.primaryCta}
          </button>
        </form>
      </div>
    );
  }

  if (["products", "projects", "features", "pricing", "testimonials", "faq", "reviews", "team", "logoWall", "blog", "collection"].includes(section.type)) {
    return (
      <div className="grid gap-7">
        <SectionIntro section={section} editable={editable} onPatch={contentPatch} settings={settings} compact={compact} center />
        <CardGrid section={section} compact={compact} />
      </div>
    );
  }

  if (section.type === "productDetail") {
    return (
      <div className={cn("grid gap-8", compact ? "grid-cols-1" : "md:grid-cols-2")}>
        <VisualBlock section={section} index={index} compact={compact} />
        <div className="grid content-center gap-4">
          <SectionIntro section={section} editable={editable} onPatch={contentPatch} settings={settings} compact={compact} />
          <div className="flex gap-2">
            {["XS", "S", "M", "L"].map((size) => (
              <button type="button" key={size} className="h-10 w-10 rounded-md border border-black/15 text-xs font-bold">
                {size}
              </button>
            ))}
          </div>
          <button type="button" className={buttonClass}>
            Add to cart
          </button>
        </div>
      </div>
    );
  }

  if (section.type === "cart" || section.type === "search") {
    return (
      <div className="grid gap-6">
        <SectionIntro section={section} editable={editable} onPatch={contentPatch} settings={settings} compact={compact} />
        <div className={cn("grid gap-4", compact ? "grid-cols-1" : "md:grid-cols-[1fr_0.7fr]")}>
          <div className="rounded-[var(--tf-radius)] border border-black/10 bg-[var(--tf-soft)] p-5">
            <div className="mb-4 h-10 rounded-md bg-white/75" />
            {[1, 2, 3].map((row) => (
              <div key={row} className="mb-3 flex items-center gap-3 rounded-lg bg-white/70 p-3">
                <div className="h-14 w-14 rounded-lg bg-[var(--tf-accent)]/25" />
                <div className="grid flex-1 gap-2">
                  <div className="h-3 w-2/3 rounded-full bg-[var(--tf-ink)]/70" />
                  <div className="h-3 w-1/3 rounded-full bg-[var(--tf-muted)]/40" />
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-[var(--tf-radius)] border border-black/10 bg-[var(--tf-ink)] p-5 text-white">
            <h3 className="font-black">{section.type === "cart" ? "Order Summary" : "Filters"}</h3>
            <div className="mt-5 grid gap-3 text-sm opacity-80">
              <div className="flex justify-between"><span>Subtotal</span><span>$214</span></div>
              <div className="flex justify-between"><span>Shipping</span><span>$12</span></div>
              <div className="flex justify-between font-bold"><span>Total</span><span>$226</span></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <SectionIntro section={section} editable={editable} onPatch={contentPatch} settings={settings} compact={compact} />
      <VisualBlock section={section} index={index} compact={compact} />
    </div>
  );
}

function SectionIntro({
  section,
  editable,
  onPatch,
  settings,
  compact,
  center
}: {
  section: TemplateSection;
  editable?: boolean;
  onPatch: (key: string, value: string) => void;
  settings: EditableSettings;
  compact?: boolean;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-3xl", center && "mx-auto text-center")}>
      <EditableText value={section.content.eyebrow} editable={editable} onChange={(value) => onPatch("eyebrow", value)} className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-[var(--tf-accent)]" />
      <EditableText
        as="h2"
        value={section.content.heading}
        editable={editable}
        onChange={(value) => onPatch("heading", value)}
        className="font-black leading-tight"
        style={{ fontSize: compact ? 26 : Math.max(settings.typography.headingSize * 0.62, 34), lineHeight: settings.typography.lineHeight }}
      />
      <EditableText
        as="p"
        value={section.content.body}
        editable={editable}
        onChange={(value) => onPatch("body", value)}
        className="mt-4 text-[var(--tf-muted)]"
        style={{ fontSize: compact ? 13 : settings.typography.bodySize, lineHeight: 1.75 }}
      />
    </div>
  );
}

export function TemplateRenderer({ page, settings, selectedSectionId, editable, compact, onSelectSection, onUpdateSection }: RendererProps) {
  const visibleSections = page.sections.filter((section) => section.visible);

  return (
    <div className={cn("template-html min-h-full overflow-hidden", compact ? "rounded-xl" : "")} style={textStyle(settings)}>
      {visibleSections.map((section, index) => (
        <section
          key={section.id}
          className={cn(
            "relative overflow-hidden border-b border-black/5 transition",
            section.styles.contrast === "dark" && "border-white/10",
            section.styles.layoutVariant === "poster" && "border-b-[3px] border-current",
            selectedSectionId === section.id && "ring-4 ring-forge-blue",
            editable && "cursor-pointer hover:ring-2 hover:ring-forge-blue/60"
          )}
          style={{
            background: section.styles.background,
            color: section.styles.text,
            padding: compact ? "22px" : `${section.styles.paddingY ?? settings.layout.spacing}px clamp(22px, 5vw, 72px)`
          }}
          onClick={(event) => {
            event.stopPropagation();
            onSelectSection?.(section.id);
          }}
          aria-label={`${section.title} section`}
        >
          {textureLayer(section)}
          <div className={cn("relative z-[1] mx-auto", section.styles.layoutVariant === "poster" ? "max-w-7xl" : "max-w-6xl")}>
            <SectionBody
              page={page}
              settings={settings}
              selectedSectionId={selectedSectionId}
              editable={editable}
              compact={compact}
              onSelectSection={onSelectSection}
              onUpdateSection={onUpdateSection}
              section={section}
              index={index}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
