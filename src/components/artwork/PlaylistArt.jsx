import { useId } from "react";

/**
 * Bespoke SVG artwork for known playlists, resolved by playlist name.
 *
 * Every playlist/album in the app is rendered as a locally generated SVG
 * (see Artwork.jsx). Playlists whose names are registered in the sibling
 * playlistArtRegistry get a custom, hand-drawn illustration instead of the
 * generic gradient + vinyl disc — always deterministic, always offline,
 * never a remote image.
 */

function ArtShell({ alt = "", className = "", rounded = "rounded-xl", children }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative shrink-0 select-none overflow-hidden ${rounded} ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Personal Songs — purple → pink, beamed eighth notes                */
/* ------------------------------------------------------------------ */

export function PersonalSongsArt({ alt = "Personal Songs artwork", className = "", rounded = "rounded-xl" }) {
  const g = useId().replace(/[:]/g, "");
  return (
    <ArtShell alt={alt} className={className} rounded={rounded}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${g})`} />
        <circle cx="26" cy="16" r="58" fill="#fff" opacity="0.12" />
        <circle cx="80" cy="92" r="64" fill="#000" opacity="0.18" />
        <g fill="#fff">
          {/* note heads */}
          <ellipse cx="34" cy="64" rx="8" ry="6" transform="rotate(-18 34 64)" opacity="0.96" />
          <ellipse cx="66" cy="64" rx="8" ry="6" transform="rotate(-18 66 64)" opacity="0.96" />
          {/* stems */}
          <rect x="40.5" y="36" width="3" height="26" rx="1.5" opacity="0.96" />
          <rect x="72.5" y="36" width="3" height="26" rx="1.5" opacity="0.96" />
          {/* beam */}
          <rect x="39.5" y="32" width="37" height="6" rx="2.5" opacity="0.96" />
          {/* sparkles */}
          <path d="M22 22 l1.2 3.8 3.8 1.2 -3.8 1.2 -1.2 3.8 -1.2 -3.8 -3.8 -1.2 3.8 -1.2 Z" opacity="0.85" />
          <path d="M79 16 l1 3.2 3.2 1 -3.2 1 -1 3.2 -1 -3.2 -3.2 -1 3.2 -1 Z" opacity="0.7" />
        </g>
      </svg>
    </ArtShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Poetry — indigo → cyan, open book with bookmark and verse dots     */
/* ------------------------------------------------------------------ */

export function PoetryArt({ alt = "Poetry artwork", className = "", rounded = "rounded-xl" }) {
  const g = useId().replace(/[:]/g, "");
  return (
    <ArtShell alt={alt} className={className} rounded={rounded}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${g})`} />
        <circle cx="26" cy="16" r="58" fill="#fff" opacity="0.12" />
        <circle cx="80" cy="92" r="64" fill="#000" opacity="0.18" />
        {/* verse dots floating above the book */}
        <g fill="#fff">
          <circle cx="30" cy="22" r="2.2" opacity="0.85" />
          <circle cx="52" cy="14" r="2.8" opacity="0.95" />
          <circle cx="74" cy="26" r="1.8" opacity="0.7" />
        </g>
        {/* pages */}
        <path d="M50 40 C38 40 30 46 28 56 L28 76 C38 71 46 71 50 76 Z" fill="#fff" opacity="0.93" />
        <path d="M50 40 C62 40 70 46 72 56 L72 76 C62 71 54 71 50 76 Z" fill="#fff" opacity="0.93" />
        {/* spine */}
        <path d="M50 40 L50 76" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.5" />
        {/* text lines */}
        <g stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity="0.55">
          <path d="M34 57 L44 57" />
          <path d="M34 63 L44 63" />
          <path d="M34 69 L42 69" />
          <path d="M56 57 L66 57" />
          <path d="M56 63 L66 63" />
          <path d="M56 69 L62 69" />
        </g>
        {/* bookmark ribbon */}
        <path d="M48 74 L52 74 L50 87 Z" fill="#fbbf24" opacity="0.95" />
      </svg>
    </ArtShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Standup Comedy — amber → red, vintage microphone on stage light    */
/* ------------------------------------------------------------------ */

export function StandupComedyArt({ alt = "Standup Comedy artwork", className = "", rounded = "rounded-xl" }) {
  const g = useId().replace(/[:]/g, "");
  const clip = useId().replace(/[:]/g, "");
  return (
    <ArtShell alt={alt} className={className} rounded={rounded}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#ef4444" />
          </linearGradient>
          <clipPath id={clip}>
            <circle cx="50" cy="30" r="18" />
          </clipPath>
        </defs>
        <rect width="100" height="100" fill={`url(#${g})`} />
        <circle cx="26" cy="16" r="58" fill="#fff" opacity="0.12" />
        <circle cx="80" cy="92" r="64" fill="#000" opacity="0.18" />
        {/* sparkles */}
        <g fill="#fff">
          <path d="M20 20 l1.2 3.8 3.8 1.2 -3.8 1.2 -1.2 3.8 -1.2 -3.8 -3.8 -1.2 3.8 -1.2 Z" opacity="0.85" />
          <path d="M81 18 l1 3.2 3.2 1 -3.2 1 -1 3.2 -1 -3.2 -3.2 -1 3.2 -1 Z" opacity="0.7" />
        </g>
        {/* gooseneck */}
        <path d="M48 47 C46 51 53 53 50 57" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.95" />
        {/* pole */}
        <rect x="48.5" y="56" width="3" height="21" rx="1.5" fill="#fff" opacity="0.95" />
        {/* base */}
        <ellipse cx="50" cy="81" rx="17" ry="4.5" fill="#fff" opacity="0.9" />
        {/* mic head */}
        <g>
          <circle cx="50" cy="30" r="18" fill="#fff" opacity="0.96" />
          <g clipPath={`url(#${clip})`}>
            <g stroke="#27272a" strokeOpacity="0.35" strokeWidth="1.2">
              <path d="M41 12 V48" />
              <path d="M46 12 V48" />
              <path d="M51 12 V48" />
              <path d="M56 12 V48" />
              <path d="M61 12 V48" />
              <path d="M32 18 H68" />
              <path d="M32 24 H68" />
              <path d="M32 30 H68" />
              <path d="M32 36 H68" />
              <path d="M32 42 H68" />
            </g>
          </g>
          <circle cx="50" cy="30" r="3" fill="#27272a" opacity="0.5" />
        </g>
      </svg>
    </ArtShell>
  );
}
