"use client";

import { useEffect, useRef } from "react";

export function AmbientBackground() {
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("div");
      p.className = "hp-particle";
      const size = 2 + Math.random() * 5;
      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${Math.random() * 100}%;
        --d:${10 + Math.random() * 18}s;
        --delay:-${Math.random() * 20}s;
      `;
      container.appendChild(p);
    }
    return () => {
      container.innerHTML = "";
    };
  }, []);

  return (
    <>
      {/* Decorative rings */}
      <div className="hp-deco-ring" />
      <div className="hp-deco-ring" />
      <div className="hp-deco-ring" />

      {/* Ambient particles */}
      <div className="hp-particles" ref={particlesRef} />
    </>
  );
}

export function HouseBrand() {
  return (
    <div className="hp-brand">
      <div className="hp-brand-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12L12 3l9 9v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9z" />
          <path d="M9 21V12h6v9" fill="rgba(0,0,0,0.3)" />
        </svg>
      </div>
      <div>
        <div className="hp-brand-name">
          House<span>app</span>
        </div>
        <div className="hp-brand-tagline">Your cozy corner of the internet</div>
      </div>
    </div>
  );
}

export function StatusPill({ text }: { text?: string }) {
  return (
    <div className="hp-status-pill">
      <div className="hp-status-dot" />
      {text ?? "Welcome to Houseplan"}
    </div>
  );
}
