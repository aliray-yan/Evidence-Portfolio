export default function ThinkingDots() {
  return (
    <div
      role="status"
      aria-label="Assistant is thinking"
      className="flex items-center gap-1 py-0.5"
    >
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s] motion-reduce:animate-none" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s] motion-reduce:animate-none" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none" />
    </div>
  );
}
