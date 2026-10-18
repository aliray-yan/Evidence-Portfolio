export function DisclaimerBanner() {
  return (
    <div className="rounded-2xl border border-line bg-paper px-6 py-5 text-sm leading-relaxed text-ink-muted">
      <p className="font-medium text-ink">This is not a medical diagnosis.</p>
      <p className="mt-1">
        SkinVision AI provides general, educational information about visible
        skin features. It cannot assess anything beneath the skin's surface
        and can make mistakes. If a concern is painful, spreading quickly, or
        worrying you, please see a dermatologist or other qualified healthcare
        professional.
      </p>
    </div>
  );
}
