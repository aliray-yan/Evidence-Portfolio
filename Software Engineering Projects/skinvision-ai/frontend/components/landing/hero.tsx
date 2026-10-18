import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FaceScanIllustration } from "./face-scan-illustration";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-32">
      <div>
        <h1 className="max-w-xl font-display text-4xl leading-[1.1] text-ink sm:text-5xl lg:text-6xl">
          See your skin the way a trained eye might.
        </h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
          Upload a photo and get an AI-assisted look at visible skin concerns —
          with plain-language explanations and general guidance. Not a
          diagnosis, just a clearer starting point.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/analyze">
            <Button size="lg">Analyze your skin</Button>
          </Link>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-ink-muted underline decoration-line underline-offset-4 hover:text-ink"
          >
            See how it works
          </a>
        </div>
        <p className="mt-8 max-w-md text-xs leading-relaxed text-ink-muted">
          SkinVision AI provides general, educational information only. It is
          not a substitute for professional medical advice, diagnosis, or
          treatment.
        </p>
      </div>
      <div className="flex justify-center lg:justify-end">
        <FaceScanIllustration />
      </div>
    </section>
  );
}
