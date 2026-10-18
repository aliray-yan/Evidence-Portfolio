import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import { SKILL_CATEGORIES } from "@/lib/data/skills";

export const metadata: Metadata = {
  title: "Skills | Cyber Portfolio CMS",
  description: "Technical abilities across security and development.",
};

export default function SkillsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <PageHeader title="Skills" />

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        {SKILL_CATEGORIES.map((category) => (
          <div key={category.title}>
            <h2 className="font-semibold uppercase tracking-wide text-sm text-primary">
              {category.title}
            </h2>
            <ul className="mt-4 space-y-3">
              {category.skills.map((skill) => (
                <li key={skill.name}>
                  <Card padding="sm">
                    <p className="text-sm font-medium text-foreground">
                      {skill.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {skill.level}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
