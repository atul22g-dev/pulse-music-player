const PREFIX = "music-player";

export const STORAGE_KEYS = {
  theme: `${PREFIX}-theme`,
  volume: `${PREFIX}-volume`,
  favorites: `${PREFIX}-favorites`,
  recent: `${PREFIX}-recent`,
  queue: `${PREFIX}-queue`,
  settings: `${PREFIX}-settings`,
  // v3: track shape carries playlistIds (multi-playlist support).
  catalog: `${PREFIX}-catalog-v3`,
  // Playlist config fetched from the API (see services/playlistService.js).
  playlists: `${PREFIX}-playlists`,
  // API key for the playlist endpoint (saved from Settings → Playlist API).
  apiKey: `${PREFIX}-api-key`,
};

export function load(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearAll() {
  try {
    Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}
