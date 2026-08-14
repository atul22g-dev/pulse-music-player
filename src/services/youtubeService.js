/**
 * youtubeService — syncs the app's catalog with a live YouTube playlist.
 *
 * No API key required: the playlist's contents (video ids, titles, channels,
 * durations) are read through YouTube's official IFrame Player API — the same
 * embed every site uses. Nothing is scraped and nothing is downloaded.
 *
 * If VITE_YOUTUBE_API_KEY is set, the heavier REST path (playlistItems +
 * videos) takes over instead.
 */

import { engine } from "./audioEngine";
import { YOUTUBE_PLAYLISTS } from "../config/youtubePlaylists";

const API_BASE = "https://www.googleapis.com/youtube/v3";

/** The configured YouTube playlists (id + name) — see src/config/youtubePlaylists.js. */
export { YOUTUBE_PLAYLISTS };

/** The first configured playlist is the app's main one (shown at /playlist). */
export const REFERENCE_PLAYLIST_ID = YOUTUBE_PLAYLISTS[0]?.id || "";

const apiKey = () => import.meta.env.VITE_YOUTUBE_API_KEY || "";

export const isLiveApiConfigured = () => Boolean(apiKey());

const STATE_CUED = 5;
const STATE_UNSTARTED = -1;

/* ------------------------------------------------------------------ */
/*  Shared hidden sync player (created once, reused across syncs)       */
/* ------------------------------------------------------------------ */

let syncPlayer = null;

function getSyncPlayer() {
  if (syncPlayer?.player) return Promise.resolve(syncPlayer.player);
  return engine.initYouTube().then((ok) => {
    if (!ok || !window.YT?.Player) throw new Error("YouTube player unavailable");
    if (syncPlayer?.player) return syncPlayer.player;
    return new Promise((resolve, reject) => {
      const host = document.createElement("div");
      host.style.cssText = "position:absolute;left:-10000px;top:0;width:1px;height:1px;overflow:hidden;";
      document.body.appendChild(host);
      const player = new window.YT.Player(host, {
        width: 1,
        height: 1,
        playerVars: { autoplay: 0, controls: 0, playsinline: 1 },
        events: {
          onReady: () => {
            syncPlayer = { player, host };
            resolve(player);
          },
          onError: () => {
            host.remove();
            syncPlayer = null;
            reject(new Error("Could not create the sync player"));
          },
        },
      });
    });
  });
}

function onceCued(player, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        player.removeEventListener("onStateChange", handler);
      } catch {
        /* noop */
      }
      reject(new Error("Timed out waiting for YouTube"));
    }, timeout);
    const handler = (e) => {
      if (e.data === STATE_CUED || e.data === STATE_UNSTARTED) {
        clearTimeout(timer);
        try {
          player.removeEventListener("onStateChange", handler);
        } catch {
          /* noop */
        }
        resolve();
      }
    };
    try {
      player.addEventListener("onStateChange", handler);
    } catch {
      clearTimeout(timer);
      reject(new Error("Player events unsupported"));
    }
  });
}

/**
 * Poll until the player reports metadata for the expected video id. More
 * robust than state events alone (some environments never fire onStateChange
 * for cues) and caps each video at a few seconds instead of twenty.
 */
function waitForVideoData(player, expectedId, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      const data = readCurrent(player);
      if (data?.youtubeId === expectedId) {
        clearInterval(timer);
        resolve(data);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error("video metadata unavailable"));
      }
    }, 150);
  });
}

/**
 * Titles + artists via YouTube's official oEmbed endpoint. CORS-enabled, so
 * this works even where the embed player can't load video metadata (blocked
 * embeds, strict networks). Durations arrive later from the live player.
 */
async function fetchTitlesViaOEmbed(ids) {
  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        return {
          youtubeId: id,
          title: cleanTitle(data.title || ""),
          artist: data.author_name || "Unknown Artist",
          duration: 0,
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        };
      } catch {
        return { youtubeId: id, duration: 0 };
      }
    })
  );
  return entries;
}

function readCurrent(player) {
  try {
    const data = player.getVideoData?.() || {};
    const videoId = data.video_id || data.videoId;
    if (!videoId) return null;
    let duration = 0;
    try {
      duration = player.getDuration?.() || 0;
    } catch {
      /* noop */
    }
    return {
      youtubeId: videoId,
      title: cleanTitle(data.title || ""),
      artist: data.author || "Unknown Artist",
      duration,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Live sync                                                          */
/* ------------------------------------------------------------------ */

/**
 * Fetch the CURRENT video ids of a playlist (cheap — used for the periodic
 * auto re-check and to seed the full metadata pass).
 */
export async function fetchPlaylistVideoIdsFromPlayer(playlistId = REFERENCE_PLAYLIST_ID) {
  const player = await getSyncPlayer();
  try {
    player.cuePlaylist({ list: playlistId, listType: "playlist" });
  } catch (err) {
    throw new Error(`Could not load the playlist: ${err.message}`);
  }
  await onceCued(player);
  const ids = player.getPlaylist?.() || [];
  if (!ids.length) throw new Error("Playlist returned no videos");
  // Hand back the shared player too, so callers that need it (the full
  // metadata pass) don't re-acquire the same singleton.
  return { ids, player };
}

/**
 * Fill in missing artist names via oEmbed. Some environments populate video
 * metadata (title, duration) but omit the channel, so the catalog would show
 * "Unknown Artist" — backfill those from the oEmbed author instead.
 */
async function backfillAuthors(entries) {
  const missing = entries.filter((e) => !e.artist || e.artist === "Unknown Artist");
  if (!missing.length) return entries;
  const filled = await Promise.all(
    missing.map(async (e) => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${e.youtubeId}`)}&format=json`
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        return { ...e, artist: data.author_name || e.artist };
      } catch {
        return e;
      }
    })
  );
  const byId = new Map(filled.map((e) => [e.youtubeId, e]));
  return entries.map((e) => byId.get(e.youtubeId) || e);
}

/**
 * Full sync: enumerate every video in the live playlist and collect real
 * metadata (title, channel, duration) via cueVideoById — which never starts
 * playback, so syncing is silent. Returns raw entries; the caller stamps the
 * playlist membership (see PlayerContext).
 */
export async function fetchPlaylistWithMetadata(playlistId = REFERENCE_PLAYLIST_ID) {
  const { ids, player } = await fetchPlaylistVideoIdsFromPlayer(playlistId);
  const entries = [];

  const first = readCurrent(player);
  if (first && ids[0]) entries.push(first);

  // Probe: can the embed load per-video metadata at all? In normal browsers
  // this resolves in well under a second. If it can't (blocked embeds, sandbox,
  // strict network), skip the slow per-video pass and use oEmbed instead so the
  // whole catalog lands in one round-trip.
  let embedOk = true;
  if (ids.length > 1) {
    try {
      player.cueVideoById(ids[1]);
      const second = await waitForVideoData(player, ids[1], 5000);
      entries.push(second);
    } catch {
      embedOk = false;
    }
  }

  if (!embedOk) {
    return fetchTitlesViaOEmbed(ids);
  }

  // The shared hidden player can only load one video at a time, so the
  // per-video metadata pass must run strictly sequentially — start each
  // cue only after the previous one resolved.
  let chain = Promise.resolve();
  for (let i = 2; i < ids.length; i++) {
    const id = ids[i];
    chain = chain.then(async () => {
      try {
        player.cueVideoById(id);
        entries.push(await waitForVideoData(player, id, 6000));
      } catch {
        // Keep the id with minimal metadata so the playlist is never partial.
        entries.push({ youtubeId: id, duration: 0 });
      }
    });
  }
  await chain;
  return backfillAuthors(entries);
}

/**
 * Entry point used by the player context. Returns normalized catalog entries
 * (never merges — the caller replaces the catalog so removals propagate).
 */
export async function syncPlaylistFromYouTube(playlistId = REFERENCE_PLAYLIST_ID) {
  if (isLiveApiConfigured()) {
    const fetched = await fetchPlaylist(playlistId);
    return { entries: fetched };
  }
  const entries = await fetchPlaylistWithMetadata(playlistId);
  return { entries };
}

/* ------------------------------------------------------------------ */
/*  YouTube Data API v3 path (only when VITE_YOUTUBE_API_KEY is set)    */
/* ------------------------------------------------------------------ */

export async function fetchPlaylist(playlistId = REFERENCE_PLAYLIST_ID) {
  let nextPageToken = "";
  const items = [];
  do {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      playlistId,
      maxResults: "50",
      key: apiKey(),
      ...(nextPageToken ? { pageToken: nextPageToken } : {}),
    });
    const res = await fetch(`${API_BASE}/playlistItems?${params}`);
    if (!res.ok) throw new Error(`YouTube API ${res.status}`);
    const json = await res.json();
    items.push(...(json.items || []));
    nextPageToken = json.nextPageToken || "";
  } while (nextPageToken);

  const videoIds = [];
  for (const item of items) {
    const videoId = item.snippet?.resourceId?.videoId;
    if (videoId) videoIds.push(videoId);
  }
  const details = await fetchVideoDetails(videoIds);

  const result = [];
  for (const item of items) {
    const snippet = item.snippet || {};
    const videoId = snippet.resourceId?.videoId;
    if (!videoId) continue;
    result.push({
      youtubeId: videoId,
      title: cleanTitle(snippet.title || "Untitled"),
      artist: snippet.videoOwnerChannelTitle || "Unknown Artist",
      album: "Personal Songs",
      duration: details.get(videoId) || 0,
      thumbnail: snippet.thumbnails?.high?.url || "",
    });
  }
  return result;
}

export async function fetchVideoDetails(videoIds) {
  const map = new Map();
  const chunkSize = 50;
  const chunks = [];
  for (let i = 0; i < videoIds.length; i += chunkSize) {
    chunks.push(videoIds.slice(i, i + chunkSize));
  }
  // Each chunk is an independent API request that only writes to its own
  // response, so fetch them all in parallel instead of waiting one at a time.
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const params = new URLSearchParams({
        part: "contentDetails",
        id: chunk.join(","),
        key: apiKey(),
      });
      const res = await fetch(`${API_BASE}/videos?${params}`);
      if (!res.ok) return null;
      return res.json();
    })
  );
  results.forEach((json) => {
    if (!json) return;
    (json.items || []).forEach((v) => {
      const seconds = parseIsoDuration(v.contentDetails?.duration);
      map.set(v.id, seconds);
    });
  });
  return map;
}

function parseIsoDuration(iso = "") {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0);
}

function cleanTitle(title = "") {
  return title.replace(/\s*\(Official(?: Music)? Video\)\s*/i, "").trim();
}
