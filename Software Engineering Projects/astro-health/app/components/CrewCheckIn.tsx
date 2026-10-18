"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Download, Loader2 } from "lucide-react";
import type { CheckIn, MissionStatus } from "@/lib/types";

const scales = [
  { key: "mood", label: "Mood", low: "Low", high: "Good" },
  { key: "energy", label: "Energy", low: "Depleted", high: "Energized" },
  { key: "stress", label: "Stress", low: "Low", high: "High" },
  { key: "sleep_quality", label: "Sleep quality", low: "Poor", high: "Restful" },
] as const;

export default function CrewCheckIn({ status, checkIns, disabled, onSave, onExport }: {
  status: MissionStatus | null;
  checkIns: CheckIn[];
  disabled: boolean;
  onSave: (entry: CheckIn) => Promise<void>;
  onExport: () => Promise<void>;
}) {
  const day = status?.current_day ?? 0;
  const saved = checkIns.find((entry) => entry.day === day);
  const [scores, setScores] = useState({ mood: 3, energy: 3, stress: 3, sleep_quality: 3 });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setScores({ mood: saved?.mood ?? 3, energy: saved?.energy ?? 3, stress: saved?.stress ?? 3, sleep_quality: saved?.sleep_quality ?? 3 });
    setNotes(saved?.notes ?? "");
    setError("");
  }, [day, saved]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setMessage("");
    try { await onSave({ day, ...scores, notes }); setMessage(`Day ${day} check-in saved to this mission.`); }
    catch (err) { setError(err instanceof Error ? err.message : "Couldn't save the check-in."); }
    finally { setSaving(false); }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-hull-700 bg-hull-850/70 shadow-panel">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hull-700 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-hull-100"><ClipboardCheck size={18} className="text-signal-teal" /> Daily crew check-in</h2>
          <p className="mt-1 text-xs text-hull-400">How you feel adds context that a sensor can miss.</p>
        </div>
        <button type="button" disabled={exporting || !status || disabled} onClick={async () => {
          setExporting(true); setError("");
          try { await onExport(); } catch (err) { setError(err instanceof Error ? err.message : "Export failed."); }
          finally { setExporting(false); }
        }} className="flex min-h-11 items-center gap-2 rounded-lg border border-hull-600 px-3 text-xs text-hull-200 hover:bg-hull-800 disabled:opacity-40">
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export mission report
        </button>
      </div>
      <div className="grid gap-6 p-5 xl:grid-cols-[1.3fr_1fr]">
        <form onSubmit={save} className="space-y-4">
          <p className="text-xs font-medium text-signal-teal">{day > 0 ? `Mission day ${day} · ${saved ? "check-in recorded" : "awaiting your check-in"}` : "Advance to day 1 to begin"}</p>
          <fieldset disabled={disabled || saving || day < 1} className="space-y-4 disabled:opacity-50">
            <legend className="sr-only">Wellbeing scores, from one to five</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {scales.map(({ key, label, low, high }) => (
                <div key={key}>
                  <p id={`score-${key}`} className="mb-2 text-sm text-hull-200">{label}</p>
                  <div role="group" aria-labelledby={`score-${key}`} className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-pressed={scores[key] === value} aria-label={`${label}: ${value} of 5`} onClick={() => setScores((prev) => ({ ...prev, [key]: value }))} className={`tabular min-h-11 flex-1 rounded-lg border text-sm ${scores[key] === value ? "border-signal-teal bg-signal-teal/15 text-signal-teal" : "border-hull-600 text-hull-400 hover:bg-hull-800"}`}>{value}</button>)}
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-hull-500"><span>1 · {low}</span><span>5 · {high}</span></div>
                </div>
              ))}
            </div>
            <label className="block text-sm text-hull-200">Symptoms or mission context <span className="text-xs text-hull-500">(optional)</span>
              <textarea value={notes} maxLength={1000} rows={3} onChange={(event) => setNotes(event.target.value)} placeholder="Recent exercise, interrupted sleep, workload, or anything you want to record…" className="mt-2 w-full rounded-lg border border-hull-600 bg-hull-900 p-3 text-sm text-hull-100" />
            </label>
            <button type="submit" className="flex min-h-11 items-center gap-2 rounded-lg bg-signal-teal px-4 text-sm font-semibold text-hull-950">{saving && <Loader2 size={15} className="animate-spin" />}{saved ? "Update check-in" : "Save check-in"}</button>
          </fieldset>
          <p className="text-xs leading-5 text-hull-500">Self-reported context, not a clinical score. Stored in your local mission database. The report includes your notes; share it deliberately.</p>
        </form>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-hull-400">Recent check-ins</h3>
          <p className="mt-1 text-xs text-hull-500">Scores from 1–5 · higher stress means more stress.</p>
          {checkIns.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-hull-600 p-4 text-sm leading-6 text-hull-400">A short daily check-in helps you discuss sleep, workload, and wellbeing alongside the simulated vitals.</p> : (
            <div className="mt-3 max-h-80 space-y-2 overflow-auto">
              {checkIns.slice(0, 7).map((entry) => <div key={entry.day} className="rounded-xl border border-hull-700 bg-hull-900/50 p-3">
                <p className="text-xs font-semibold text-hull-200">Day {entry.day}</p>
                <p className="mt-1 text-xs leading-5 text-hull-400">Mood {entry.mood} · Energy {entry.energy} · Stress {entry.stress} · Sleep {entry.sleep_quality}</p>
                {entry.notes && <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-hull-300">{entry.notes}</p>}
              </div>)}
            </div>
          )}
        </div>
      </div>
      {(message || error) && <p role={error ? "alert" : "status"} className={`px-5 pb-5 text-sm ${error ? "text-signal-rose" : "text-signal-teal"}`}>{error || message}</p>}
    </div>
  );
}
