interface PlaceholderBannerProps {
  message: string;
  phase?: string;
}

export default function PlaceholderBanner({
  message,
  phase,
}: PlaceholderBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-muted px-4 py-3 text-sm">
      <span aria-hidden="true" className="mt-0.5 text-primary">
        ⓘ
      </span>
      <p className="text-muted-foreground">
        {message}
        {phase && (
          <span className="ml-2 rounded-full bg-card px-2 py-0.5 text-xs font-medium text-primary">
            {phase}
          </span>
        )}
      </p>
    </div>
  );
}
