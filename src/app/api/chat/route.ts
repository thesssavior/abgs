import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import { getCharacterSystemPrompt } from "@/lib/character-prompts";
import {
  parseChatRequest,
  trimChatMessagesForModel,
  type ChatRequestMessage,
} from "@/lib/chat-payload";
import OpenAI from "openai";

// --- Toggle: set USE_OPENAI=1 to use GPT-4o, otherwise use WS worker ---
const USE_OPENAI = process.env.USE_OPENAI === "1";

// OpenAI config
let _openai: OpenAI;
function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// WebSocket worker config
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

  if (USE_OPENAI) {
    return handleOpenAI(characterId, messages, character.id);
  }

  return handleWebSocket(body, characterId, messages, character.id);
}

// ─── OpenAI path ───────────────────────────────────────────────────────

async function handleOpenAI(
  characterId: string,
  messages: ChatRequestMessage[],
  charId: string,
) {
  const modelMessages = trimChatMessagesForModel(messages);
  const systemPrompt = getCharacterSystemPrompt(characterId);

  if (!systemPrompt) {
    return NextResponse.json({ error: "캐릭터 설정을 찾을 수 없어요" }, { status: 500 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      message: getFallbackResponse(charId, modelMessages.length),
    });
  }

  try {
    const completion = await openai().chat.completions.create({
      model: "gpt-4o",
      max_tokens: 256,
      messages: [
        { role: "system", content: systemPrompt },
        ...modelMessages,
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (text) {
      return NextResponse.json({ message: text });
    }

    return NextResponse.json({
      message: getFallbackResponse(charId, modelMessages.length),
    });
  } catch {
    return NextResponse.json({
      message: getFallbackResponse(charId, modelMessages.length),
    });
  }
}

// ─── WebSocket worker path ─────────────────────────────────────────────

async function handleWebSocket(
  body: unknown,
  characterId: string,
  messages: ChatRequestMessage[],
  charId: string,
) {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return NextResponse.json({ error: "메시지가 없어요" }, { status: 400 });
  }

  const clientSessionId =
    typeof (body as Record<string, unknown>)?.sessionId === "string"
      ? ((body as Record<string, unknown>).sessionId as string).trim()
      : "";
  const sessionId = clientSessionId || `abgs:${characterId}:anon`;

  if (!WS_URL || !WS_TOKEN) {
    return NextResponse.json({
      message: getFallbackResponse(charId, messages.length),
    });
  }

  try {
    let reply = await sendViaWebSocket(sessionId, lastUserMessage.content);
    if (reply.includes("could not finish tool processing")) {
      reply = await sendViaWebSocket(sessionId, lastUserMessage.content);
    }
    return NextResponse.json({ message: reply });
  } catch {
    return NextResponse.json({
      message: getFallbackResponse(charId, messages.length),
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
    });
  });
}

// ─── Fallback responses ────────────────────────────────────────────────

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
