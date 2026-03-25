import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import { parseChatRequest } from "@/lib/chat-payload";

const WS_URL = process.env.THEHACK_SUME_WS_URL || "";
const WS_TOKEN = process.env.THEHACK_SUME_API_TOKEN || "";
const PERSONA_PROFILE_ID = process.env.THEHACK_SUME_PERSONA_PROFILE_ID || "lee-seol";

const WS_REPLY_TIMEOUT_MS = 25_000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = parseChatRequest(body);

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status },
    );
  }

  const { characterId, messages } = parsed.data;
  const character = getCharacter(characterId);

  if (!character) {
    return NextResponse.json({ error: "캐릭터를 찾을 수 없어요" }, { status: 404 });
  }

  // Extract the latest user message
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return NextResponse.json({ error: "메시지가 없어요" }, { status: 400 });
  }

  // Session ID from client (localStorage-based) or fallback
  const clientSessionId = typeof (body as Record<string, unknown>)?.sessionId === "string"
    ? ((body as Record<string, unknown>).sessionId as string).trim()
    : "";
  const sessionId = clientSessionId || `abgs:${characterId}:anon`;

  if (!WS_URL || !WS_TOKEN) {
    return NextResponse.json({
      message: getFallbackResponse(character.id, messages.length),
    });
  }

  try {
    let reply = await sendViaWebSocket(sessionId, lastUserMessage.content);
    // Worker tool loop can timeout on cold DO — retry once
    if (reply.includes("could not finish tool processing")) {
      reply = await sendViaWebSocket(sessionId, lastUserMessage.content);
    }
    return NextResponse.json({ message: reply });
  } catch {
    return NextResponse.json({
      message: getFallbackResponse(character.id, messages.length),
    });
  }
}

async function sendViaWebSocket(sessionId: string, text: string): Promise<string> {
  const url = new URL(WS_URL);
  url.searchParams.set("token", WS_TOKEN);
  url.searchParams.set("sessionId", sessionId);
  url.searchParams.set("personaProfileId", PERSONA_PROFILE_ID);

  return new Promise<string>((resolve, reject) => {
    const ws = new WebSocket(url.toString());
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error("timeout"));
    }, WS_REPLY_TIMEOUT_MS);

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "message", text }));
    });

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(String(event.data)) as {
          type: string;
          text?: string;
          code?: string;
          message?: string;
        };
        if (data.type === "reply" && data.text) {
          clearTimeout(timer);
          ws.close();
          resolve(data.text);
        } else if (data.type === "error") {
          clearTimeout(timer);
          ws.close();
          reject(new Error(data.message || data.code || "ws_error"));
        }
        // typing events are ignored — we just wait for reply
      } catch {
        // ignore parse errors on intermediate messages
      }
    });

    ws.addEventListener("error", () => {
      clearTimeout(timer);
      reject(new Error("ws_connection_error"));
    });

    ws.addEventListener("close", () => {
      clearTimeout(timer);
      // If we haven't resolved yet, it's an error
    });
  });
}

function getFallbackResponse(charId: string, msgCount: number): string {
  const responses: Record<string, string[]> = {
    yuna: [
      "ㅋㅋ 진짜? 더 얘기해봐",
      "헐 그거 영화 소재감인데",
      "아 나 지금 편집실인데 집중 안 돼서 폰 봄",
      "음... 너 은근 재밌는 사람이네",
      "그런 얘기 하면 나 더 궁금해지잖아",
      "야 택시 타고 오면 안 돼? ㅋㅋ 농담",
    ],
  };

  const charResponses = responses[charId] || [
    "ㅎㅎ 재밌다~ 더 얘기해줘!",
  ];
  return charResponses[msgCount % charResponses.length];
}
