import { PersonalSongsArt, PoetryArt, StandupComedyArt } from "./PlaylistArt";

/**
 * Registry + resolver for bespoke playlist artwork.
 *
 * Kept separate from PlaylistArt.jsx (which only exports components) so the
 * component file stays a clean Fast Refresh boundary — this module's object
 * and resolver are plain values, not components.
 */

export const PLAYLIST_ART = {
  "personal songs": PersonalSongsArt,
  poetry: PoetryArt,
  "standup comedy": StandupComedyArt,
};

/** Resolve a playlist/album name to its bespoke art component (or null). */
export const getPlaylistArt = (name = "") =>
  PLAYLIST_ART[String(name || "").trim().toLowerCase()] || null;
