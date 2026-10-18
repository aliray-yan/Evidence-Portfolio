const steps = [
  {
    number: "01",
    title: "Upload",
    text: "Choose a clear, front-facing photo taken in natural light.",
  },
  {
    number: "02",
    title: "Analyze",
    text: "The system checks image quality, then looks for visible skin features.",
  },
  {
    number: "03",
    title: "Understand",
    text: "See what was found, with a confidence level and a plain-language explanation for each.",
  },
  {
    number: "04",
    title: "Get guidance",
    text: "Receive general, educational skincare recommendations tied to what was detected.",
  },
];

export function ProcessSteps() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h2 className="max-w-md font-display text-3xl text-ink sm:text-4xl">
        Four steps, no guesswork.
      </h2>
      <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li key={step.number} className="border-t border-line pt-5">
            <span className="font-display text-2xl italic text-teal">{step.number}</span>
            <h3 className="mt-3 text-lg font-medium text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
