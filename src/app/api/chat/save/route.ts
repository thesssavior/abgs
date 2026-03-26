import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { sessionId, characterId, messages } = body as {
    sessionId?: string;
    characterId?: string;
    messages?: unknown[];
  };

  if (!sessionId || !characterId || !Array.isArray(messages)) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const db = supabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from as any)("chat_messages").upsert(
    {
      session_id: sessionId,
      character_id: characterId,
      messages,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,character_id" },
  );

  if (error) {
    console.error("[chat/save] supabase error:", error);
    return NextResponse.json({ error: "save failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
