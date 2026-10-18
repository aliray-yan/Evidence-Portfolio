interface PlaceholderBannerProps {
  message: string;
  phase?: string;
}

export default function PlaceholderBanner({
  message,
  phase,
}: PlaceholderBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-cyan-400/30 bg-navy-900 px-4 py-3 text-sm">
      <span aria-hidden="true" className="mt-0.5 text-cyan-400">
        ⓘ
      </span>
      <p className="text-slate-400">
        {message}
        {phase && (
          <span className="ml-2 rounded bg-navy-800 px-2 py-0.5 text-xs font-medium text-cyan-400">
            {phase}
          </span>
        )}
      </p>
    </div>
  );
}
