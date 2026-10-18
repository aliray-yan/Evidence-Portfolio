import { Hero } from "@/components/landing/hero";
import { ProcessSteps } from "@/components/landing/process-steps";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProcessSteps />
      <footer className="border-t border-line px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl text-xs leading-relaxed text-ink-muted">
          SkinVision AI is an educational tool and does not provide medical
          diagnoses. Uploaded photos are analyzed in memory and are not stored.
          If you have a skin concern that is painful, spreading quickly, or
          worrying you, please consult a dermatologist or other qualified
          healthcare professional.
        </div>
      </footer>
    </>
  );
}
