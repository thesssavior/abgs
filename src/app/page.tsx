"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { characters } from "@/lib/characters";

/* SVG filter for glass refraction distortion */
function GlassDistortionFilter() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="glass-distortion" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008"
            numOctaves={3}
            seed={2}
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="3" result="smoothNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="smoothNoise"
            scale={60}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}

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
        <GlassDistortionFilter />
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
            background: "rgba(0,0,0,0.35)",
          }}
        />

        {/* Header */}
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
            zIndex: 5,
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

        {/* Headline */}
        <div
          style={{
            position: "absolute",
            top: "14vh",
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 5,
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: 36,
              fontWeight: 700,
              color: "white",
              letterSpacing: -1.5,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            Chat with
            <br />
            your favorite ABG
          </h1>
        </div>

        {/* Center persona image — liquid glass edges */}
        <div
          style={{
            position: "absolute",
            bottom: "10vh",
            left: "50%",
            transform: "translateX(-50%)",
            width: "75vw",
            height: "60svh",
            zIndex: 3,
            pointerEvents: "none",
            borderRadius: 32,
            overflow: "hidden",
          }}
        >
          <img
            src={current.image}
            alt={current.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              transition: "opacity 0.3s ease",
            }}
          />
          {/* Glass edges — blur + SVG distortion refraction */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "30%", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", filter: "url(#glass-distortion)", maskImage: "linear-gradient(to bottom, black, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black, transparent)", background: "linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "35%", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", filter: "url(#glass-distortion)", maskImage: "linear-gradient(to top, black, transparent)", WebkitMaskImage: "linear-gradient(to top, black, transparent)", background: "linear-gradient(to top, rgba(255,255,255,0.08), transparent)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "25%", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", filter: "url(#glass-distortion)", maskImage: "linear-gradient(to right, black, transparent)", WebkitMaskImage: "linear-gradient(to right, black, transparent)", background: "linear-gradient(to right, rgba(255,255,255,0.06), transparent)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "25%", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", filter: "url(#glass-distortion)", maskImage: "linear-gradient(to left, black, transparent)", WebkitMaskImage: "linear-gradient(to left, black, transparent)", background: "linear-gradient(to left, rgba(255,255,255,0.06), transparent)" }} />
          {/* Glass sheen — inset highlight + outer shadow */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 32, border: "1px solid rgba(255,255,255,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)", pointerEvents: "none" }} />
        </div>

        {/* Persona name overlay */}
        <div
          style={{
            position: "absolute",
            bottom: "20vh",
            left: 24,
            zIndex: 5,
            textShadow: "0 2px 16px rgba(0,0,0,0.6)",
            fontFamily: "var(--font-heading)",
          }}
          key={index}
        >
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "white",
              letterSpacing: -1,
              lineHeight: 1.05,
            }}
          >
            {current.name}
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: "white",
              letterSpacing: -1,
              lineHeight: 1.05,
            }}
          >
            <span style={{ fontWeight: 400 }}>{current.age}세</span>
          </div>
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            position: "absolute",
            bottom: "4vh",
            left: 24,
            right: 24,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            zIndex: 5,
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
              style={{
                fontFamily: "var(--font-satoshi), sans-serif",
                background: "rgba(255,255,255,0.95)",
                color: "#1a1a1a",
                borderRadius: 40,
                fontSize: 16,
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                textDecoration: "none",
                height: 50,
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
          <p
            style={{
              fontFamily: "var(--font-satoshi), sans-serif",
              fontSize: 11,
              color: "rgba(255,255,255,0.5)",
              margin: 0,
            }}
          >
            {current.tagline}
          </p>
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
          background: "rgba(0,0,0,0.35)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      <main style={{ position: "relative", height: "100svh", overflow: "hidden" }}>
        {/* Logo */}
        <img
          src="/logo.png"
          alt="ABGs"
          style={{
            position: "absolute",
            top: "4vh",
            left: "8vw",
            zIndex: 5,
            height: "clamp(24px, 3vw, 36px)",
            width: "auto",
          }}
        />

        {/* Top-right CTA */}
        <div style={{ position: "absolute", top: "4vh", right: "8vw", zIndex: 5 }}>
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

        {/* Left headline */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "15vw",
            display: "flex",
            alignItems: "center",
            zIndex: 3,
          }}
        >
          <h1
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(2.5rem, 5vw, 5rem)",
              fontWeight: 700,
              color: "white",
              letterSpacing: "-2px",
              lineHeight: 1.05,
            }}
          >
            <span>Chat with</span>
            <span>your favorite</span>
            <span>ABG</span>
          </h1>
        </div>

        {/* Right persona info */}
        <div
          style={{
            position: "absolute",
            right: "15vw",
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            zIndex: 3,
            fontFamily: "var(--font-heading)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              transition: "opacity 0.3s ease",
            }}
            key={index}
          >
            <span
              style={{
                fontSize: "clamp(2.5rem, 5vw, 5rem)",
                fontWeight: 700,
                color: "white",
                letterSpacing: "-1px",
                lineHeight: 1.1,
              }}
            >
              {current.name}
            </span>
            <span
              style={{
                fontSize: "clamp(2.5rem, 5vw, 5rem)",
                fontWeight: 400,
                color: "white",
                letterSpacing: "-1px",
                lineHeight: 1.1,
              }}
            >
              {current.age}세
            </span>
          </div>
        </div>

        {/* Bottom center CTA + carousel */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "8vh",
            transform: "translateX(-50%)",
            zIndex: 5,
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
              style={{
                fontFamily: "var(--font-satoshi), sans-serif",
                background: "rgba(255,255,255,0.95)",
                border: "none",
                color: "#1a1a1a",
                borderRadius: 40,
                fontSize: "clamp(18px, 2.5vw, 24px)",
                fontWeight: 500,
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
          <p
            style={{
              fontFamily: "var(--font-satoshi), sans-serif",
              fontSize: 13,
              fontWeight: 400,
              color: "rgba(255,255,255,0.5)",
              margin: 0,
            }}
          >
            {current.tagline}
          </p>
        </div>

        {/* Center persona image — liquid glass edges */}
        <div
          style={{
            position: "absolute",
            bottom: "10vh",
            left: "50%",
            transform: "translateX(-50%)",
            height: "78vh",
            width: "30vw",
            minWidth: 340,
            zIndex: 4,
            pointerEvents: "none",
            borderRadius: 28,
            overflow: "hidden",
          }}
        >
          <img
            src={current.image}
            alt={current.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              transition: "opacity 0.3s ease",
            }}
          />
          {/* Glass edges — blur + SVG distortion */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "25%", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", filter: "url(#glass-distortion)", maskImage: "linear-gradient(to bottom, black, transparent)", WebkitMaskImage: "linear-gradient(to bottom, black, transparent)", background: "linear-gradient(to bottom, rgba(255,255,255,0.08), transparent)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "30%", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", filter: "url(#glass-distortion)", maskImage: "linear-gradient(to top, black, transparent)", WebkitMaskImage: "linear-gradient(to top, black, transparent)", background: "linear-gradient(to top, rgba(255,255,255,0.08), transparent)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "20%", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", filter: "url(#glass-distortion)", maskImage: "linear-gradient(to right, black, transparent)", WebkitMaskImage: "linear-gradient(to right, black, transparent)", background: "linear-gradient(to right, rgba(255,255,255,0.06), transparent)" }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: "20%", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", filter: "url(#glass-distortion)", maskImage: "linear-gradient(to left, black, transparent)", WebkitMaskImage: "linear-gradient(to left, black, transparent)", background: "linear-gradient(to left, rgba(255,255,255,0.06), transparent)" }} />
          {/* Glass sheen */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 28, border: "1px solid rgba(255,255,255,0.18)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(255,255,255,0.05), 0 12px 48px rgba(0,0,0,0.4)", pointerEvents: "none" }} />
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          position: "relative",
          zIndex: 1,
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
