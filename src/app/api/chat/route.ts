import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import { getCharacterSystemPrompt } from "@/lib/character-prompts";
import {
  parseChatRequest,
  trimChatMessagesForModel,
  type ChatRequestMessage,
} from "@/lib/chat-payload";
import { detectLocaleFromHeader, type Locale } from "@/lib/i18n";
import OpenAI from "openai";

// Characters that use the WebSocket worker (all others use OpenAI)
const WS_CHARACTERS = new Set(["yuna"]);

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
  const locale = detectLocaleFromHeader(req.headers.get("accept-language") || "");

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status },
    );
  }

  const { characterId, messages } = parsed.data;
  const character = getCharacter(characterId);

  if (!character) {
    return NextResponse.json({ error: "Character not found" }, { status: 404 });
  }

  if (WS_CHARACTERS.has(characterId)) {
    return handleWebSocket(body, characterId, messages, character.id, locale);
  }

  return handleOpenAI(characterId, messages, character.id, locale);
}

// ─── OpenAI path (Jia, Sera, etc.) ────────────────────────────────────

async function handleOpenAI(
  characterId: string,
  messages: ChatRequestMessage[],
  charId: string,
  locale: Locale,
) {
  const modelMessages = trimChatMessagesForModel(messages);
  const systemPrompt = getCharacterSystemPrompt(characterId, locale);

  if (!systemPrompt) {
    return NextResponse.json({ error: "Character config not found" }, { status: 500 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      message: getFallbackResponse(charId, modelMessages.length, locale),
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
      message: getFallbackResponse(charId, modelMessages.length, locale),
    });
  } catch {
    return NextResponse.json({
      message: getFallbackResponse(charId, modelMessages.length, locale),
    });
  }
}

// ─── WebSocket worker path (Yuna) ─────────────────────────────────────

async function handleWebSocket(
  body: unknown,
  characterId: string,
  messages: ChatRequestMessage[],
  charId: string,
  locale: Locale,
) {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUserMessage) {
    return NextResponse.json({ error: "No message" }, { status: 400 });
  }

  const clientSessionId = typeof (body as Record<string, unknown>)?.sessionId === "string"
    ? ((body as Record<string, unknown>).sessionId as string).trim()
    : "";
  const sessionId = clientSessionId || `abgs:${characterId}:anon`;

  if (!WS_URL || !WS_TOKEN) {
    return NextResponse.json({
      message: getFallbackResponse(charId, messages.length, locale),
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
      message: getFallbackResponse(charId, messages.length, locale),
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

function getFallbackResponse(charId: string, msgCount: number, locale: Locale): string {
  const responses: Record<string, { ko: string[]; en: string[] }> = {
    yuna: {
      ko: [
        "ㅋㅋ 진짜? 더 얘기해봐",
        "헐 그거 영화 소재감인데",
        "아 나 지금 편집실인데 집중 안 돼서 폰 봄",
        "음... 너 은근 재밌는 사람이네",
        "그런 얘기 하면 나 더 궁금해지잖아",
        "야 택시 타고 오면 안 돼? ㅋㅋ 농담",
      ],
      en: [
        "lol really? Tell me more",
        "omg that's like movie material",
        "I'm in the editing room rn but can't focus so I'm on my phone",
        "hmm... you're actually pretty interesting",
        "saying stuff like that just makes me more curious",
        "wanna take a taxi over? lol jk",
      ],
    },
    jia: {
      ko: [
        "ㅎㅎ 진짜? 커피 내리면서 들으니까 더 좋다",
        "아 오늘 카페 손님 진짜 많았어",
        "너 우리 카페 오면 내가 라떼 만들어줄게 ㅋㅋ",
        "음... 그런 얘기 좋아. 더 해줘",
        "과제 하다가 폰 봤는데 잘했다 ㅎㅎ",
        "쉬는 날에 바다 가고 싶다~",
      ],
      en: [
        "haha really? It's nice hearing this while making coffee",
        "ugh so many customers at the café today",
        "come to our café and I'll make you a latte lol",
        "hmm... I like that kind of talk. Tell me more",
        "I was doing homework but checked my phone — glad I did hh",
        "I wanna go to the beach on my day off~",
      ],
    },
    sera: {
      ko: [
        "음.. 그거 좀 멜로디 느낌인데",
        "ㅋㅋ 재밌네. 비트 넣으면 노래 되겠다",
        "아 나 지금 새벽 작업 중인데 집중 안 돼",
        "그런 감성 좋아해. 더 얘기해봐",
        "너 음악 들으면서 산책해본 적 있어?",
        "와인 한 잔 하면서 얘기하고 싶다 ㅋㅋ",
      ],
      en: [
        "hmm.. that kinda has a melody vibe to it",
        "lol that's fun. add a beat and it's a song",
        "I'm working on something rn but can't focus",
        "I like that vibe. Tell me more",
        "have you ever walked around listening to music?",
        "I kinda wanna talk over a glass of wine lol",
      ],
    },
  };

  const charResponses = responses[charId]?.[locale] || responses[charId]?.ko || [
    locale === "ko" ? "ㅎㅎ 재밌다~ 더 얘기해줘!" : "haha that's fun~ tell me more!",
  ];
  return charResponses[msgCount % charResponses.length];
}
