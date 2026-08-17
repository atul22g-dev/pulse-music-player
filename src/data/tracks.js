/**
 * Track catalog — populated from the live YouTube playlists, never written
 * by hand.
 *
 * The catalog is restored at boot from the last persisted snapshot in
 * localStorage (see PlayerContext), so the app is instant and works offline.
 * On a fresh device with no snapshot yet, the bundled SEED_CATALOG
 * (src/data/seedCatalog.js) is restored first, then refreshed from YouTube.
 *
 * All reads go through the accessors below so every page stays in sync when
 * the catalog is refreshed.
 */

import { gradientFromSeed } from "../utils/artwork";

export let tracks = [];

// The legacy shared fallback — treated as "no gradient provided" so cached
// catalogs from before SVG artwork re-seed each item with its own colors.
const DEFAULT_GRADIENT = ["#6366f1", "#ec4899"];

export const getAllTracks = () => tracks;

export const getTrack = (id) => tracks.find((t) => t.id === id) || null;

function normalize(raw, id) {
  const seed = raw.youtubeId || raw.id || id;
  const rawGradient = Array.isArray(raw.gradient) ? raw.gradient : null;
  const hasCustomGradient =
    rawGradient &&
    !(rawGradient[0] === DEFAULT_GRADIENT[0] && rawGradient[1] === DEFAULT_GRADIENT[1]);
  return {
    id: seed,
    title: raw.title || `YouTube Track ${id.slice(0, 8)}`,
    artist: raw.artist || "Unknown Artist",
    album: raw.album || "Personal Songs",
    duration: raw.duration || 0,
    source: "youtube",
    youtubeId: seed,
    // Real YouTube thumbnail when available; otherwise a stable color seed
    // for the generated SVG artwork.
    thumbnail: raw.thumbnail || seed,
    gradient: hasCustomGradient ? rawGradient : gradientFromSeed(seed),
    // Which configured YouTube playlist(s) contain this track. A video shared
    // by two playlists appears once in the library but in both playlists.
    playlistIds: Array.isArray(raw.playlistIds)
      ? [...new Set(raw.playlistIds)]
      : raw.playlistId
        ? [raw.playlistId]
        : ["library"],
  };
}

/** Restore the cached catalog snapshot at boot. */
export function restoreCatalog(entries = []) {
  if (!Array.isArray(entries)) return;
  const normalized = [];
  for (const t of entries) {
    if (!t?.id) continue;
    normalized.push(normalize({ ...t, playlistIds: t.playlistIds || ["library"] }, t.id));
  }
  tracks = normalized;
}

/**
 * Sync ONE configured playlist into the catalog (the live playlist is the
 * source of truth for its own tracks). Tracks that are still in the playlist
 * get fresh metadata; tracks removed from the playlist are dropped from it
 * (and from the library if no other playlist contains them); brand-new tracks
 * are added. Other playlists' tracks are left untouched.
 */
export function setPlaylistEntries(playlistId, entries = []) {
  const liveIds = new Set();
  for (const e of entries) {
    const id = e.youtubeId || e.id;
    if (id) liveIds.add(id);
  }
  const incoming = [];
  for (const raw of entries) {
    const id = raw.youtubeId || raw.id;
    if (!id) continue;
    const already = raw.playlistIds?.includes(playlistId)
      ? raw.playlistIds
      : [...(raw.playlistIds || []), playlistId];
    incoming.push(normalize({ ...raw, playlistIds: already }, id));
  }

  let added = 0;
  let removed = 0;
  const next = [];
  const index = new Map();

  for (const t of tracks) {
    const inThisPlaylist = t.playlistIds?.includes(playlistId);
    if (inThisPlaylist && !liveIds.has(t.id)) {
      // Removed from this playlist — keep it only if another playlist has it.
      const rest = t.playlistIds.filter((p) => p !== playlistId);
      if (rest.length) {
        const kept = { ...t, playlistIds: rest };
        next.push(kept);
        index.set(kept.id, kept);
      } else {
        removed += 1;
      }
      continue;
    }
    next.push(t);
    index.set(t.id, t);
  }

  for (const raw of incoming) {
    const existing = index.get(raw.id);
    if (existing) {
      // Already in the catalog (possibly via another playlist) — refresh its
      // metadata and merge playlist membership.
      const idx = next.indexOf(existing);
      if (idx >= 0) {
        const merged = {
          ...raw,
          playlistIds: [...new Set([...(raw.playlistIds || []), ...(existing.playlistIds || [])])],
        };
        next[idx] = merged;
        index.set(merged.id, merged);
      }
      continue;
    }
    next.push(raw);
    index.set(raw.id, raw);
    added += 1;
  }

  tracks = next;
  return { added, removed, total: tracks.length };
}

/**
 * Write back a real duration learned during playback (YouTube reports it once
 * a video starts). Returns true when the catalog actually changed, so callers
 * can persist and re-render.
 */
export function updateTrackDuration(id, duration) {
  if (!id || !Number.isFinite(duration) || duration <= 0) return false;
  const t = tracks.find((x) => x.id === id);
  if (t && t.duration !== duration) {
    t.duration = Math.round(duration);
    return true;
  }
  return false;
}

/** Artists derived from the live catalog (channel names from YouTube). */
export function getArtists() {
  const map = new Map();
  for (const t of tracks) {
    if (!map.has(t.artist)) map.set(t.artist, []);
    map.get(t.artist).push(t);
  }
  return [...map.entries()]
    .map(([name, list]) => ({
      name,
      tracks: list,
      // Artist art = the first track's real YouTube thumbnail (falls back to
      // the generated SVG seed when no thumbnail URL exists yet).
      thumbnail: list[0].thumbnail,
      gradient: list[0].gradient,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Albums derived from the live catalog. Tracks are stamped with their
 * playlist's name as the album, so each playlist becomes its own album.
 * Album artwork is a generated SVG seeded from the album name.
 */
export function getAlbums() {
  const map = new Map();
  for (const t of tracks) {
    if (!map.has(t.album)) map.set(t.album, []);
    map.get(t.album).push(t);
  }
  return [...map.entries()]
    .map(([name, list]) => {
      return {
        name,
        artist: list[0].artist,
        tracks: list,
        // SVG artwork seeds — derived from the album name, never a URL.
        thumbnail: name,
        gradient: list[0].gradient,
        artwork: name,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Plain JSON-safe snapshot for localStorage caching. */
export const getCatalogSnapshot = () => tracks.map((t) => ({ ...t }));
