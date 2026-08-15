/**
 * artwork — deterministic gradient generation for the app's SVG artwork.
 *
 * No remote images are used anywhere: every thumbnail is rendered as a
 * locally generated SVG whose colors are derived from a stable seed (the
 * track / album / artist id), so the same item always gets the same art
 * and nothing is ever fetched from the network.
 */

const PALETTE = [
  ["#8b5cf6", "#ec4899"], // purple → pink
  ["#3b82f6", "#06b6d4"], // blue → cyan
  ["#14b8a6", "#10b981"], // teal → emerald
  ["#f97316", "#ef4444"], // orange → red
  ["#6366f1", "#8b5cf6"], // indigo → purple
  ["#ec4899", "#f43f5e"], // pink → rose
  ["#22d3ee", "#a855f7"], // cyan → fuchsia
  ["#f59e0b", "#f97316"], // amber → orange
  ["#a855f7", "#6366f1"], // fuchsia → indigo
  ["#10b981", "#84cc16"], // emerald → lime
];

/** djb2 string hash — stable across runs, no collisions within a session. */
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Pick a [c1, c2] gradient pair deterministically from a seed string. */
export function gradientFromSeed(seed = "") {
  const s = String(seed || "");
  if (!s) return PALETTE[0];
  return PALETTE[hash(s) % PALETTE.length];
}
