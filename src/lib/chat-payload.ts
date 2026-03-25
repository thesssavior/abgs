export const MAX_CHAT_REQUEST_MESSAGES = 40;
export const MAX_CHAT_MODEL_MESSAGES = 12;
export const MAX_CHAT_MESSAGE_CHARS = 600;

export type ChatMessageRole = "user" | "assistant";

export interface ChatRequestMessage {
  role: ChatMessageRole;
  content: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChatMessageRole(value: unknown): value is ChatMessageRole {
  return value === "user" || value === "assistant";
}

export function parseChatRequest(body: unknown) {
  if (!isRecord(body)) {
    return {
      ok: false as const,
      status: 400,
      error: "요청 형식이 올바르지 않아요",
    };
  }

  const characterId =
    typeof body.characterId === "string" ? body.characterId.trim() : "";
  if (!characterId) {
    return {
      ok: false as const,
      status: 400,
      error: "캐릭터 정보가 필요해요",
    };
  }

  if (!Array.isArray(body.messages)) {
    return {
      ok: false as const,
      status: 400,
      error: "대화 기록 형식이 올바르지 않아요",
    };
  }

  if (body.messages.length > MAX_CHAT_REQUEST_MESSAGES) {
    return {
      ok: false as const,
      status: 400,
      error: `메시지는 최대 ${MAX_CHAT_REQUEST_MESSAGES}개까지만 보낼 수 있어요`,
    };
  }

  const messages: ChatRequestMessage[] = [];
  for (const message of body.messages) {
    if (!isRecord(message) || !isChatMessageRole(message.role)) {
      return {
        ok: false as const,
        status: 400,
        error: "메시지 형식이 올바르지 않아요",
      };
    }

    if (typeof message.content !== "string") {
      return {
        ok: false as const,
        status: 400,
        error: "메시지 내용은 문자열이어야 해요",
      };
    }

    if (message.content.length > MAX_CHAT_MESSAGE_CHARS) {
      return {
        ok: false as const,
        status: 400,
        error: `메시지는 ${MAX_CHAT_MESSAGE_CHARS}자 이하로 보내줘`,
      };
    }

    messages.push({
      role: message.role,
      content: message.content,
    });
  }

  return {
    ok: true as const,
    data: {
      characterId,
      messages,
    },
  };
}

export function trimChatMessagesForModel(messages: ChatRequestMessage[]) {
  return messages
    .map((message) => ({
      ...message,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-MAX_CHAT_MODEL_MESSAGES);
}
