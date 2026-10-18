"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Info, TriangleAlert } from "lucide-react";
import type {
  Indicator,
  Flag,
  MissionStatus,
  DataProvenance as DataProvenanceType,
  Explanation,
  AdvanceResult,
  InjectAnomalyResult,
  CheckIn,
  ReviewStatus,
} from "@/lib/types";
import TopBar from "./components/TopBar";
import Sidebar from "./components/Sidebar";
import MissionControls from "./components/MissionControls";
import MissionBriefing from "./components/MissionBriefing";
import OverviewStrip from "./components/OverviewStrip";
import HazardBodyMap from "./components/HazardBodyMap";
import IndicatorCard from "./components/IndicatorCard";
import AlertLog from "./components/AlertLog";
import DataProvenance from "./components/DataProvenance";
import ExplanationPanel from "./components/ExplanationPanel";
import CrewCheckIn from "./components/CrewCheckIn";
import ChallengeEvidence from "./components/ChallengeEvidence";

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error || (typeof body?.detail === "string" ? body.detail : `Request failed (${res.status}). Check the supplied values and try again.`));
  return body as T;
}

export default function DashboardPage() {
  const [status, setStatus] = useState<MissionStatus | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [allowCloud, setAllowCloud] = useState(false);
  const [provenance, setProvenance] = useState<DataProvenanceType | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [navOpen, setNavOpen] = useState(false);

  const [selectedFlag, setSelectedFlag] = useState<Flag | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  const [liveMode, setLiveMode] = useState(false);
  const explanationRequest = useRef(0);
  // Ref mirror of `flags` so liveTick always compares against the latest
  // value without needing `flags` in its own dependency array (which would
  // tear down and rebuild the interval on every tick).
  const flagsRef = useRef<Flag[]>([]);
  useEffect(() => {
    flagsRef.current = flags;
  }, [flags]);

  const refresh = useCallback(async () => {
    const [s, i, f, c] = await Promise.all([
      getJson<MissionStatus>("/api/mission/status"),
      getJson<Indicator[]>("/api/indicators"),
      getJson<Flag[]>("/api/flags"),
      getJson<CheckIn[]>("/api/check-ins"),
    ]);
    setStatus(s);
    setIndicators(i);
    setFlags(f);
    flagsRef.current = f;
    setCheckIns(c);
    setConnected(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
        const p = await getJson<DataProvenanceType>("/api/data-provenance");
        setProvenance(p);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load mission data.");
        setConnected(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  // Runs after React actually commits the explanation panel to the DOM
  // (state setters in handleExplain are async, so scrolling from inside
  // that handler would run before the panel exists on a first click).
  useEffect(() => {
    if (selectedFlag) {
      document.getElementById("explanation")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedFlag]);

  const runAction = useCallback(
    async (action: () => Promise<AdvanceResult | InjectAnomalyResult | { status: string }>) => {
      setBusy(true);
      setError(null);
      try {
        await action();
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Action failed.");
        setConnected(false);
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const handleAdvance = (days: number) =>
    runAction(() =>
      getJson<AdvanceResult>("/api/mission/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      }),
    );

  const handleInjectAnomaly = (indicator: string | undefined) =>
    runAction(() =>
      getJson<InjectAnomalyResult>("/api/mission/inject-anomaly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ indicator: indicator ?? null }),
      }),
    );

  const handleReset = (astronaut_name: string, data_profile: string | null) => {
    explanationRequest.current += 1;
    setSelectedFlag(null);
    setExplanation(null);
    return runAction(() =>
      getJson<{ status: string }>("/api/mission/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ astronaut_name, data_profile }),
      }),
    );
  };

  const handleExplain = useCallback(async (flag: Flag) => {
    const requestId = ++explanationRequest.current;
    setSelectedFlag(flag);
    setExplanation(null);
    setExplainError(null);
    setExplainLoading(true);
    try {
      const result = await getJson<Explanation>("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          indicator: flag.indicator,
          label: flag.label,
          hazard: flag.hazard,
          day: flag.day,
          value: flag.value,
          unit: flag.unit,
          expected_value: flag.expected_value,
          injected_anomaly: flag.injected_anomaly,
          allow_cloud: allowCloud,
        }),
      });
      if (requestId === explanationRequest.current) setExplanation(result);
    } catch (e) {
      if (requestId === explanationRequest.current) setExplainError(e instanceof Error ? e.message : "Couldn't generate an explanation.");
    } finally {
      if (requestId === explanationRequest.current) setExplainLoading(false);
    }
  }, [allowCloud]);

  const handleSaveCheckIn = async (entry: CheckIn) => {
    const saved = await getJson<CheckIn>("/api/check-ins", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry),
    });
    setCheckIns((previous) => [saved, ...previous.filter((item) => item.day !== saved.day)].sort((a, b) => b.day - a.day));
  };

  const handleReviewFlag = async (flag: Flag, review_status: ReviewStatus, review_note: string) => {
    await getJson("/api/flags/review", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indicator: flag.indicator, day: flag.day, review_status, review_note }),
    });
    const updated = await getJson<Flag[]>("/api/flags");
    setFlags(updated);
    flagsRef.current = updated;
    setSelectedFlag((current) => current ? updated.find((item) => item.indicator === current.indicator && item.day === current.day) ?? current : null);
  };

  const handleExport = async () => {
    const report = await getJson<Record<string, unknown>>("/api/mission/report");
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url; link.download = `astro-health-mission-day-${status?.current_day ?? 0}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // One autonomous step of "live monitoring": advance the mission by a day,
  // the way a real continuous sensor feed would on its own, then check
  // whether that step surfaced something new. If it did, stop on its own
  // and explain it — the point is a system that watches itself, not one
  // that needs a human driving every click.
  const tickingRef = useRef(false);
  const liveTick = useCallback(async () => {
    if (tickingRef.current) return; // guard against overlapping ticks if a request runs long
    tickingRef.current = true;
    setBusy(true);
    const prevKeys = new Set(flagsRef.current.map((f) => `${f.indicator}-${f.day}`));
    try {
      await getJson<AdvanceResult>("/api/mission/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 1 }),
      });
      const [s, i, f] = await Promise.all([
        getJson<MissionStatus>("/api/mission/status"),
        getJson<Indicator[]>("/api/indicators"),
        getJson<Flag[]>("/api/flags"),
      ]);
      setStatus(s);
      setIndicators(i);
      setFlags(f);
      flagsRef.current = f;
      setConnected(true);

      const freshFlags = f.filter((x) => !prevKeys.has(`${x.indicator}-${x.day}`));
      if (freshFlags.length > 0) {
        setLiveMode(false); // auto-pause the moment there's something to look at
        await handleExplain(freshFlags[0]);
      }
    } catch (e) {
      setLiveMode(false);
      setError(e instanceof Error ? e.message : "Live monitoring stopped unexpectedly.");
      setConnected(false);
    } finally {
      tickingRef.current = false;
      setBusy(false);
    }
  }, [handleExplain]);

  useEffect(() => {
    if (!liveMode) return;
    const id = setInterval(liveTick, 1800);
    return () => clearInterval(id);
  }, [liveMode, liveTick]);

  const handleToggleLive = () => {
    if (busy || !status) return;
    setError(null);
    setLiveMode((v) => !v);
  };

  const latestFlagByIndicator: Record<string, Flag> = {};
  for (const f of flags) {
    const existing = latestFlagByIndicator[f.indicator];
    if (!existing || f.day > existing.day) latestFlagByIndicator[f.indicator] = f;
  }

  const indicatorLabels = Object.fromEntries(indicators.map((i) => [i.key, i.label]));

  return (
    <div className="min-h-dvh">
      <TopBar status={status} connected={connected} onMenuClick={() => setNavOpen(true)} />

      <div className="mx-auto flex max-w-7xl gap-6 px-4 sm:px-6">
        <Sidebar status={status} open={navOpen} onClose={() => setNavOpen(false)} ready={!loading} />

        <main className="min-w-0 flex-1 py-6 sm:py-8">
          {error && (
            <div
              className="mb-6 flex items-start gap-2 rounded-xl border border-signal-rose/30 bg-signal-rose/10 p-4 text-sm leading-6 text-signal-rose"
              role="alert"
            >
              <TriangleAlert size={16} className="mt-1 shrink-0" />
              <div>
                <p className="font-semibold">Mission request needs attention.</p>
                <p>{error}</p>
                <button type="button" className="mt-2 min-h-9 underline" onClick={async () => {
                  try { await refresh(); setProvenance(await getJson<DataProvenanceType>("/api/data-provenance")); setError(null); }
                  catch (err) { setError(err instanceof Error ? err.message : "Connection failed."); }
                }}>Retry connection</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="space-y-4" aria-label="Loading mission dashboard">
              <div className="h-56 animate-pulse rounded-2xl border border-hull-700 bg-hull-850/70" />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="h-24 animate-pulse rounded-xl bg-hull-850/70" />
                <div className="h-24 animate-pulse rounded-xl bg-hull-850/70" />
                <div className="h-24 animate-pulse rounded-xl bg-hull-850/70" />
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              <section id="overview" className="scroll-mt-24 space-y-4">
                <MissionBriefing
                  status={status}
                  indicators={indicators}
                  flags={flags}
                  provenance={provenance}
                  liveMode={liveMode}
                  onPrimaryAction={handleToggleLive}
                  disabled={busy || !status}
                />

                <MissionControls
                  status={status}
                  profiles={provenance?.profiles ?? []}
                  busy={busy}
                  liveMode={liveMode}
                  onToggleLive={handleToggleLive}
                  indicatorKeys={indicators.map((i) => i.key)}
                  indicatorLabels={indicatorLabels}
                  onAdvance={handleAdvance}
                  onInjectAnomaly={handleInjectAnomaly}
                  onReset={handleReset}
                />

                {status && status.current_day === 0 && (
                  <div className="flex items-start gap-2 rounded-xl border border-hull-700 bg-hull-850/60 p-3 text-xs text-hull-300">
                    <Info size={15} className="mt-0.5 shrink-0 text-signal-teal" />
                    <p>
                      New mission, day 0. Click <strong>Start monitoring</strong> and the system runs on its
                      own — it advances a day at a time, establishes a {status.baseline_days_required}-day
                      personal baseline, and pauses itself the moment it has something to explain. (Or step
                      manually with +1/+7 days, and use <strong>Inject anomaly</strong> to guarantee one for a
                      demo.)
                    </p>
                  </div>
                )}

                <OverviewStrip indicators={indicators} />

                <label className="flex items-start gap-3 rounded-xl border border-hull-700 p-3 text-xs leading-5 text-hull-400">
                  <input type="checkbox" checked={allowCloud} disabled={liveMode || explainLoading} onChange={(event) => setAllowCloud(event.target.checked)} className="mt-1 accent-teal-400" />
                  <span>Use optional cloud AI summaries. If enabled and configured, flagged simulated readings are sent to OpenRouter. Check-in notes stay local. Local rule-based explanations are the default.</span>
                </label>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                  <div className="order-2 lg:order-1">
                    {selectedFlag && (
                      <div id="explanation">
                        <ExplanationPanel
                          key={`${selectedFlag.indicator}-${selectedFlag.day}`}
                          flag={selectedFlag}
                          explanation={explanation}
                          loading={explainLoading}
                          error={explainError}
                          onReview={handleReviewFlag}
                          disabled={busy || liveMode}
                          onClose={() => {
                            explanationRequest.current += 1;
                            setExplainLoading(false);
                            setSelectedFlag(null);
                            setExplanation(null);
                            setExplainError(null);
                          }}
                        />
                      </div>
                    )}
                    {!selectedFlag && (
                      <div className="flex h-full items-center rounded-2xl border border-dashed border-hull-700 p-5 text-sm text-hull-500">
                        Click <strong className="mx-1 text-hull-300">Explain</strong> on a flagged indicator or
                        alert-log entry to see a plain-language explanation here.
                      </div>
                    )}
                  </div>
                  <div className="order-1 lg:order-2">
                    <HazardBodyMap indicators={indicators} />
                  </div>
                </div>
              </section>

              <section id="check-in" className="scroll-mt-24">
                <CrewCheckIn key={`${status?.astronaut_name}-${status?.current_day}`} status={status} checkIns={checkIns} disabled={busy || liveMode || !connected} onSave={handleSaveCheckIn} onExport={handleExport} />
              </section>

              <section id="indicators" className="scroll-mt-24 space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-hull-400">All indicators</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {indicators.map((ind) => (
                    <IndicatorCard
                      key={ind.key}
                      indicator={ind}
                      flag={latestFlagByIndicator[ind.key] ?? null}
                      onExplain={handleExplain}
                      explainLoading={explainLoading && selectedFlag?.indicator === ind.key}
                    />
                  ))}
                </div>
              </section>

              <section id="alerts" className="scroll-mt-24">
                <AlertLog
                  flags={flags}
                  onExplain={handleExplain}
                  explainingKey={
                    explainLoading && selectedFlag ? `${selectedFlag.indicator}-${selectedFlag.day}` : null
                  }
                />
              </section>

              <section id="data-sources" className="scroll-mt-24">
                <div className="mb-4"><ChallengeEvidence /></div>
                <DataProvenance provenance={provenance} />
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
