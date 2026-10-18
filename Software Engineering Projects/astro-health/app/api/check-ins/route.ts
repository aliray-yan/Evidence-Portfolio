import { NextResponse } from "next/server";
import { proxyJson, BackendUnreachableError } from "@/lib/backend";

async function forward(init?: RequestInit) {
  try {
    const { body, status } = await proxyJson("/api/check-ins", init);
    return NextResponse.json(body, { status });
  } catch (err) {
    if (err instanceof BackendUnreachableError) return NextResponse.json({ error: err.message }, { status: 502 });
    throw err;
  }
}

export async function GET() { return forward(); }
export async function POST(req: Request) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  return forward({ method: "POST", body: JSON.stringify(body) });
}
