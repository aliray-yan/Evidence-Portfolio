import Image from "next/image";

export function Logo({ dense = false }: { dense?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image src="/assets/templateforge-icon.svg" width={dense ? 32 : 42} height={dense ? 32 : 42} alt="" priority />
      <div>
        <div className={dense ? "font-display text-base font-black leading-none" : "font-display text-xl font-black leading-none"}>TemplateForge</div>
        {!dense && <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Visual template builder</div>}
      </div>
    </div>
  );
}
