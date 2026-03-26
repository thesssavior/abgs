"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import posthog from "posthog-js";
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

function getOrCreateSessionId(charId: string): string {
  const key = `chat_session_${charId}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `${charId}-${crypto.randomUUID()}`;
  localStorage.setItem(key, id);
  return id;
}

export default function ChatClient({ character }: { character: Character }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const checkoutStatus = searchParams.get("checkout");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [hasPaid, setHasPaid] = useState(false);
  const [isCheckingPremium, setIsCheckingPremium] = useState(true);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreEmail, setRestoreEmail] = useState("");
  const [premiumMessage, setPremiumMessage] = useState<string | null>(null);
  const initialized = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const wsResolverRef = useRef<((text: string) => void) | null>(null);
  const wsRejecterRef = useRef<((err: Error) => void) | null>(null);

  const saveMessages = useCallback(
    (msgs: Message[]) => {
      localStorage.setItem(storageKey(character.id), JSON.stringify(msgs));

      // Background save to DB — fire-and-forget, no await
      const chatSessionId = localStorage.getItem(`chat_session_${character.id}`);
      if (chatSessionId) {
        fetch("/api/chat/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: chatSessionId,
            characterId: character.id,
            messages: msgs,
          }),
        }).catch(() => {});
      }
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

  useEffect(() => {
    if (showPaywall) {
      posthog.capture("paywall_viewed", { character_id: character.id });
    }
  }, [showPaywall, character.id]);

  // Persistent WebSocket connection to Worker
  useEffect(() => {
    let ws: WebSocket | null = null;
    let dead = false;

    async function connect() {
      const chatSessionId = getOrCreateSessionId(character.id);
      const res = await fetch(`/api/chat/ws?sessionId=${encodeURIComponent(chatSessionId)}`);
      const data = await res.json().catch(() => null);
      if (dead || !data?.url) return;

      ws = new WebSocket(data.url);
      wsRef.current = ws;

      ws.addEventListener("message", (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "reply" && msg.text && wsResolverRef.current) {
            wsResolverRef.current(msg.text);
            wsResolverRef.current = null;
            wsRejecterRef.current = null;
          } else if (msg.type === "typing") {
            setIsTyping(msg.active);
          } else if (msg.type === "error" && wsRejecterRef.current) {
            wsRejecterRef.current(new Error(msg.message || "reply failed"));
            wsResolverRef.current = null;
            wsRejecterRef.current = null;
          }
        } catch { /* ignore */ }
      });

      ws.addEventListener("close", () => {
        if (!dead) {
          wsRef.current = null;
          // Reconnect after 2s
          setTimeout(() => { if (!dead) connect(); }, 2000);
        }
      });

      ws.addEventListener("error", () => {
        ws?.close();
      });
    }

    connect();

    return () => {
      dead = true;
      ws?.close();
      wsRef.current = null;
    };
  }, [character.id]);

  useEffect(() => {
    if (!hasPaid) return;
    setMessages((current) =>
      current.map((message) =>
        message.blurred ? { ...message, blurred: false } : message
      )
    );
  }, [hasPaid]);

  // Initialize: restore from localStorage or show greeting
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Restore saved messages
    const saved = localStorage.getItem(storageKey(character.id));
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
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
  }, [character]);

  useEffect(() => {
    let active = true;

    async function syncPremiumStatus() {
      setIsCheckingPremium(true);

      try {
        if (sessionId) {
          const claimRes = await fetch("/api/checkout/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              characterId: character.id,
              sessionId,
            }),
          });
          const claimData = await claimRes.json().catch(() => ({}));

          if (!active) return;

          if (claimRes.ok && claimData.hasPaid) {
            posthog.capture("checkout_completed", { character_id: character.id });
            setHasPaid(true);
            setShowPaywall(false);
            setPremiumMessage("결제가 확인됐어요. 프리미엄이 열렸어.");
          } else if (claimData.error) {
            setPremiumMessage(claimData.error);
          }

          clearCheckoutParams();
        } else if (checkoutStatus === "canceled") {
          setPremiumMessage("결제가 취소됐어요. 준비되면 다시 잠금 해제해줘.");
          clearCheckoutParams();
        }

        const res = await fetch(
          `/api/premium?characterId=${encodeURIComponent(character.id)}`,
          {
            cache: "no-store",
          }
        );
        const data = await res.json().catch(() => ({}));

        if (!active) return;
        setHasPaid(Boolean(data.hasPaid));
      } catch {
        if (active) {
          setPremiumMessage("프리미엄 상태를 확인하지 못했어. 잠시 후 다시 시도해줘.");
        }
      } finally {
        if (active) {
          setIsCheckingPremium(false);
        }
      }
    }

    void syncPremiumStatus();

    return () => {
      active = false;
    };
  }, [character.id, checkoutStatus, sessionId]);

  function handlePhotoRequest() {
    if (isTyping) return;
    const userMessage: Message = { role: "user", content: "사진 보내줘" };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsTyping(true);

    setTimeout(() => {
      if (!hasPaid) {
        posthog.capture("paywall_image_viewed", { character_id: character.id });
      }
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "이거 너만 보는 거야 ㅎ",
          image: "/yuna_card.png",
          blurred: !hasPaid,
        },
      ]);
      setIsTyping(false);
    }, 1500);
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isTyping) return;

    posthog.capture("message_sent", {
      character_id: character.id,
      character_name: character.name,
      message_count: messages.length + 1,
    });

    const userMessage: Message = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          sessionId: localStorage.getItem(`chat_session_${character.id}`) || undefined,
        }),
      });
      const data = await res.json();
      const replyText = data.message || "앗 잠깐 끊겼어ㅠㅠ 다시 보내줘~";

      setMessages([
        ...newMessages,
        { role: "assistant", content: replyText },
      ]);
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "앗 잠깐 끊겼어ㅠㅠ 다시 보내줘~",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  async function handleCheckout() {
    if (isStartingCheckout) return;

    posthog.capture("checkout_started", { character_id: character.id });
    setIsStartingCheckout(true);
    setPremiumMessage(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }

      setPremiumMessage(data.error || "결제 화면을 열지 못했어. 잠시 후 다시 시도해줘.");
    } catch {
      setPremiumMessage("결제 화면을 열지 못했어. 잠시 후 다시 시도해줘.");
    } finally {
      setIsStartingCheckout(false);
    }
  }

  async function handleRestorePurchase() {
    const email = restoreEmail.trim();
    if (!email || isRestoring) return;

    setIsRestoring(true);
    setPremiumMessage(null);

    try {
      const res = await fetch("/api/premium/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          email,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.hasPaid) {
        setHasPaid(true);
        setShowPaywall(false);
        setRestoreEmail("");
        setPremiumMessage("구매 내역을 복원했어.");
        return;
      }

      setPremiumMessage(data.error || "구매 내역을 복원하지 못했어.");
    } catch {
      setPremiumMessage("구매 내역을 복원하지 못했어.");
    } finally {
      setIsRestoring(false);
    }
  }

  return (
    <div className="flex flex-col h-screen relative">
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/bg.jpeg)" }}
      />
      <div className="fixed inset-0 bg-black/50" />

      {/* Header */}
      <header
        className="relative z-10 flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        <Link
          href="/"
          className="text-white/60 hover:text-white transition-colors"
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
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
          style={{ border: "2px solid rgba(255,255,255,0.2)" }}
        >
          <Image
            src={character.image}
            alt={character.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1">
          <h1
            className="font-bold text-sm text-white"
            style={{ fontFamily: "var(--font-satoshi)" }}
          >
            {character.name}
          </h1>
          <p className="text-xs text-white/50">{character.personality}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400/80">접속중</span>
        </div>
      </header>

      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div
                className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 mt-1"
                style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              >
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
                msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
              }`}
              style={
                msg.role === "user"
                  ? {
                      background: "rgba(255,255,255,0.15)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#fff",
                    }
                  : {
                      background: "rgba(255,255,255,0.08)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "rgba(255,255,255,0.9)",
                    }
              }
            >
              {msg.image && (
                <button
                  type="button"
                  className="relative block"
                  onClick={() => {
                    if (msg.blurred) {
                      posthog.capture("paywall_image_clicked", {
                        character_id: character.id,
                      });
                      setShowPaywall(true);
                    }
                  }}
                >
                  <Image
                    src={msg.image}
                    alt="사진"
                    width={352}
                    height={467}
                    sizes="192px"
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
            <div
              className="w-8 h-8 rounded-full overflow-hidden mr-2 flex-shrink-0 mt-1"
              style={{ border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <Image
                src={character.image}
                alt={character.name}
                width={32}
                height={32}
                className="w-full h-full object-cover"
              />
            </div>
            <div
              className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5"
              style={{
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <span className="typing-dot w-2 h-2 rounded-full bg-white/40" />
              <span className="typing-dot w-2 h-2 rounded-full bg-white/40" />
              <span className="typing-dot w-2 h-2 rounded-full bg-white/40" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Recommended message */}
      <div
        className="relative z-10 px-4 pt-2"
        style={{
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-3xl mx-auto">
          <button
            onClick={handlePhotoRequest}
            disabled={isTyping}
            className="text-xs px-3 py-1.5 rounded-full transition-colors disabled:opacity-30"
            style={{
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            사진 보내줘
          </button>
        </div>
      </div>

      {/* Input */}
      <div
        className="relative z-10 px-4 py-3"
        style={{
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
            placeholder={`${character.name}에게 메시지 보내기...`}
            className="flex-1 rounded-full px-4 py-2.5 text-sm outline-none transition-colors text-white placeholder-white/40"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontFamily: "var(--font-satoshi)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-full disabled:opacity-30 transition-all duration-200 flex items-center justify-center hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.95)",
              color: "#1a1a1a",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
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
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowPaywall(false)}
        >
          <div
            className="rounded-2xl p-6 max-w-sm w-full text-center"
            style={{
              background: "rgba(20,20,20,0.9)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-3">🔒</div>
            <h2
              className="text-lg font-bold mb-2 text-white"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              프리미엄 콘텐츠
            </h2>
            <p className="text-sm text-white/50 mb-4" style={{ fontFamily: "var(--font-satoshi)" }}>
              사진을 보려면 프리미엄 구독이 필요해요
            </p>
            <button
              onClick={async () => {
                await handleCheckout();
              }}
              disabled={isStartingCheckout || isCheckingPremium}
              className="w-full py-3 rounded-full text-white font-semibold transition-all duration-200 disabled:opacity-40 hover:scale-[1.02]"
              style={{
                background: "rgba(255,255,255,0.95)",
                color: "#1a1a1a",
                fontFamily: "var(--font-satoshi)",
              }}
            >
              {isStartingCheckout ? "결제 준비 중..." : "잠금 해제 - ₩4,900"}
            </button>
            <div
              className="mt-4 pt-4 text-left"
              style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              <p className="text-xs text-white/40 mb-2">
                다른 브라우저나 기기에서는 결제한 이메일로 복원할 수 있어요
              </p>
              <input
                type="email"
                value={restoreEmail}
                onChange={(e) => setRestoreEmail(e.target.value)}
                placeholder="결제에 사용한 이메일"
                className="w-full rounded-xl px-3 py-2 text-sm outline-none transition-colors text-white placeholder-white/40"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
              <button
                onClick={handleRestorePurchase}
                disabled={!restoreEmail.trim() || isRestoring}
                className="mt-2 w-full py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white disabled:opacity-40 transition-colors"
                style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              >
                {isRestoring ? "복원 중..." : "구매 복원"}
              </button>
            </div>
            {premiumMessage && (
              <p className="mt-3 text-xs text-center text-white/50">
                {premiumMessage}
              </p>
            )}
            <button
              onClick={() => setShowPaywall(false)}
              className="mt-3 text-sm text-white/40 hover:text-white/70 transition-colors"
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
    yuna: "어 왔네 ㅎㅎ 나 유나. 지금 편집실인데 심심해서 폰 봤거든",
  };
  return greetings[char.id] || `안녕~ 나 ${char.name}이야. 같이 얘기하자~`;
}

function clearCheckoutParams() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("checkout");
  url.searchParams.delete("session_id");
  window.history.replaceState({}, "", url);
}
