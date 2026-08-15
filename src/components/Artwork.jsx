import { useState, useId } from "react";
import { gradientFromSeed } from "../utils/artwork";
import { getPlaylistArt } from "./artwork/playlistArtRegistry";

/**
 * Album artwork for tracks, playlists and albums.
 *
 * - Playlists/albums (and any seed that isn't a URL) render as locally
 *   generated SVG — bespoke illustrations for known playlists, or a
 *   deterministic gradient + vinyl disc seeded from the id.
 * - Tracks with a real thumbnail URL (YouTube CDN) render that image, with
 *   an automatic fallback to the generated SVG if it ever fails to load.
 */
export default function Artwork({ src = "", alt = "", gradient, className = "", rounded = "rounded-xl", size }) {
  // Unique gradient id per instance (useId colons can break url(#…) refs).
  const uid = useId().replace(/[:]/g, "");
  const [failed, setFailed] = useState(false);

  // Known playlist/album names get bespoke SVG artwork (see PlaylistArt).
  const PlaylistArt = getPlaylistArt(src);
  if (PlaylistArt) {
    return <PlaylistArt alt={alt} className={className} rounded={rounded} />;
  }

  const srcStr = String(src || "");
  const isImage = /^https?:\/\//i.test(srcStr) && !failed;

  if (isImage) {
    return (
      <img
        src={srcStr}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`shrink-0 select-none object-cover ${rounded} ${className}`}
        style={size ? { width: size, height: size } : {}}
      />
    );
  }

  const [c1, c2] = gradient || gradientFromSeed(srcStr);

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative shrink-0 select-none overflow-hidden ${rounded} ${className}`}
      style={size ? { width: size, height: size } : {}}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={c1} />
            <stop offset="1" stopColor={c2} />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${uid})`} />
        {/* soft light + depth blobs */}
        <circle cx="28" cy="18" r="62" fill="#fff" opacity="0.16" />
        <circle cx="82" cy="90" r="72" fill="#000" opacity="0.2" />
        {/* vinyl disc */}
        <g>
          <circle cx="50" cy="50" r="34" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="14" fill="#fff" fillOpacity="0.1" />
          <circle cx="50" cy="50" r="4.5" fill="#fff" fillOpacity="0.85" />
        </g>
      </svg>
    </div>
  );
}
