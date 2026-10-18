import type { Metadata } from "next";
import PlaceholderBanner from "@/components/ui/PlaceholderBanner";

export const metadata: Metadata = {
  title: "Certifications | Cyber Portfolio CMS",
  description: "Professional development and verified credentials.",
};

const PLACEHOLDER_CERTIFICATIONS = [
  {
    name: "IBM Cybersecurity Analyst Professional Certificate",
    issuer: "IBM",
    year: "2025",
  },
  {
    name: "TryHackMe SOC Level 1",
    issuer: "TryHackMe",
    year: "2025",
  },
  {
    name: "Certificate in Cybersecurity Fundamentals Volume 1",
    issuer: "Independent Study",
    year: "2024",
  },
];

export default function CertificationsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold text-slate-100 md:text-4xl">
        Certifications
      </h1>
      <p className="mt-2 text-slate-400">
        Professional development and verified credentials.
      </p>

      <div className="mt-8">
        <PlaceholderBanner
          message="Certification data will load from the database."
          phase="Phase 3"
        />
      </div>

      <div className="mt-10 space-y-4">
        {PLACEHOLDER_CERTIFICATIONS.map((cert) => (
          <div
            key={cert.name}
            className="rounded-lg border border-navy-800 bg-navy-800 p-5"
          >
            <p className="font-semibold text-slate-100">{cert.name}</p>
            <p className="mt-1 text-sm text-slate-400">
              Issuer: {cert.issuer} &middot; Completed: {cert.year}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
