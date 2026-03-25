"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { trimChatMessagesForModel } from "@/lib/chat-payload";
import type { Character } from "@/lib/characters";

interface Message {
  role: "user" | "assistant";
  content: string;
  image?: string;
  blurred?: boolean;
}

function storageKey(charId: string) {
  return `chat_messages_${charId}`;
}

function paidKey(charId: string) {
  return `chat_paid_${charId}`;
}

export default function ChatClient({ character }: { character: Character }) {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const initialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveMessages = useCallback(
    (msgs: Message[]) => {
      localStorage.setItem(storageKey(character.id), JSON.stringify(msgs));
    },
    [character.id]
  );

  // Persist messages whenever they change
  useEffect(() => {
    if (initialized.current && messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages, saveMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize: restore from localStorage or show greeting
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Check paid status
    const paid = localStorage.getItem(paidKey(character.id)) === "true";
    setHasPaid(paid);

    // Check if returning from successful payment
    const isSuccess = searchParams.get("success") === "1";
    if (isSuccess && !paid) {
      localStorage.setItem(paidKey(character.id), "true");
      setHasPaid(true);
    }

    const shouldUnblur = paid || isSuccess;

    // Restore saved messages
    const saved = localStorage.getItem(storageKey(character.id));
    if (saved) {
      try {
        let restored: Message[] = JSON.parse(saved);
        if (shouldUnblur) {
          restored = restored.map((m) =>
            m.blurred ? { ...m, blurred: false } : m
          );
        }
        setMessages(restored);
        return;
      } catch {
        // fall through to greeting
      }
    }

    // No saved messages — show greeting
    setIsTyping(true);
    const timer = setTimeout(() => {
      const initial: Message[] = [
        ...(character.openingImage
          ? [
              {
                role: "assistant" as const,
                content: "",
                image: character.openingImage,
              },
            ]
          : []),
        { role: "assistant" as const, content: getGreeting(character) },
      ];
      setMessages(initial);
      setIsTyping(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [character, searchParams]);

  function handlePhotoRequest() {
    if (isTyping) return;
    const userMessage: Message = { role: "user", content: "사진 보내줘" };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsTyping(true);

    setTimeout(() => {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "이거 너만 보는 거다? ㅎㅎ",
          image: "/img2.png",
          blurred: !hasPaid,
        },
      ]);
      setIsTyping(false);
    }, 1500);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const requestMessages = trimChatMessagesForModel(
        newMessages.map((message) => ({
          role: message.role,
          content: message.content,
        }))
      );
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          messages: requestMessages,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.message !== "string") {
        throw new Error(data.error || "메시지를 처리하지 못했어. 다시 보내줘~");
      }

      setMessages([
        ...newMessages,
        { role: "assistant", content: data.message },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "앗 잠깐 끊겼어ㅠㅠ 다시 보내줘~";
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: message,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-chat-bg">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-card-bg border-b border-border">
        <Link
          href="/"
          className="text-gray-400 hover:text-white transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          <Image
            src={character.image}
            alt={character.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h1 className="font-bold text-sm">{character.name}</h1>
          <p className="text-xs text-gray-500">{character.personality}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-500">접속중</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 mt-1">
                <Image
                  src={character.image}
                  alt={character.name}
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl text-sm leading-relaxed overflow-hidden ${
                msg.role === "user"
                  ? "bg-bubble-user text-white rounded-br-sm"
                  : "bg-bubble-ai border border-border text-gray-200 rounded-bl-sm"
              }`}
            >
              {msg.image && (
                <button
                  type="button"
                  className="relative block"
                  onClick={() => msg.blurred && setShowPaywall(true)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={msg.image}
                    alt="사진"
                    className={`w-48 h-auto object-cover rounded-2xl ${msg.blurred ? "blur-xl" : ""}`}
                  />
                  {msg.blurred && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-white drop-shadow-lg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      <span className="text-white text-xs font-semibold mt-1 drop-shadow-lg">
                        탭하여 잠금 해제
                      </span>
                    </div>
                  )}
                </button>
              )}
              {msg.content && <p className="px-4 py-2.5">{msg.content}</p>}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 mt-1">
              <Image
                src={character.image}
                alt={character.name}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="bg-bubble-ai border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5">
              <span className="typing-dot w-2 h-2 rounded-full bg-gray-400" />
              <span className="typing-dot w-2 h-2 rounded-full bg-gray-400" />
              <span className="typing-dot w-2 h-2 rounded-full bg-gray-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Recommended message */}
      <div className="px-4 pt-2 bg-card-bg border-t border-border">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handlePhotoRequest}
            disabled={isTyping}
            className="text-xs px-3 py-1.5 rounded-full border border-accent text-accent hover:bg-accent hover:text-white transition-colors disabled:opacity-30"
          >
            사진 보내줘
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-card-bg">
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
            placeholder={`${character.name}에게 메시지 보내기...`}
            className="flex-1 bg-input-bg border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder-gray-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-full bg-accent hover:bg-accent-light disabled:opacity-30 disabled:hover:bg-accent transition-colors flex items-center justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-white"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
      {/* Paywall Modal */}
      {showPaywall && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4"
          onClick={() => setShowPaywall(false)}
        >
          <div
            className="bg-card-bg rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-3">🔒</div>
            <h2 className="text-lg font-bold mb-2">프리미엄 콘텐츠</h2>
            <p className="text-sm text-gray-400 mb-4">
              사진을 보려면 프리미엄 구독이 필요해요
            </p>
            <button
              onClick={async () => {
                const res = await fetch("/api/checkout", { method: "POST" });
                const data = await res.json();
                if (data.url) window.location.href = data.url;
              }}
              className="w-full py-3 rounded-full bg-accent hover:bg-accent-light text-white font-semibold transition-colors"
            >
              잠금 해제 - ₩4,900
            </button>
            <button
              onClick={() => setShowPaywall(false)}
              className="mt-3 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              나중에 할게
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getGreeting(char: Character): string {
  const greetings: Record<string, string> = {
    eunha: "안녕~ 나 은하야 ㅎㅎ 심심했는데 딱 왔네! 뭐하고 있었어?",
  };
  return greetings[char.id] || `안녕~ 나 ${char.name}이야. 같이 얘기하자~ 💕`;
}
