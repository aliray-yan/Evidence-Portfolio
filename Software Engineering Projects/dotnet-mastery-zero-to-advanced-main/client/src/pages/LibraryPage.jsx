import { BookMarked, Code2, Database, Globe2, Settings2, ShieldCheck, TerminalSquare } from "lucide-react";

const references = [
  { icon: Code2, title: "C#", body: "General-purpose, type-safe language used across backend, desktop, cloud, mobile, and game development." },
  { icon: TerminalSquare, title: ".NET SDK", body: "Developer toolkit that includes compilers, templates, CLI commands, and build tools." },
  { icon: Settings2, title: ".NET runtime", body: "The installed environment that runs compiled .NET applications." },
  { icon: Globe2, title: "ASP.NET Core", body: "High-performance web framework for APIs, MVC apps, Razor Pages, Blazor, and real-time services." },
  { icon: Database, title: "Entity Framework Core", body: "ORM that maps C# objects to relational database tables and supports LINQ queries and migrations." },
  { icon: ShieldCheck, title: "JWT authentication", body: "Token-based authentication strategy commonly used by APIs and single-page apps." },
  { icon: BookMarked, title: "IDE choices", body: "Visual Studio, Rider, and VS Code each support different workflows for .NET development." }
];

export default function LibraryPage() {
  return (
    <section className="page-stack">
      <div className="page-heading">
        <span className="eyebrow">Tool and reference library</span>
        <h1>Core .NET vocabulary</h1>
      </div>
      <div className="reference-grid">
        {references.map((item) => {
          const Icon = item.icon;
          return (
            <article className="reference-card" key={item.title}>
              <Icon size={24} />
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
