import type { Metadata } from "next";
import { GITHUB_URL, LINKEDIN_URL, SITE_EMAIL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact | Cyber Portfolio CMS",
  description: "Get in touch.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-100 md:text-4xl">
        Contact
      </h1>

      <div className="mt-8 flex flex-wrap gap-6 text-sm">
        <a
          href={`mailto:${SITE_EMAIL}`}
          className="focus-ring rounded text-cyan-400 hover:underline"
        >
          {SITE_EMAIL}
        </a>
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring rounded text-slate-400 hover:text-cyan-400"
        >
          LinkedIn
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring rounded text-slate-400 hover:text-cyan-400"
        >
          GitHub
        </a>
      </div>

      <p className="mt-4 text-sm text-slate-400">
        Typical response time: within 2–3 business days.
      </p>

      <form className="mt-10 space-y-5">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-100"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            disabled
            className="focus-ring mt-2 w-full rounded border border-navy-800 bg-navy-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 disabled:opacity-60"
            placeholder="Your name"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-100"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            disabled
            className="focus-ring mt-2 w-full rounded border border-navy-800 bg-navy-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 disabled:opacity-60"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-slate-100"
          >
            Subject
          </label>
          <input
            id="subject"
            name="subject"
            type="text"
            disabled
            className="focus-ring mt-2 w-full rounded border border-navy-800 bg-navy-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 disabled:opacity-60"
            placeholder="What's this about?"
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-slate-100"
          >
            Message
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            disabled
            className="focus-ring mt-2 w-full rounded border border-navy-800 bg-navy-900 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 disabled:opacity-60"
            placeholder="Your message"
          />
        </div>

        <button
          type="button"
          disabled
          className="focus-ring w-full rounded bg-cyan-400 px-6 py-3 text-sm font-semibold text-navy-950 opacity-60 md:w-auto"
        >
          Send Message
        </button>

        <p className="text-xs text-slate-400">
          Form submission coming in a future phase.
        </p>
      </form>
    </div>
  );
}
