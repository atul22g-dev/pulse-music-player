import { tracks } from "./tracks";
import { YOUTUBE_PLAYLISTS } from "../config/youtubePlaylists";

/**
 * One playlist object per configured YouTube playlist (see
 * src/config/youtubePlaylists.js). `trackIds` is a live getter that filters
 * the catalog by playlist membership, so songs added to any configured
 * YouTube playlist appear here automatically.
 */
export const youtubePlaylists = YOUTUBE_PLAYLISTS.map((cfg) => ({
  id: cfg.id,
  name: cfg.name,
  description: cfg.description || "Synced live from your YouTube playlist.",
  isYouTube: true,
  get trackIds() {
    const ids = [];
    for (const t of tracks) {
      if (t.playlistIds?.includes(cfg.id)) ids.push(t.id);
    }
    return ids;
  },
}));

/**
 * Mood playlists — fully automatic. Each mood's `trackIds` is a live getter
 * that returns every catalog song the mood classifier matched to it (see
 * src/services/moodClassifier.js). Future songs added to your YouTube
 * playlists are scored on every sync and appear in the fitting moods on their
 * own — no manual curation needed. To tune matching, edit the keyword rules.
 */
export const playlists = [
  {
    id: "late-night-drives",
    name: "Late Night Drives",
    description: "Window down, city lights, nowhere to be. Slow burners for the midnight road.",
    mood: true,
    get trackIds() {
      const ids = [];
      for (const t of tracks) {
        if (t.moodPlaylistIds?.includes("late-night-drives")) ids.push(t.id);
      }
      return ids;
    },
  },
  {
    id: "soul-and-silence",
    name: "Soul & Silence",
    description: "Quiet hours and quieter hearts. Acoustic-leaning gems for deep listening.",
    mood: true,
    get trackIds() {
      const ids = [];
      for (const t of tracks) {
        if (t.moodPlaylistIds?.includes("soul-and-silence")) ids.push(t.id);
      }
      return ids;
    },
  },
  {
    id: "rising-indie",
    name: "Rising Indie",
    description: "Fresh voices rewriting the charts — the indie wave you should be following.",
    mood: true,
    get trackIds() {
      const ids = [];
      for (const t of tracks) {
        if (t.moodPlaylistIds?.includes("rising-indie")) ids.push(t.id);
      }
      return ids;
    },
  },
  {
    id: "haryanvi-heat",
    name: "Haryanvi Heat",
    description: "Folk fire and desi attitude. Bold, percussive, unapologetic.",
    mood: true,
    get trackIds() {
      const ids = [];
      for (const t of tracks) {
        if (t.moodPlaylistIds?.includes("haryanvi-heat")) ids.push(t.id);
      }
      return ids;
    },
  },
  {
    id: "sad-hours",
    name: "Sad Hours",
    description: "For the feelings you can't name. Let the volume carry it.",
    mood: true,
    get trackIds() {
      const ids = [];
      for (const t of tracks) {
        if (t.moodPlaylistIds?.includes("sad-hours")) ids.push(t.id);
      }
      return ids;
    },
  },
];

// The first configured YouTube playlist is the app's main one (route /playlist).
export const mainPlaylist =
  youtubePlaylists[0] || {
    id: "personal-songs",
    name: "Personal Songs",
    description: "Your personal collection, beautifully organized.",
    get trackIds() {
      return tracks.map((t) => t.id);
    },
  };

export const getPlaylist = (id) => {
  if (!id) return mainPlaylist;
  const yt = youtubePlaylists.find((p) => p.id === id);
  if (yt) return yt;
  return playlists.find((p) => p.id === id) || null;
};
