import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

export const runtime = "nodejs";

const ExplanationSchema = z.object({
  explanation: z
    .string()
    .describe(
      "2-3 plain-language sentences explaining what changed and why it plausibly happened, for a non-clinician astronaut reading it on a wearable-style dashboard.",
    ),
  suggested_action: z
    .string()
    .describe("1-2 concrete, practical next steps the astronaut can take right now."),
  urgency: z
    .enum(["routine", "monitor", "act_soon"])
    .describe(
      "routine = within personal norm just flagged by sensitivity; monitor = worth watching over the next day or two; act_soon = warrants a call to flight surgeon/ground support soon.",
    ),
});

interface ExplainRequestBody {
  indicator: string;
  label: string;
  hazard: string;
  day: number;
  value: number;
  unit: string;
  expected_value: number | null;
  injected_anomaly: string | null;
  description?: string;
  allow_cloud?: boolean;
}

const RequestSchema = z.object({
  indicator: z.enum(["bone_density", "cardio_hr", "sleep", "radiation", "immune_risk"]),
  label: z.string().min(1).max(100),
  hazard: z.string().max(100),
  day: z.number().int().min(1),
  value: z.number().finite(),
  unit: z.string().max(40),
  expected_value: z.number().finite().nullable(),
  injected_anomaly: z.string().max(100).nullable(),
  description: z.string().max(500).optional(),
  allow_cloud: z.boolean().optional().default(false),
});

function fallbackAction(payload: ExplainRequestBody, deviation: number | null) {
  const direction =
    deviation === null ? "outside the expected range" : deviation > 0 ? "above baseline" : "below baseline";
  const amount =
    deviation === null
      ? "outside the modeled expected range"
      : `${Math.abs(deviation).toFixed(2)} ${payload.unit} ${direction}`;
  const event = payload.injected_anomaly?.replace(/_/g, " ");

  const library: Record<string, { action: string; urgency: "routine" | "monitor" | "act_soon" }> = {
    bone_density: {
      action:
        "Repeat the scan on the next scheduled check, confirm resistive exercise compliance, and review calcium/vitamin-D countermeasures with ground support if the decline continues.",
      urgency: "monitor",
    },
    cardio_hr: {
      action:
        "Verify the resting measurement and record any symptoms or recent activity. Follow the approved mission medical protocol and contact medical support if symptoms or repeated unusual readings appear.",
      urgency: "act_soon",
    },
    sleep: {
      action:
        "Protect the next sleep block, reduce bright-light and stimulant exposure before rest, and run a fatigue check if short sleep repeats.",
      urgency: "monitor",
    },
    radiation: {
      action:
        "Confirm the dosimeter reading, review current space-weather conditions, and follow the mission radiation sheltering protocol if the rise persists.",
      urgency: "act_soon",
    },
    immune_risk: {
      action:
        "Log any symptoms, recheck temperature and wellness markers, tighten hygiene controls, and schedule a medical check-in if the index stays elevated.",
      urgency: "monitor",
    },
  };

  const selected = library[payload.indicator] ?? {
    action: "Repeat the measurement, compare it with recent mission context, and contact ground support if it repeats.",
    urgency: "monitor" as const,
  };

  return {
    explanation: `${payload.label} is ${amount} for this simulated mission on day ${payload.day}. ${
      event
        ? `The simulator labels this as a ${event} event, so treat it as a focused drill rather than a diagnosis.`
        : "The detector flagged it against the astronaut's own recent trend, not a generic population threshold."
    }`,
    suggested_action: selected.action,
    urgency: selected.urgency,
    source: "local_rules" as const,
  };
}

function compactSentences(text: string, maxLength: number) {
  const normalized = text
    .replace(/[•*]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (normalized.length <= maxLength) return normalized;

  const sentences = normalized.match(/[^.!?]+[.!?]+/g) ?? [normalized];
  const out: string[] = [];
  for (const sentence of sentences) {
    const next = [...out, sentence.trim()].join(" ");
    if (next.length > maxLength) break;
    out.push(sentence.trim());
    if (out.length >= 2) break;
  }

  if (out.length > 0) return out.join(" ");
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function normalizeExplanation(
  generated: z.infer<typeof ExplanationSchema>,
  payload: ExplainRequestBody,
  deviation: number | null,
) {
  const fallback = fallbackAction(payload, deviation);
  return {
    explanation: compactSentences(generated.explanation, 360),
    // Approved demo actions stay deterministic; AI only summarizes the observation.
    suggested_action: fallback.suggested_action,
    urgency: fallback.urgency,
    source: "ai_assisted" as const,
  };
}

export async function POST(req: Request) {
  let payload: ExplainRequestBody;
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Provide a valid indicator, mission day, finite reading, and expected value." }, { status: 400 });
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { indicator, label, hazard, day, value, unit, expected_value, injected_anomaly, description } =
    payload;

  if (!indicator || !label || value === undefined || day === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: indicator, label, day, value." },
      { status: 400 },
    );
  }

  const deviation =
    expected_value !== null && expected_value !== undefined
      ? value - expected_value
      : null;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || !payload.allow_cloud) {
    return NextResponse.json(fallbackAction(payload, deviation));
  }

  const openrouter = createOpenRouter({ apiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  const prompt = [
    `Mission day ${day}. Indicator: ${label} (${hazard} hazard category).`,
    description ? `What it measures: ${description}` : null,
    `Flagged reading: ${value} ${unit}.`,
    expected_value !== null && expected_value !== undefined
      ? `Expected value from this astronaut's personal baseline trend: ${expected_value.toFixed(2)} ${unit} (deviation: ${deviation !== null ? (deviation > 0 ? "+" : "") + deviation.toFixed(2) : "unknown"} ${unit}).`
      : `No personal-baseline expected value was available for comparison.`,
    injected_anomaly
      ? `Simulated event on this reading: ${injected_anomaly}.`
      : `This deviation was flagged by the anomaly detector against the astronaut's own trend, not injected as a scripted event.`,
    `Explain this to the astronaut in plain language and suggest what to do next.`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { object } = await generateObject({
      model: openrouter("openrouter/free"),
      schema: ExplanationSchema,
      abortSignal: controller.signal,
      system:
        "You summarize a simulated astronaut-health demonstration, without medical credentials. " +
        "Describe the supplied observation against its personal modeled baseline. All readings are synthetic, and the immune index is experimental. " +
        "Do not infer diseases, claim causes are proven, prescribe treatments, invent measurements, or imply clinical validation. " +
        "Keep the explanation short. An unusual reading is a statistical flag, not a diagnosis. Actions must defer to approved mission medical protocols.",
      prompt,
    });

    return NextResponse.json(normalizeExplanation(object, payload, deviation));
  } catch (err) {
    console.error("OpenRouter explain call failed:", err);
    return NextResponse.json(fallbackAction(payload, deviation));
  } finally {
    clearTimeout(timeout);
  }
}
