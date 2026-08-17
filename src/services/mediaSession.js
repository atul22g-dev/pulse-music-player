/**
 * mediaSession — the Media Session API bridge.
 *
 * Registers OS-level playback controls (play / pause / next / previous /
 * seek) and publishes now-playing metadata, artwork, playback state and
 * position. That signal is what keeps music alive when the tab is in the
 * background, and (on an installed PWA) when the phone's screen is locked.
 *
 * The player context never talks to the platform directly — it calls the
 * small surface below, which degrades silently on unsupported browsers.
 */

import { gradientFromSeed } from "../utils/artwork";

const SUPPORTED =
  typeof navigator !== "undefined" && "mediaSession" in navigator;

// setPositionState is meant to be called sparingly (the UA may ignore
// high-frequency updates) — throttle continuous position polling.
const POSITION_UPDATE_MIN_MS = 1000;
let lastPositionUpdate = 0;
let lastTrackId = null;

/* ---------------- artwork ---------------- */

function svgArtworkDataUri(seed) {
  const [c1, c2] = gradientFromSeed(seed);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="512" height="512" fill="url(#g)"/>` +
    `<circle cx="144" cy="92" r="320" fill="#fff" opacity="0.16"/>` +
    `<circle cx="420" cy="460" r="370" fill="#000" opacity="0.2"/>` +
    `<circle cx="256" cy="256" r="174" fill="none" stroke="#fff" stroke-opacity="0.3" stroke-width="10"/>` +
    `<circle cx="256" cy="256" r="122" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="8"/>` +
    `<circle cx="256" cy="256" r="72" fill="#fff" fill-opacity="0.1"/>` +
    `<circle cx="256" cy="256" r="23" fill="#fff" fill-opacity="0.85"/>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function artworkFor(track) {
  if (!track) return [];
  const src = String(track.thumbnail || "");
  // Real CDN thumbnail (YouTube) — the same image the UI renders.
  if (/^https?:\/\//i.test(src)) {
    return [
      { src, sizes: "96x96", type: "image/jpeg" },
      { src, sizes: "128x128", type: "image/jpeg" },
      { src, sizes: "256x256", type: "image/jpeg" },
      { src, sizes: "384x384", type: "image/jpeg" },
      { src, sizes: "512x512", type: "image/jpeg" },
    ];
  }
  // No real image yet (synth / generated art) — mirror the UI's generated
  // gradient art as an SVG data URI so the lock screen never shows a blank.
  const seed = track.gradient ? `${track.gradient[0]}${track.gradient[1]}` : src;
  return [{ src: svgArtworkDataUri(seed), sizes: "512x512", type: "image/svg+xml" }];
}

/* ---------------- public surface ---------------- */

/**
 * Publish the full now-playing picture. Cheap to call on every player
 * change: metadata is only rewritten when the track changes, playback state
 * only when it flips, and position writes are throttled (force bypasses the
 * throttle on track changes so the lock screen snaps to the new position).
 */
export function updateMediaSession(track, isPlaying, position = 0, duration = 0) {
  if (!SUPPORTED) return;
  const ms = navigator.mediaSession;
  const trackId = track?.id ?? null;

  if (trackId !== lastTrackId) {
    lastTrackId = trackId;
    try {
      ms.metadata = track
        ? new MediaMetadata({
            title: track.title || "PULSE",
            artist: track.artist || "Unknown Artist",
            album: track.album || "PULSE",
            artwork: artworkFor(track),
          })
        : null;
    } catch {
      /* metadata unsupported — ignore */
    }
    if (track) {
      try {
        ms.setPositionState({
          duration: Math.max(0, duration || 0),
          position: Math.min(Math.max(0, position || 0), Math.max(0, duration || 0)),
          playbackRate: 1,
        });
        lastPositionUpdate = Date.now();
      } catch {
        /* position unsupported — ignore */
      }
    }
  }

  const state = isPlaying ? "playing" : "paused";
  try {
    if (ms.playbackState !== state) ms.playbackState = state;
  } catch {
    /* ignore */
  }

  if (track && position > 0) setPositionState({ position, duration });
}

/** Set playback position for the scrubber on lock screens / notifications. */
export function setPositionState({ position = 0, duration = 0, playbackRate = 1 }) {
  if (!SUPPORTED) return;
  const now = Date.now();
  if (now - lastPositionUpdate < POSITION_UPDATE_MIN_MS) return;
  lastPositionUpdate = now;
  const d = Math.max(0, duration || 0);
  try {
    navigator.mediaSession.setPositionState({
      duration: d,
      position: Math.min(Math.max(0, position || 0), d),
      playbackRate: playbackRate || 1,
    });
  } catch {
    /* ignore */
  }
}

/** Clear the lock-screen metadata entirely (e.g. queue wiped). */
export function clearMediaSession() {
  if (!SUPPORTED) return;
  lastTrackId = null;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
  } catch {
    /* ignore */
  }
}

/**
 * Register the lock-screen / hardware-key handlers once. Each handler is a
 * no-op guard that pulls the latest callbacks from the caller's ref, so the
 * registration never goes stale as the player state changes.
 */
export function registerMediaSessionActions(actions = {}) {
  if (!SUPPORTED) return;
  const ms = navigator.mediaSession;
  const handlers = {
    play: actions.onPlay,
    pause: actions.onPause,
    previoustrack: actions.onPrevious,
    nexttrack: actions.onNext,
    seekbackward: actions.onSeekBackward,
    seekforward: actions.onSeekForward,
    seekto: actions.onSeekTo,
    stop: actions.onPause,
  };
  for (const [action, handler] of Object.entries(handlers)) {
    try {
      ms.setActionHandler(action, handler || null);
    } catch {
      /* action unsupported on this platform — ignore */
    }
  }
}
