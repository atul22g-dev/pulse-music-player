import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { engine } from "../services/audioEngine";
import { STORAGE_KEYS, load, save, clearAll } from "../services/storage";
import {
  getTrack,
  getAllTracks,
  restoreCatalog,
  setPlaylistEntries,
  getArtists,
  getAlbums,
  getCatalogSnapshot,
  updateTrackDuration,
} from "../data/tracks";
import {
  syncPlaylistFromYouTube,
  fetchPlaylistVideoIdsFromPlayer,
} from "../services/youtubeService";
import {
  getPlaylists,
  subscribePlaylists,
  refreshPlaylistsFromApi,
} from "../services/playlistService";
import { uid, shuffleArray } from "../utils/misc";
import { useToast } from "./ToastContext";

const RESYNC_INTERVAL_MS = 10 * 60 * 1000; // re-check the playlists every 10 minutes

const PlayerContext = createContext(null);

export function usePlayer() {
  return useContext(PlayerContext);
}

const RECENT_LIMIT = 25;

const DEFAULT_SETTINGS = {
  theme: "dark",
  accent: "purple",
  autoplay: true,
  crossfade: false,
  reduceMotion: false,
};

function restoreQueue() {
  const saved = load(STORAGE_KEYS.queue, null);
  if (!saved || !Array.isArray(saved.queue)) {
    return { queue: [], queueIndex: -1, shuffle: false, repeat: "off" };
  }
  const queue = [];
  for (const t of saved.queue) {
    if (!t?.id) continue;
    queue.push(getTrack(t.id) || t);
  }
  return {
    queue,
    queueIndex: Math.min(Math.max(saved.queueIndex ?? -1, -1), queue.length - 1),
    shuffle: Boolean(saved.shuffle),
    repeat: saved.repeat || "off",
  };
}

function addRecentEntry(recent, track, limit) {
  const now = new Date().toISOString();
  return [{ id: track.id, playedAt: now }, ...recent.filter((r) => r.id !== track.id)].slice(0, limit);
}

/* ---------------- player core: queue + transport + recents ---------------- */

function usePlayerCore(toast, stateRef, settings, bumpCatalogVersion) {
  const [queueState, setQueueState] = useState(restoreQueue);
  const { queue, queueIndex, shuffle, repeat } = queueState;
  const currentTrack = queueIndex >= 0 && queue.length > 0 ? queue[queueIndex] : null;

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(() => currentTrack?.duration ?? 0);
  const [provider, setProvider] = useState("synth");
  const [volume, setVolumeState] = useState(() => load(STORAGE_KEYS.volume, 0.8) ?? 0.8);
  const [recent, setRecent] = useState(() => load(STORAGE_KEYS.recent, []));
  const [queueOpen, setQueueOpen] = useState(false);
  const [loadingTrack, setLoadingTrack] = useState(false);

  // Track metadata changes → reset the displayed duration to metadata until
  // the real provider duration arrives.
  useEffect(() => {
    setDuration(currentTrack?.duration ?? 0);
  }, [currentTrack?.id, currentTrack?.duration]);

  /* ---------------- persistence ---------------- */

  useEffect(() => { save(STORAGE_KEYS.recent, recent); }, [recent]);
  useEffect(() => { save(STORAGE_KEYS.volume, volume); }, [volume]);
  useEffect(
    () => { save(STORAGE_KEYS.queue, { queue, queueIndex, shuffle, repeat }); },
    [queue, queueIndex, shuffle, repeat]
  );

  /* ---------------- engine wiring ---------------- */

  useEffect(() => {
    engine.onError = (msg) => toast.push(msg, "error");
    engine.onMessage = (msg) => toast.push(msg, "info");
    engine.onProviderChange = (p) => setProvider(p);
    engine.setVolume(volume);
    // Warm up the YouTube IFrame player so the first play is instant and
    // still inside the user's click gesture.
    engine.initYouTube();
    return () => {
      engine.onError = null;
      engine.onMessage = null;
      engine.onProviderChange = null;
      engine.onEnded = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  /* ---------------- core transport ---------------- */

  const startEngine = useCallback(
    (track, opts = {}) => {
      const { fromEnded = false } = opts;
      const isSameTrack = engine.track?.id === track.id;
      const doStart = () => {
        if (!isSameTrack) engine.load(track);
        engine.setVolume(volume);
        engine.play();
        if (settings.crossfade && !fromEnded) engine.fadeIn();
        setIsPlaying(true);
        setPosition(0);
        setLoadingTrack(false);
      };
      if (settings.crossfade && isPlaying && !fromEnded) {
        setLoadingTrack(true);
        engine.fadeOut(0.12).then(doStart);
      } else {
        setLoadingTrack(false);
        doStart();
      }
    },
    [isPlaying, volume, settings.crossfade]
  );

  const playTrack = useCallback(
    (track, opts = {}) => {
      if (!track) return;
      const s = stateRef.current;
      if (opts.queue) {
        setQueueState((prev) => ({ ...prev, queue: opts.queue, queueIndex: opts.index ?? 0 }));
      } else if (!opts.keepQueue) {
        setQueueState((prev) => ({ ...prev, queue: [track], queueIndex: 0 }));
      }
      if (s.currentTrack?.id === track.id && s.isPlaying && !opts.fromEnded) {
        engine.pause();
        setIsPlaying(false);
        return;
      }
      startEngine(track, opts);
      setRecent((prev) => addRecentEntry(prev, track, RECENT_LIMIT));
    },
    [startEngine, stateRef]
  );

  const togglePlay = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentTrack) return;
    if (s.isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      startEngine(s.currentTrack, { fromEnded: true });
    }
  }, [startEngine, stateRef]);

  const nextTrack = useCallback(
    (auto = false) => {
      const s = stateRef.current;
      if (!s.queue.length) return;
      let idx;
      if (s.shuffle && s.queue.length > 1) {
        let r;
        do {
          r = Math.floor(Math.random() * s.queue.length);
        } while (r === s.queueIndex);
        idx = r;
      } else {
        idx = s.queueIndex + 1;
        if (idx >= s.queue.length) idx = s.repeat === "all" ? 0 : -1;
      }
      if (idx < 0) {
        if (s.settings.autoplay) {
          const rest = shuffleArray(s.queue).filter((t) => t.id !== s.queue[s.queueIndex]?.id);
          const newQueue = [s.currentTrack, ...rest];
          const next = newQueue[1] || newQueue[0];
          if (next) {
            setQueueState((prev) => ({ ...prev, queue: newQueue, queueIndex: 1 }));
            startEngine(next, { fromEnded: true });
            setRecent((prev) => addRecentEntry(prev, next, RECENT_LIMIT));
          }
        } else {
          setIsPlaying(false);
        }
        return;
      }
      const track = s.queue[idx];
      setQueueState((prev) => ({ ...prev, queueIndex: idx }));
      startEngine(track, { fromEnded: true });
      setRecent((prev) => addRecentEntry(prev, track, RECENT_LIMIT));
    },
    [startEngine, stateRef]
  );

  const previousTrack = useCallback(() => {
    const s = stateRef.current;
    if (!s.queue.length) return;
    if (engine.getPosition() > 3 && s.isPlaying) {
      engine.seekTo(0);
      setPosition(0);
      return;
    }
    let idx = s.queueIndex - 1;
    if (idx < 0) idx = s.repeat === "all" ? s.queue.length - 1 : 0;
    const track = s.queue[idx];
    setQueueState((prev) => ({ ...prev, queueIndex: idx }));
    startEngine(track, { fromEnded: true });
    setRecent((prev) => addRecentEntry(prev, track, RECENT_LIMIT));
  }, [startEngine, stateRef]);

  /* ---------------- end-of-track handling ---------------- */

  const handleEnded = useCallback(() => {
    const s = stateRef.current;
    if (s.repeat === "one") {
      engine.seekTo(0);
      engine.play();
      setIsPlaying(true);
      setPosition(0);
      return;
    }
    const lastIndex = s.queue.length - 1;
    if (s.queueIndex < lastIndex) {
      nextTrack(true);
    } else if (s.repeat === "all") {
      nextTrack(true);
    } else if (s.settings.autoplay) {
      const rest = shuffleArray(s.queue).filter((t) => t.id !== s.currentTrack?.id);
      const newQueue = [s.currentTrack, ...rest];
      const track = newQueue[Math.min(1, newQueue.length - 1)];
      if (track) {
        setQueueState((prev) => ({ ...prev, queue: newQueue, queueIndex: Math.min(1, newQueue.length - 1) }));
        startEngine(track, { fromEnded: true });
        setRecent((prev) => addRecentEntry(prev, track, RECENT_LIMIT));
      }
    } else {
      setIsPlaying(false);
    }
  }, [nextTrack, startEngine, stateRef]);

  const onEndedRef = useRef(handleEnded);
  // Keep the ref pointing at the latest handler without mutating it during
  // render (React can replay or discard render work).
  useEffect(() => {
    onEndedRef.current = handleEnded;
  });

  useEffect(() => {
    engine.onEnded = () => onEndedRef.current();
  }, []);

  /* ---------------- position polling ---------------- */

  useEffect(() => {
    const timer = setInterval(() => {
      const s = stateRef.current;
      if (s.isPlaying) {
        setPosition(engine.getPosition());
        const realDuration = engine.getDuration();
        if (realDuration > 0 && Math.abs(realDuration - s.duration) > 0.4) {
          setDuration(realDuration);
          // Persist the real duration back into the catalog (matters when the
          // catalog was synced without durations, e.g. via the oEmbed path).
          if (updateTrackDuration(s.currentTrack?.id, realDuration)) {
            save(STORAGE_KEYS.catalog, getCatalogSnapshot());
            bumpCatalogVersion();
          }
        }
      }
    }, 250);
    return () => clearInterval(timer);
  }, [stateRef, bumpCatalogVersion]);

  /* ---------------- transport controls ---------------- */

  const seekTo = useCallback((seconds) => {
    engine.seekTo(seconds);
    setPosition(seconds);
  }, []);

  const setVolume = useCallback((v) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    engine.setVolume(clamped);
  }, []);

  const toggleShuffle = useCallback(() => {
    setQueueState((prev) => ({ ...prev, shuffle: !prev.shuffle }));
    toast.push(`Shuffle ${stateRef.current.shuffle ? "off" : "on"}`, "info");
  }, [toast, stateRef]);

  const cycleRepeat = useCallback(() => {
    const order = ["off", "all", "one"];
    const next = order[(order.indexOf(stateRef.current.repeat || "off") + 1) % 3];
    setQueueState((prev) => ({ ...prev, repeat: next }));
    toast.push(next === "off" ? "Repeat off" : next === "all" ? "Repeat all" : "Repeat one", "info");
  }, [toast, stateRef]);

  /* ---------------- queue management ---------------- */

  const addToQueue = useCallback(
    (track, opts = {}) => {
      if (!track) return;
      const s = stateRef.current;
      if (!s.queue.length) {
        playTrack(track);
        return;
      }
      if (opts.playNext) {
        setQueueState((prev) => {
          const q = [...prev.queue];
          q.splice(prev.queueIndex + 1, 0, track);
          return { ...prev, queue: q };
        });
        toast.push(`“${track.title}” will play next`, "info");
      } else {
        setQueueState((prev) => ({ ...prev, queue: [...prev.queue, track] }));
        toast.push(`Added “${track.title}” to queue`, "success");
      }
    },
    [playTrack, toast, stateRef]
  );

  const removeFromQueue = useCallback(
    (index) => {
      setQueueState((prev) => {
        const q = [...prev.queue];
        q.splice(index, 1);
        let idx = prev.queueIndex;
        if (index < idx) idx -= 1;
        else if (index === idx) idx = Math.min(idx, q.length - 1);
        return { queue: q, queueIndex: idx, shuffle: prev.shuffle, repeat: prev.repeat };
      });
      toast.push("Removed from queue", "info");
    },
    [toast]
  );

  const reorderQueue = useCallback(
    (from, to) => {
      if (from === to) return;
      setQueueState((prev) => {
        const q = [...prev.queue];
        const [moved] = q.splice(from, 1);
        q.splice(to, 0, moved);
        let idx = prev.queueIndex;
        if (from === idx) idx = to;
        else if (from < idx && to >= idx) idx -= 1;
        else if (from > idx && to <= idx) idx += 1;
        return { ...prev, queue: q, queueIndex: idx };
      });
      toast.push("Queue reordered", "info");
    },
    [toast]
  );

  const clearQueue = useCallback(() => {
    const s = stateRef.current;
    const keep = s.currentTrack ? [s.currentTrack] : [];
    setQueueState({ queue: keep, queueIndex: keep.length ? 0 : -1, shuffle: s.shuffle, repeat: s.repeat });
    toast.push("Queue cleared", "info");
  }, [toast, stateRef]);

  /* ---------------- recently played ---------------- */

  const clearRecentlyPlayed = useCallback(() => {
    setRecent([]);
    toast.push("Recently played cleared", "info");
  }, [toast]);

  const removeRecent = useCallback((id) => {
    setRecent((prev) => prev.filter((r) => r.id !== id));
  }, []);

  /* ---------------- reset (player slice) ---------------- */

  const resetCore = useCallback(() => {
    setQueueState({ queue: [], queueIndex: -1, shuffle: false, repeat: "off" });
    setRecent([]);
    setVolumeState(0.8);
    engine.setVolume(0.8);
    engine.pause();
    setIsPlaying(false);
    setPosition(0);
  }, []);

  return {
    queue, queueIndex, shuffle, repeat, currentTrack,
    isPlaying, position, duration, provider, volume, recent,
    queueOpen, loadingTrack, setQueueOpen,
    playTrack, togglePlay, nextTrack, previousTrack,
    seekTo, setVolume, toggleShuffle, cycleRepeat,
    addToQueue, removeFromQueue, reorderQueue, clearQueue,
    clearRecentlyPlayed, removeRecent, resetCore,
  };
}

/* ---------------- library state: favorites + settings + saved playlists ---------------- */

function useLibrary(toast, stateRef) {
  const [favorites, setFavorites] = useState(() => load(STORAGE_KEYS.favorites, []));
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...load(STORAGE_KEYS.settings, {}) }));
  const [savedPlaylists, setSavedPlaylists] = useState(() => load("music-player-saved-playlists", []));

  /* ---------------- persistence ---------------- */

  useEffect(() => { save(STORAGE_KEYS.favorites, favorites); }, [favorites]);
  useEffect(() => { save(STORAGE_KEYS.settings, settings); }, [settings]);
  useEffect(() => { save("music-player-saved-playlists", savedPlaylists); }, [savedPlaylists]);

  /* ---------------- theme application ---------------- */

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", settings.theme);
    root.setAttribute("data-accent", settings.accent);
    root.setAttribute("data-reduce-motion", settings.reduceMotion ? "true" : "false");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", settings.theme === "light" ? "#f3f3f8" : "#07070b");
    }
  }, [settings.theme, settings.accent, settings.reduceMotion]);

  /* ---------------- favorites / settings ---------------- */

  const toggleFavorite = useCallback(
    (id) => {
      if (!id) return;
      const s = stateRef.current;
      const has = s.favorites.includes(id);
      setFavorites((prev) => (has ? prev.filter((f) => f !== id) : [...prev, id]));
      const track = getTrack(id);
      const name = track?.title || "Track";
      toast.push(has ? `Removed “${name}” from favorites` : `Added “${name}” to favorites`, has ? "info" : "favorite");
    },
    [toast, stateRef]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
    toast.push("Favorites cleared", "info");
  }, [toast]);

  const deleteSavedPlaylist = useCallback(
    (id) => {
      setSavedPlaylists((prev) => prev.filter((p) => p.id !== id));
      toast.push("Playlist deleted", "info");
    },
    [toast]
  );

  const prependSavedPlaylist = useCallback((pl) => {
    setSavedPlaylists((prev) => [pl, ...prev]);
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    toast.push("Settings saved", "success");
  }, [toast]);

  /* ---------------- reset (library slice) ---------------- */

  const resetLibrary = useCallback(() => {
    setFavorites([]);
    setSavedPlaylists([]);
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return {
    favorites, settings, savedPlaylists,
    toggleFavorite, clearFavorites, deleteSavedPlaylist,
    prependSavedPlaylist, updateSettings, resetLibrary,
  };
}

/* ---------------- catalog sync ---------------- */

function useCatalogSync(toast) {
  // The list of YouTube playlists to track, fetched from the API at boot
  // (services/playlistService.js) — cached locally with a default fallback.
  const [youtubePlaylists, setYoutubePlaylists] = useState(getPlaylists);

  useEffect(
    () => subscribePlaylists(() => setYoutubePlaylists(getPlaylists())),
    []
  );

  // Catalog: starts from the localStorage cache (so the app is instant and
  // offline-capable) and is refreshed from the live YouTube playlists below.
  const [catalogVersion, setCatalogVersion] = useState(() => {
    const cached = load(STORAGE_KEYS.catalog, null);
    if (Array.isArray(cached) && cached.length) {
      restoreCatalog(cached);
      // Persist the freshly-classified snapshot so the cache self-heals.
      save(STORAGE_KEYS.catalog, getCatalogSnapshot());
    }
    return 0;
  });
  const [syncState, setSyncState] = useState("idle"); // idle | syncing | ok | offline
  const syncingRef = useRef(false);

  const applyPlaylist = useCallback((playlistId, entries) => {
    const { added, removed } = setPlaylistEntries(playlistId, entries);
    save(STORAGE_KEYS.catalog, getCatalogSnapshot());
    setCatalogVersion((v) => v + 1);
    return { added, removed };
  }, []);

  const announceSync = useCallback(
    (added, removed) => {
      if (added > 0) {
        toast.push(`Synced ${added} new ${added === 1 ? "song" : "songs"} from your YouTube playlists`, "success");
      } else if (removed > 0) {
        toast.push(`Playlist updated — ${removed} ${removed === 1 ? "song" : "songs"} removed`, "info");
      }
    },
    [toast]
  );

  /** Sync every configured playlist and merge the results into the catalog. */
  const syncNow = useCallback(async () => {
    if (syncingRef.current) return { added: 0, removed: 0 };
    syncingRef.current = true;
    setSyncState("syncing");
    let added = 0;
    let removed = 0;
    try {
      // Playlists are synced strictly one at a time: the fetches share a single
      // hidden YouTube player and each result merges into the same catalog, so
      // running them concurrently would corrupt both. The promise chain makes
      // that ordering explicit.
      let chain = Promise.resolve();
      for (const pl of youtubePlaylists) {
        chain = chain.then(async () => {
          const { entries } = await syncPlaylistFromYouTube(pl.id);
          // Each API playlist doubles as an album: stamp its name as the
          // track's album so the library's album view mirrors the API.
          const stamped = entries.map((e) => ({ ...e, playlistId: pl.id, playlistName: pl.name, album: pl.name }));
          const res = applyPlaylist(pl.id, stamped);
          added += res.added;
          removed += res.removed;
        });
      }
      await chain;
      setSyncState("ok");
      announceSync(added, removed);
      return { added, removed };
    } catch {
      setSyncState("offline");
      return { added: 0, removed: 0 };
    } finally {
      syncingRef.current = false;
    }
  }, [applyPlaylist, announceSync, youtubePlaylists]);

  // Boot sync + periodic re-check: songs added to any configured YouTube
  // playlist later show up automatically (a cheap id comparison per playlist,
  // every 10 minutes).
  useEffect(() => {
    let active = true;
    let ranOnce = false;
    const lightCheck = async () => {
      try {
        // Id checks also share the single hidden player, so each playlist is
        // checked in turn via an explicit sequential chain.
        let needsSync = false;
        let chain = Promise.resolve();
        for (const pl of youtubePlaylists) {
          chain = chain.then(async () => {
            const { ids } = await fetchPlaylistVideoIdsFromPlayer(pl.id);
            const current = [];
            for (const t of getAllTracks()) {
              if (t.playlistIds?.includes(pl.id)) current.push(t.id);
            }
            const currentSet = new Set(current);
            const idsSet = new Set(ids);
            // New songs added, or songs removed → full metadata sync.
            if (ids.some((id) => !currentSet.has(id))) needsSync = true;
            if (current.some((id) => !idsSet.has(id))) needsSync = true;
          });
        }
        await chain;
        // Ignore stale results if the effect was torn down while awaiting.
        if (!active) return;
        if (needsSync) {
          syncNow();
        } else {
          setSyncState((s) => (s === "idle" ? "ok" : s));
        }
      } catch {
        /* offline — keep the cached catalog */
        if (active) setSyncState((s) => (s === "idle" ? "offline" : s));
      }
    };
    const boot = async () => {
      if (ranOnce) return;
      ranOnce = true;
      // Pull the playlist list from the API first (falls back to the cached
      // or default list), so the first sync below uses it.
      await refreshPlaylistsFromApi();
      if (!active) return;
      // First light check pulls each playlist's id list; if the catalog is
      // empty or any playlist changed, a full metadata sync follows.
      await lightCheck();
    };
    boot();
    const interval = setInterval(() => {
      lightCheck();
      // Re-pull the playlist list from the API too, so playlists added there
      // later (with their songs) show up automatically without a reload.
      refreshPlaylistsFromApi();
    }, RESYNC_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [syncNow, youtubePlaylists]);

  const bumpCatalogVersion = useCallback(() => {
    setCatalogVersion((v) => v + 1);
  }, []);

  return {
    catalogVersion,
    syncState,
    syncNow,
    bumpCatalogVersion,
    youtubePlaylists,
  };
}

/* ---------------- provider composition ---------------- */

export function PlayerProvider({ children }) {
  const toast = useToast();

  const stateRef = useRef({});
  const library = useLibrary(toast, stateRef);
  const catalog = useCatalogSync(toast);
  const core = usePlayerCore(toast, stateRef, library.settings, catalog.bumpCatalogVersion);

  const { queue, queueIndex, shuffle, repeat, currentTrack, isPlaying, position, duration, provider, volume, recent, queueOpen, loadingTrack } = core;
  // Snapshot the latest state into the ref after commit (not during render), so
  // callbacks that read stateRef.current always see current values.
  useEffect(() => {
    stateRef.current = {
      queue, queueIndex, shuffle, repeat, isPlaying, settings: library.settings, volume, favorites: library.favorites, recent, currentTrack, duration,
    };
  });

  /* ---------------- cross-cutting actions ---------------- */

  const saveQueueAsPlaylist = useCallback(() => {
    const name = `My Queue · ${new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    const pl = {
      id: uid("pl"),
      name,
      description: "Saved from your queue",
      trackIds: queue.map((t) => t.id),
      createdAt: new Date().toISOString(),
    };
    library.prependSavedPlaylist(pl);
    toast.push("Queue saved as playlist", "success");
  }, [queue, library.prependSavedPlaylist, toast]);

  const resetApp = useCallback(() => {
    clearAll();
    core.resetCore();
    library.resetLibrary();
    toast.push("Application reset — fresh start", "info");
  }, [core.resetCore, library.resetLibrary, toast]);

  /* ---------------- keyboard shortcuts ---------------- */

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
      if (e.code === "Space") {
        e.preventDefault();
        core.togglePlay();
      } else if (e.key === "ArrowRight" && e.shiftKey) {
        core.nextTrack();
      } else if (e.key === "ArrowLeft" && e.shiftKey) {
        core.previousTrack();
      } else if (e.key === "ArrowRight") {
        core.seekTo(Math.min(stateRef.current.duration || stateRef.current.currentTrack?.duration || 0, engine.getPosition() + 5));
      } else if (e.key === "ArrowLeft") {
        core.seekTo(Math.max(0, engine.getPosition() - 5));
      } else if (e.key === "ArrowUp") {
        core.setVolume(stateRef.current.volume + 0.05);
      } else if (e.key === "ArrowDown") {
        core.setVolume(stateRef.current.volume - 0.05);
      } else if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey) {
        const cur = stateRef.current.currentTrack;
        if (cur) library.toggleFavorite(cur.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [core.togglePlay, core.nextTrack, core.previousTrack, core.seekTo, core.setVolume, library.toggleFavorite]);

  const value = useMemo(
    () => ({
      currentTrack,
      isPlaying,
      position,
      duration,
      provider,
      volume,
      shuffle,
      repeat,
      queue,
      queueIndex,
      favorites: library.favorites,
      recent,
      settings: library.settings,
      savedPlaylists: library.savedPlaylists,
      queueOpen,
      loadingTrack,
      // live catalog (derived fresh on every catalog update)
      catalog: getAllTracks(),
      artists: getArtists(),
      albums: getAlbums(),
      syncState: catalog.syncState,
      syncNow: catalog.syncNow,
      youtubePlaylists: catalog.youtubePlaylists,
      playTrack: core.playTrack,
      togglePlay: core.togglePlay,
      nextTrack: core.nextTrack,
      previousTrack: core.previousTrack,
      seekTo: core.seekTo,
      setVolume: core.setVolume,
      toggleShuffle: core.toggleShuffle,
      cycleRepeat: core.cycleRepeat,
      addToQueue: core.addToQueue,
      removeFromQueue: core.removeFromQueue,
      reorderQueue: core.reorderQueue,
      clearQueue: core.clearQueue,
      saveQueueAsPlaylist,
      setQueueOpen: core.setQueueOpen,
      toggleFavorite: library.toggleFavorite,
      clearFavorites: library.clearFavorites,
      clearRecentlyPlayed: core.clearRecentlyPlayed,
      removeRecent: core.removeRecent,
      deleteSavedPlaylist: library.deleteSavedPlaylist,
      updateSettings: library.updateSettings,
      resetApp,
    }),
    [
      currentTrack, isPlaying, position, duration, provider, volume, shuffle, repeat, queue, queueIndex,
      library.favorites, recent, library.settings, library.savedPlaylists, queueOpen, loadingTrack,
      catalog.catalogVersion, catalog.syncState, catalog.syncNow,
      catalog.youtubePlaylists,
      core.playTrack, core.togglePlay, core.nextTrack, core.previousTrack, core.seekTo, core.setVolume,
      core.toggleShuffle, core.cycleRepeat, core.addToQueue, core.removeFromQueue, core.reorderQueue,
      core.clearQueue, saveQueueAsPlaylist, core.setQueueOpen, library.toggleFavorite, library.clearFavorites,
      core.clearRecentlyPlayed, core.removeRecent, library.deleteSavedPlaylist, library.updateSettings, resetApp,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
