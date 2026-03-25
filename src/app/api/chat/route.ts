import { NextRequest, NextResponse } from "next/server";
import { getCharacter } from "@/lib/characters";
import {
  parseChatRequest,
  trimChatMessagesForModel,
} from "@/lib/chat-payload";
import OpenAI from "openai";

let _openai: OpenAI;
function openai() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = parseChatRequest(body);

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status }
    );
  }

  const { characterId, messages } = parsed.data;
  const modelMessages = trimChatMessagesForModel(messages);
  const character = getCharacter(characterId);

  if (!character) {
    return NextResponse.json({ error: "캐릭터를 찾을 수 없어요" }, { status: 404 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      message: getFallbackResponse(character.id, modelMessages.length),
    });
  }

  try {
    const completion = await openai().chat.completions.create({
      model: "gpt-4o",
      max_tokens: 256,
      messages: [
        { role: "system", content: character.systemPrompt },
        ...modelMessages,
      ],
    });

    const text = completion.choices[0]?.message?.content;
    if (text) {
      return NextResponse.json({ message: text });
    }

    return NextResponse.json({
      message: getFallbackResponse(character.id, modelMessages.length),
    });
  } catch {
    return NextResponse.json({
      message: getFallbackResponse(character.id, modelMessages.length),
    });
  }
}

function getFallbackResponse(charId: string, msgCount: number): string {
  const responses: Record<string, string[]> = {
    eunha: [
      "ㅋㅋㅋ 진짜? 좀 더 얘기해봐~",
      "헐 그거 진짜 재밌다 ㅎㅎ 나도 비슷한 적 있어",
      "아 맞아~ 나 요즘 홍대 새로 생긴 카페 갔는데 분위기 진짜 좋았어",
      "음... 너 은근 재밌는 사람이네? 더 알고 싶어지는데 ㅎㅎ",
      "아 나 지금 이불 속인데 ㅋㅋ 이렇게 얘기하니까 좋다~",
      "그런 얘기 들으면 기분 좋아지는 거 알지? ㅎㅎ",
    ],
  };

  const charResponses = responses[charId] || [
    "ㅎㅎ 재밌다~ 더 얘기해줘!",
  ];
  return charResponses[msgCount % charResponses.length];
}
