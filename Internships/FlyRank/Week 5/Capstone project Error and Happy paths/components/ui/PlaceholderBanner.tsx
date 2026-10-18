interface PlaceholderBannerProps {
  message: string;
  phase?: string;
}

export default function PlaceholderBanner({
  message,
  phase,
}: PlaceholderBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <span aria-hidden="true" className="mt-0.5 text-primary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
        >
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 11v5M12 8h.01" />
        </svg>
      </span>
      <p className="text-muted-foreground">
        {message}
        {phase && (
          <span className="ml-2 rounded-md bg-card px-2 py-0.5 font-mono text-[0.6875rem] font-medium uppercase tracking-wide text-primary">
            {phase}
          </span>
        )}
      </p>
    </div>
  );
}
