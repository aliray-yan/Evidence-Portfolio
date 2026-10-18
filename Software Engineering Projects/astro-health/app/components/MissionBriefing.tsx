"use client";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Database,
  Gauge,
  Radio,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { DataProvenance, Flag, Indicator, MissionStatus } from "@/lib/types";

interface MissionBriefingProps {
  status: MissionStatus | null;
  indicators: Indicator[];
  flags: Flag[];
  provenance: DataProvenance | null;
  liveMode: boolean;
  onPrimaryAction: () => void;
  disabled: boolean;
}

function latestFlag(flags: Flag[]): Flag | null {
  if (flags.length === 0) return null;
  return [...flags].sort((a, b) => b.day - a.day)[0];
}

function postureCopy(indicators: Indicator[], status: MissionStatus | null, flags: Flag[]) {
  const activeFlags = indicators.filter((indicator) => indicator.flagged).length;
  const mostRecent = latestFlag(flags);
  const pending = flags.filter((flag) => flag.review_status !== "reviewed");

  if (!status) {
    return {
      label: "Awaiting feed",
      tone: "border-hull-600 bg-hull-800/70 text-hull-300",
      icon: Radio,
      action: "Start the backend and refresh the dashboard.",
    };
  }

  if (!status.baseline_established) {
    const remaining = Math.max(0, status.baseline_days_required - status.current_day);
    return {
      label: "Learning baseline",
      tone: "border-signal-amber/35 bg-signal-amber/10 text-signal-amber",
      icon: Gauge,
      action: `${remaining} more mission day${remaining === 1 ? "" : "s"} before the initial personal baseline is available.`,
    };
  }

  if (activeFlags > 0 && mostRecent) {
    return {
      label: `${activeFlags} active flag${activeFlags === 1 ? "" : "s"}`,
      tone: "border-signal-rose/35 bg-signal-rose/10 text-signal-rose",
      icon: ShieldAlert,
      action: `Review ${mostRecent.label.toLowerCase()} from mission day ${mostRecent.day}.`,
    };
  }

  if (pending.length > 0) {
    return {
      label: `${pending.length} pending review${pending.length === 1 ? "" : "s"}`,
      tone: "border-signal-amber/35 bg-signal-amber/10 text-signal-amber",
      icon: TriangleAlert,
      action: "Latest readings are within the modeled trend. Earlier flags still need your review or follow-up.",
    };
  }

  return {
    label: "Nominal watch",
    tone: "border-signal-teal/35 bg-signal-teal/10 text-signal-teal",
    icon: CheckCircle2,
    action: "Continue monitoring. The system will pause itself when a new flag appears.",
  };
}

export default function MissionBriefing({
  status,
  indicators,
  flags,
  provenance,
  liveMode,
  onPrimaryAction,
  disabled,
}: MissionBriefingProps) {
  const posture = postureCopy(indicators, status, flags);
  const PostureIcon = posture.icon;
  const realDatasetCount = provenance?.citation.integrated_datasets.length ?? 0;
  const monitoredCount = indicators.filter((indicator) => indicator.baseline_established).length;
  const latest = latestFlag(flags);

  return (
    <section className="overflow-hidden rounded-2xl border border-hull-700 bg-hull-850/80 shadow-panel">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
        <div className="border-b border-hull-700 p-5 sm:p-6 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-hull-400">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hull-600 px-2.5 py-1">
              <Radio size={12} className={liveMode ? "text-signal-teal" : "text-hull-500"} />
              {liveMode ? "Autonomous watch active" : "Autonomous watch ready"}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-hull-600 px-2.5 py-1">
              <Database size={12} className="text-signal-teal" />
              {realDatasetCount || "No"} NASA OSDR dataset{realDatasetCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-5 max-w-3xl">
            <h1 className="text-3xl font-semibold leading-tight text-hull-100 sm:text-4xl">
              Crew Health Decision Console
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-hull-300">
              Simulated long-duration telemetry is gathered, compared against this astronaut&apos;s own baseline,
              and translated into a next action when something drifts.
            </p>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            {[
              { label: "Gather", copy: "Mission-day vitals stream in from the simulator.", icon: Activity },
              { label: "Evaluate", copy: "Personal baseline plus anomaly detection scores each trend.", icon: Gauge },
              { label: "Act", copy: "Record follow-up and prepare a mission health report.", icon: Sparkles },
            ].map(({ label, copy, icon: Icon }, index) => (
              <div key={label} className="rounded-xl border border-hull-700 bg-hull-900/45 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-hull-100">
                  <Icon size={15} className="text-signal-teal" />
                  {label}
                  {index < 2 && <ArrowRight size={13} className="ml-auto hidden text-hull-600 sm:block" />}
                </div>
                <p className="mt-1 text-xs leading-5 text-hull-400">{copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-5 p-5 sm:p-6">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${posture.tone}`}>
              <PostureIcon size={15} />
              {posture.label}
            </div>
            <p className="mt-4 text-sm leading-6 text-hull-200">{posture.action}</p>
            {latest && (
              <p className="mt-2 text-xs leading-5 text-hull-500">
                Latest flag: {latest.label}, day {latest.day}, {latest.value.toFixed(1)} {latest.unit}.
              </p>
            )}
          </div>

          <dl className="grid grid-cols-3 gap-3">
            <div>
              <dt className="text-[11px] text-hull-500">Mission Day</dt>
              <dd className="tabular mt-1 text-xl font-semibold text-hull-100">{status?.current_day ?? 0}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-hull-500">Baselined</dt>
              <dd className="tabular mt-1 text-xl font-semibold text-hull-100">
                {monitoredCount}/{indicators.length || 5}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-hull-500">Flags</dt>
              <dd className="tabular mt-1 text-xl font-semibold text-hull-100">{flags.length}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={onPrimaryAction}
            disabled={disabled}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-signal-teal px-4 py-2 text-sm font-semibold text-hull-950 transition hover:brightness-110 focus-visible:outline-signal-teal disabled:opacity-40"
          >
            {liveMode ? "Pause monitoring" : status?.baseline_established ? "Continue monitoring" : "Start baseline run"}
          </button>

          <div className="flex items-start gap-2 rounded-xl border border-signal-amber/30 bg-signal-amber/10 p-3 text-xs leading-5 text-signal-amber">
            <TriangleAlert size={14} className="mt-0.5 shrink-0" />
            <p>
              Demo telemetry only. Trends are simulated from published spaceflight research; selected noise profiles
              come from real Inspiration4 OSDR biomarker datasets.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
