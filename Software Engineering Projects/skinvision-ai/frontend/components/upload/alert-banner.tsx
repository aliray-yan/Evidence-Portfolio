import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

export function AlertBanner({ title, messages }: { title: string; messages: string[] }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-error/20 bg-error-tint px-5 py-4 text-error">
      <WarningCircle size={20} className="mt-0.5 shrink-0" weight="fill" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <ul className="mt-1 space-y-0.5 text-sm">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
