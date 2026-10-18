import { NextResponse } from "next/server";
import { proxyJson, BackendUnreachableError } from "@/lib/backend";

export async function POST(req: Request) {
  let payload;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  try {
    const { body, status } = await proxyJson("/api/flags/review", { method: "POST", body: JSON.stringify(payload) });
    return NextResponse.json(body, { status });
  } catch (err) {
    if (err instanceof BackendUnreachableError) return NextResponse.json({ error: err.message }, { status: 502 });
    throw err;
  }
}
