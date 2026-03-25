import { NextRequest, NextResponse } from "next/server";

const WS_URL = process.env.THEHACK_SUME_WS_URL || "";
const WS_TOKEN = process.env.THEHACK_SUME_API_TOKEN || "";
const PERSONA_PROFILE_ID = process.env.THEHACK_SUME_PERSONA_PROFILE_ID || "yuna-lim";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId") || "";
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  if (!WS_URL || !WS_TOKEN) {
    return NextResponse.json({ error: "ws not configured" }, { status: 503 });
  }

  const url = new URL(WS_URL);
  url.searchParams.set("token", WS_TOKEN);
  url.searchParams.set("sessionId", sessionId);
  url.searchParams.set("personaProfileId", PERSONA_PROFILE_ID);

  return NextResponse.json({ url: url.toString() });
}
