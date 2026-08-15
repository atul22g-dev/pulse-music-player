import { tracks, getAlbums } from "./tracks";
import { getPlaylists } from "../services/playlistService";

/**
 * One playlist object per configured YouTube playlist (fetched from the API —
 * see src/services/playlistService.js). `trackIds` is a live getter that
 * filters the catalog by playlist membership, so songs added to any configured
 * YouTube playlist appear here automatically. The mapped list is memoized
 * against the underlying config array so object identity stays stable between
 * renders (it only changes when the playlist config changes).
 */
let cachedYoutube = null;
export const getYoutubePlaylists = () => {
  const source = getPlaylists();
  if (!cachedYoutube || cachedYoutube.source !== source) {
    cachedYoutube = {
      source,
      list: source.map((cfg) => ({
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
      })),
    };
  }
  return cachedYoutube.list;
};

/** Stable playlist id for an album name (used for routes + getPlaylist lookups). */
export const albumPlaylistId = (name = "") => {
  const slug = String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `album-${slug || encodeURIComponent(String(name))}`;
};

/**
 * One playlist per album, derived from the live catalog (see getAlbums in
 * data/tracks.js). `trackIds` is a live getter that returns every catalog
 * track whose album matches, so re-syncing or adding songs updates the
 * album playlists on their own. Memoized against the set of album names so
 * object identity stays stable between renders.
 */
let cachedAlbums = null;
export const getAlbumPlaylists = () => {
  const albums = getAlbums();
  const key = albums.map((a) => a.name).join("\u0000");
  if (!cachedAlbums || cachedAlbums.key !== key) {
    const configs = new Map(getPlaylists().map((c) => [c.name, c]));
    cachedAlbums = {
      key,
      list: albums.map((a) => {
        const cfg = configs.get(a.name);
        return {
          id: albumPlaylistId(a.name),
          name: a.name,
          description: cfg?.description || `Album · ${a.artist}`,
          artwork: a.thumbnail || "",
          isAlbum: true,
          get trackIds() {
            const ids = [];
            for (const t of tracks) {
              if (t.album === a.name) ids.push(t.id);
            }
            return ids;
          },
        };
      }),
    };
  }
  return cachedAlbums.list;
};

// The first configured YouTube playlist is the app's main one (route /playlist).
export const getMainPlaylist = () => {
  const yt = getYoutubePlaylists()[0];
  if (yt) return yt;
  return {
    id: "personal-songs",
    name: "Personal Songs",
    description: "Your personal collection, beautifully organized.",
    get trackIds() {
      return tracks.map((t) => t.id);
    },
  };
};

export const getPlaylist = (id) => {
  if (!id) return getMainPlaylist();
  const yt = getYoutubePlaylists().find((p) => p.id === id);
  if (yt) return yt;
  return getAlbumPlaylists().find((p) => p.id === id) || null;
};
