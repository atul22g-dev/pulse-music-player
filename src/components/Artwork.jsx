import { useState } from "react";
import { Music } from "lucide-react";

/**
 * Album artwork with graceful fallback: if the remote image (YouTube CDN)
 * fails to load, render a deterministic gradient derived from the track.
 */
export default function Artwork({ src, alt = "", gradient, className = "", rounded = "rounded-xl", size }) {
  const [failed, setFailed] = useState(false);
  const [c1, c2] = gradient || ["#6366f1", "#ec4899"];

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`relative flex shrink-0 items-center justify-center overflow-hidden ${rounded} ${className}`}
        style={{
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          ...(size ? { width: size, height: size } : {}),
        }}
      >
        <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 55%)" }} />
        <Music className="relative text-white/80" size={size ? size * 0.38 : 24} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 select-none object-cover ${rounded} ${className}`}
      style={size ? { width: size, height: size } : {}}
    />
  );
}
