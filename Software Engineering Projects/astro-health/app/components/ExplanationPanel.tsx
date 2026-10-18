"use client";

import { X, Sparkles, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import type { Flag, Explanation, ReviewStatus } from "@/lib/types";
import { urgencyCopy } from "@/lib/indicators";

interface ExplanationPanelProps {
  flag: Flag;
  explanation: Explanation | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onReview: (flag: Flag, status: ReviewStatus, note: string) => Promise<void>;
  disabled: boolean;
}

export default function ExplanationPanel({ flag, explanation, loading, error, onClose, onReview, disabled }: ExplanationPanelProps) {
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(flag.review_status);
  const [note, setNote] = useState(flag.review_note);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  useEffect(() => { setReviewStatus(flag.review_status); setNote(flag.review_note); }, [flag.review_status, flag.review_note]);
  return (
    <div
      className="explanation-enter rounded-2xl border border-signal-teal/30 bg-hull-850 p-5 shadow-glow"
      role="region"
      aria-live="polite"
      aria-label={`Explanation for ${flag.label} on mission day ${flag.day}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-signal-teal">
          <Sparkles size={16} />
          <h3 className="text-sm font-semibold">
            {flag.label} — day {flag.day}
          </h3>
        </div>
        <button
          onClick={onClose}
          aria-label="Close explanation"
          className="rounded-md p-2 text-hull-400 hover:bg-hull-800 hover:text-hull-100"
        >
          <X size={16} />
        </button>
      </div>

      <p className="mt-1 text-xs text-hull-400">
        {flag.value.toFixed(2)} {flag.unit}
        {flag.expected_value !== null &&
          ` — personal baseline expected ${flag.expected_value.toFixed(2)} ${flag.unit}`}
        {flag.injected_anomaly && ` — simulated event: ${flag.injected_anomaly}`}
      </p>

      <div className="mt-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-hull-300">
            <Loader2 size={16} className="animate-spin" />
            Generating a plain-language explanation…
          </div>
        )}

        {!loading && error && (
          <div className="flex items-start gap-2 rounded-lg border border-signal-amber/30 bg-signal-amber/10 p-3 text-sm text-signal-amber">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            <span>{error} The flag is still logged; try again to generate the action summary.</span>
          </div>
        )}

        {!loading && !error && explanation && (
          <div className="space-y-3">
            <p className="text-[11px] uppercase tracking-wide text-hull-500">{explanation.source === "ai_assisted" ? "AI-assisted summary · local demo actions" : "Local rule-based explanation"}</p>
            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
                urgencyCopy(explanation.urgency).className
              }`}
            >
              {urgencyCopy(explanation.urgency).label}
            </span>
            <p className="text-sm leading-relaxed text-hull-100">{explanation.explanation}</p>
            <div className="rounded-lg bg-hull-800/80 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-hull-400">Suggested action</p>
              <p className="mt-1 text-sm text-hull-200">{explanation.suggested_action}</p>
            </div>
          </div>
        )}
      </div>
      <form className="mt-5 space-y-3 border-t border-hull-700 pt-4" onSubmit={async (event) => {
        event.preventDefault(); setSaving(true); setSaveError(""); setSaveMessage("");
        try { await onReview(flag, reviewStatus, note); setSaveMessage("Follow-up saved to the mission log."); }
        catch (err) { setSaveError(err instanceof Error ? err.message : "Couldn't save follow-up."); }
        finally { setSaving(false); }
      }}>
        <p className="text-sm font-semibold text-hull-200">Record your next step</p>
        <fieldset disabled={saving || disabled} className="space-y-3 disabled:opacity-50">
          <label className="block text-xs text-hull-400">Review status
            <select value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ReviewStatus)} className="mt-1 min-h-11 w-full rounded-lg border border-hull-600 bg-hull-900 px-3 text-sm text-hull-100">
              <option value="open">Awaiting review</option><option value="follow_up">Follow-up planned</option><option value="reviewed">Reviewed</option>
            </select>
          </label>
          <label className="block text-xs text-hull-400">Action or follow-up note
            <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} rows={2} placeholder="Measurement verified, recheck planned, or medical support contacted…" className="mt-1 w-full rounded-lg border border-hull-600 bg-hull-900 p-3 text-sm text-hull-100" />
          </label>
          <button className="flex min-h-11 items-center gap-2 rounded-lg border border-signal-teal/40 px-3 text-sm font-medium text-signal-teal" type="submit">{saving && <Loader2 size={14} className="animate-spin" />}Save follow-up</button>
        </fieldset>
        <p className="text-[11px] leading-5 text-hull-500">Demo support only; follow approved mission medical protocols. Reviewing a flag records your response and does not medically clear the reading.</p>
        {(saveMessage || saveError) && <p role={saveError ? "alert" : "status"} className={`text-xs ${saveError ? "text-signal-rose" : "text-signal-teal"}`}>{saveError || saveMessage}</p>}
      </form>
    </div>
  );
}
