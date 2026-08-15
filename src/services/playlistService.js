/**
 * playlistService — the list of YouTube playlists PULSE tracks, loaded from an
 * API instead of a config file.
 *
 * At boot the app fetches the playlist list from the Atual API
 * (https://apis-atual-dev.vercel.app/api/playlists) — override the URL with
 * `VITE_PLAYLISTS_API_URL`. The endpoint requires an API key, read from
 * `VITE_ATUAL_API_KEY` or from the key saved in Settings → Playlist API (stored
 * in LocalStorage). The key is sent as both the `X-API-Key` header and the
 * `api_key` query param, so it works regardless of which the server expects.
 * The fetched list is cached in LocalStorage so the app stays instant and
 * works offline. When no key is set, the fetch fails, or the response is
 */

import { load, save, STORAGE_KEYS } from "./storage";

export const PLAYLISTS_API_URL =
  import.meta.env.VITE_PLAYLISTS_API_URL;

/** API key for the playlist endpoint — env var or locally saved key. */
export const getApiKey = () =>
  import.meta.env.VITE_ATUAL_API_KEY || load(STORAGE_KEYS.apiKey, "") || "";

/**
 * Built-in fallback used when no API key is configured (or the API is
 * unreachable) and nothing is cached yet. Mirrors the pre-API default from
 * src/config/youtubePlaylists.js.
 */
const DEFAULT_PLAYLISTS = [
  {
    id: "PLIV4nZCjWE3E",
    name: "Personal Songs",
    description: "Your personal collection, beautifully organized.",
  },
];

// Never null: falls back to the built-in default so callers (e.g. getAlbums)
// can always map over the result.
const cached = load(STORAGE_KEYS.playlists, null);
let playlists = Array.isArray(cached) ? cached : DEFAULT_PLAYLISTS;
let fetchedOnce = false;
const listeners = new Set();

/** The current playlist config ({ id, name, description }[]). */
export const getPlaylists = () => playlists;

export function subscribePlaylists(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emitIfChanged(next) {
  const changed =
    next.length !== playlists.length ||
    next.some((p, i) => p.id !== playlists[i].id || p.name !== playlists[i].name);
  playlists = next;
  if (changed) listeners.forEach((fn) => fn());
}

/** Accepts either a bare array or a { playlists, data, … } wrapper. */
export function normalizePlaylists(payload) {
  const list = Array.isArray(payload)
    ? payload
    : payload?.playlists || payload?.data || payload?.results || payload?.items || [];
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const p of list) {
    if (!p || typeof p !== "object") continue;
    // Prefer the real YouTube playlist id (the Atual API exposes it as
    // `playlistId` alongside a slug `id`), then fall back to generic fields.
    const id = p.playlistId ?? p.youtubeId ?? p.id ?? p.slug ?? p._id;
    const name = p.name || p.title || p.label;
    if (!id || !name) continue;
    out.push({
      id: String(id),
      name: String(name),
      description: p.description || p.desc || "",
      // SVG artwork seed — the playlist name, so known playlists resolve to
      // bespoke artwork (never a remote URL).
      artwork: String(name),
    });
  }
  return out;
}

/**
 * Pull the playlist list from the API and swap it in. Runs once per session,
 * unless `force` is set (e.g. right after saving a new API key). Falls back to
 * fails, or the response is empty.
 */
export async function refreshPlaylistsFromApi(force = false) {
  if (fetchedOnce && !force) return { playlists, source: "cached" };
  fetchedOnce = true;

  const apiKey = getApiKey();
  if (!apiKey) return { playlists, source: "default" };

  try {
    const url = new URL(PLAYLISTS_API_URL);
    url.searchParams.set("api_key", apiKey);
    const res = await fetch(url, { headers: { "X-API-Key": apiKey } });
    if (!res.ok) throw new Error(String(res.status));
    const payload = await res.json().catch(() => null);
    const list = normalizePlaylists(payload);
    if (list.length) {
      emitIfChanged(list);
      save(STORAGE_KEYS.playlists, list);
      return { playlists, source: "api" };
    }
  } catch {
    /* API unreachable — keep the cached/default list */
  }
  return { playlists, source: "cached" };
}
