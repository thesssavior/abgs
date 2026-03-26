"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import posthog from "posthog-js";
import { characters } from "@/lib/characters";

export default function Home() {
  const [index, setIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const current = characters[index];

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + characters.length) % characters.length);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % characters.length);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Enter") {
        window.location.href = `/chat/${characters[index].id}`;
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [prev, next, index]);

  const touchStart = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (diff > 50) next();
    if (diff < -50) prev();
  };

  /* ── Mobile ── */
  if (isMobile) {
    return (
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: "100vw",
          height: "100svh",
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          touchAction: "none",
        }}
      >
        {/* BG */}
        <img
          src="/bg.jpeg"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.2)",
          }}
        />

        {/* Persona image */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "85vw",
            height: "80svh",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <img
            src={current.image}
            alt={current.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "bottom center",
              transition: "opacity 0.4s ease",
            }}
          />
        </div>

        {/* Header — z-10 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <img
            src="/logo.png"
            alt="ABGs"
            style={{ height: 24, width: "auto" }}
          />
          <Link
            href={`/chat/${current.id}`}
            style={{
              fontFamily: "var(--font-satoshi), sans-serif",
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              textDecoration: "none",
              padding: "6px 18px",
              borderRadius: 40,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            Start Now
          </Link>
        </div>

        {/* Big headline — no glass, just text */}
        <div
          style={{
            position: "absolute",
            top: "12vh",
            left: 20,
            zIndex: 10,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(36px, 10vw, 48px)",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-2px",
              lineHeight: 1.0,
              margin: 0,
              textShadow: "0 4px 24px rgba(0,0,0,0.5)",
            }}
          >
            Chat with
            <br />
            your favorite
            <br />
            <span style={{ color: "var(--color-cream)" }}>ABG</span>
          </h1>
        </div>

        {/* Persona name — liquid glass panel */}
        <div
          style={{
            position: "absolute",
            bottom: "18vh",
            left: 16,
            zIndex: 10,
            padding: "16px 22px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(12px) saturate(1.2)",
            WebkitBackdropFilter: "blur(12px) saturate(1.2)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 20px rgba(0,0,0,0.15)",
            fontFamily: "var(--font-heading)",
          }}
          key={index}
        >
          <div
            style={{
              fontSize: "clamp(40px, 12vw, 60px)",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-2px",
              lineHeight: 0.95,
            }}
          >
            {current.name}
          </div>
          <div
            style={{
              fontSize: "clamp(16px, 4vw, 22px)",
              fontWeight: 400,
              color: "rgba(255,255,255,0.6)",
              letterSpacing: "-0.5px",
              marginTop: 6,
            }}
          >
            {current.age}세 · {current.tagline}
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            position: "absolute",
            bottom: "3vh",
            left: 16,
            right: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
            }}
          >
            <span
              onClick={prev}
              style={{
                fontSize: 28,
                color: "white",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              ‹
            </span>
            <Link
              href={`/chat/${current.id}`}
              onClick={() => posthog.capture("chat_started", { character_id: current.id, character_name: current.name, source: "mobile" })}
              style={{
                fontFamily: "var(--font-satoshi), sans-serif",
                background: "rgba(255,255,255,0.95)",
                color: "#1a1a1a",
                borderRadius: 40,
                fontSize: 16,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                textDecoration: "none",
                height: 52,
                flex: 1,
              }}
            >
              {current.name}와 대화하기
            </Link>
            <span
              onClick={next}
              style={{
                fontSize: 28,
                color: "white",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              ›
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Desktop ── */
  return (
    <div
      style={{
        width: "100vw",
        minHeight: "100vh",
        position: "relative",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* BG */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <img
          src="/bg.jpeg"
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </div>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.2)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <main style={{ position: "relative", height: "100svh", overflow: "hidden" }}>
        {/* Persona image */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            height: "85vh",
            width: "auto",
            zIndex: 5,
            pointerEvents: "none",
          }}
        >
          <img
            src={current.image}
            alt={current.name}
            style={{
              height: "100%",
              width: "auto",
              objectFit: "contain",
              objectPosition: "bottom center",
              transition: "opacity 0.4s ease",
            }}
          />
        </div>

        {/* Logo — z-10 */}
        <img
          src="/logo.png"
          alt="ABGs"
          style={{
            position: "absolute",
            top: "4vh",
            left: "8vw",
            zIndex: 10,
            height: "clamp(24px, 3vw, 36px)",
            width: "auto",
          }}
        />

        {/* Top-right CTA — z-10 */}
        <div style={{ position: "absolute", top: "4vh", right: "8vw", zIndex: 10 }}>
          <Link
            href={`/chat/${current.id}`}
            style={{
              fontFamily: "var(--font-satoshi), sans-serif",
              fontSize: 14,
              fontWeight: 500,
              color: "rgba(255,255,255,0.85)",
              textDecoration: "none",
              padding: "8px 24px",
              borderRadius: 40,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              display: "inline-block",
              transition: "all 0.2s ease",
            }}
          >
            Start Now
          </Link>
        </div>

        {/* Left headline — big, bold, front layer */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "8vw",
            display: "flex",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <h1
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(3rem, 6vw, 6.5rem)",
              fontWeight: 800,
              color: "white",
              letterSpacing: "-3px",
              lineHeight: 0.95,
              textShadow: "0 4px 32px rgba(0,0,0,0.5)",
            }}
          >
            <span>Chat with</span>
            <span>your favorite</span>
            <span style={{ color: "var(--color-cream)" }}>ABG</span>
          </h1>
        </div>

        {/* Right persona info — big, front layer */}
        <div
          style={{
            position: "absolute",
            right: "8vw",
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            zIndex: 10,
            fontFamily: "var(--font-heading)",
            textShadow: "0 4px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              transition: "opacity 0.3s ease",
            }}
            key={index}
          >
            <span
              style={{
                fontSize: "clamp(3rem, 6vw, 6.5rem)",
                fontWeight: 800,
                color: "white",
                letterSpacing: "-2px",
                lineHeight: 0.95,
              }}
            >
              {current.name}
            </span>
            <span
              style={{
                fontSize: "clamp(1.2rem, 2vw, 1.8rem)",
                fontWeight: 400,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "-0.5px",
                marginTop: 8,
              }}
            >
              {current.age}세 · {current.tagline}
            </span>
          </div>
        </div>

        {/* Bottom center CTA + carousel — z-10 */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "8vh",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "clamp(14px, 2vw, 24px)",
            }}
          >
            <span
              onClick={prev}
              style={{
                fontFamily: "var(--font-satoshi), sans-serif",
                fontSize: "clamp(24px, 3vw, 36px)",
                color: "white",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              ‹
            </span>
            <Link
              href={`/chat/${current.id}`}
              onClick={() => posthog.capture("chat_started", { character_id: current.id, character_name: current.name, source: "desktop" })}
              style={{
                fontFamily: "var(--font-satoshi), sans-serif",
                background: "rgba(255,255,255,0.95)",
                border: "none",
                color: "#1a1a1a",
                borderRadius: 40,
                fontSize: "clamp(18px, 2.5vw, 24px)",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                backdropFilter: "blur(10px)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "clamp(12px, 2vw, 16px)",
                textDecoration: "none",
                whiteSpace: "nowrap",
                width: 320,
                height: 62,
              }}
            >
              {current.name}와 대화하기
            </Link>
            <span
              onClick={next}
              style={{
                fontFamily: "var(--font-satoshi), sans-serif",
                fontSize: "clamp(24px, 3vw, 36px)",
                color: "white",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              ›
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          padding: "24px 8vw",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontFamily: "var(--font-satoshi), sans-serif",
          fontSize: 12,
          color: "rgba(255,255,255,0.4)",
        }}
      >
        <span>&copy; {new Date().getFullYear()} ABGs</span>
        <div style={{ display: "flex", gap: 20 }}>
          <Link
            href="/terms"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
