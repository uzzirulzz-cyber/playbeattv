"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: number;
}

/**
 * PlayBeat TV logo — a retro TV with play button and signal waves.
 * Recreated as crisp SVG matching the brand identity.
 */
export function Logo({ className, showText = true, size = 40 }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-label="PlayBeat TV logo"
      >
        <defs>
          <linearGradient id="tvFrame" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E8E8E8" />
            <stop offset="50%" stopColor="#C0C0C0" />
            <stop offset="100%" stopColor="#808080" />
          </linearGradient>
          <linearGradient id="playBtn" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#66CCFF" />
            <stop offset="100%" stopColor="#0099FF" />
          </linearGradient>
          <linearGradient id="waves" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0099FF" />
            <stop offset="100%" stopColor="#00BFFF" />
          </linearGradient>
          <radialGradient id="antennaDot" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#66CCFF" />
            <stop offset="100%" stopColor="#0099FF" />
          </radialGradient>
        </defs>

        {/* Antenna */}
        <line x1="38" y1="30" x2="30" y2="12" stroke="#C0C0C0" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="62" y1="30" x2="70" y2="12" stroke="#C0C0C0" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="30" cy="12" r="3.5" fill="url(#antennaDot)" />
        <circle cx="70" cy="12" r="3.5" fill="url(#antennaDot)" />

        {/* TV Frame — rounded rectangle with metallic gradient */}
        <rect x="18" y="28" width="64" height="50" rx="6" ry="6" fill="url(#tvFrame)" stroke="#A0A0A0" strokeWidth="1" />

        {/* TV Screen — deep navy */}
        <rect x="24" y="34" width="52" height="38" rx="3" ry="3" fill="#001F3F" />

        {/* Play button — blue triangle */}
        <path d="M 44 42 L 44 64 L 62 53 Z" fill="url(#playBtn)" />

        {/* TV stand/base */}
        <rect x="42" y="78" width="16" height="4" rx="1" fill="#C0C0C0" />

        {/* Signal waves — right side */}
        <path d="M 82 40 Q 90 50 82 60" stroke="url(#waves)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 86 36 Q 98 50 86 64" stroke="url(#waves)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />

        {/* Orbiting ring — bottom left */}
        <path d="M 20 70 Q 10 60 18 50" stroke="url(#waves)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
      </svg>

      {showText ? (
        <div className="flex flex-col leading-none">
          <span className="text-base font-extrabold uppercase tracking-tight">
            <span className="text-[#C0C0C0]">PLAYBEAT</span>{" "}
            <span className="text-[#0099FF]">TV</span>
          </span>
          <span className="text-[10px] font-normal lowercase text-[#00BFFF]">
            playbeat.live
          </span>
        </div>
      ) : null}
    </div>
  );
}
