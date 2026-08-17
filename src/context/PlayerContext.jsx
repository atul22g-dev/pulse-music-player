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
import { refreshPlaylistsFromApi, getPlaylists } from "../services/playlistService";
import { syncPlaylistFromYouTube } from "../services/youtubeService";
import { SEED_CATALOG } from "../data/seedCatalog";
import { uid, shuffleArray } from "../utils/misc";
import { useMediaSession } from "../hooks/useMediaSession";
import { useToast } from "./ToastContext";

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
          // A single-track queue reshuffles back onto the same track — keep
          // the index in bounds so the current track never goes blank.
          const nextIdx = newQueue.length > 1 ? 1 : 0;
          const next = newQueue[nextIdx];
          if (next) {
            setQueueState((prev) => ({ ...prev, queue: newQueue, queueIndex: nextIdx }));
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
          // catalog was cached without durations).
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
    setIsPlaying,
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

/* ---------------- catalog ---------------- */

function useCatalogSync(toast) {
  // Catalog: restored from the localStorage cache at boot, so the app is
  // instant and works offline. When there is no cache yet (a fresh browser —
  // e.g. a phone opening the LAN URL for the first time) the bundled seed
  // snapshot is restored so songs are visible immediately, and the live
  // YouTube refresh below updates it in the background.
  const seededRef = useRef(false);
  const [catalogVersion, setCatalogVersion] = useState(() => {
    const cached = load(STORAGE_KEYS.catalog, null);
    if (Array.isArray(cached) && cached.length) {
      restoreCatalog(cached);
      // Persist the freshly-classified snapshot so the cache self-heals.
      save(STORAGE_KEYS.catalog, getCatalogSnapshot());
    } else {
      // Fresh device (localStorage is per-origin, so a cache built on one
      // host never reaches another) — seed the library from the bundle so it
      // is never empty, even offline or while YouTube is unreachable.
      restoreCatalog(SEED_CATALOG);
      seededRef.current = true;
      save(STORAGE_KEYS.catalog, getCatalogSnapshot());
    }
    return 0;
  });

  // Load the playlist list (names + ids) from the API once at boot so the
  // sidebar and playlist routes reflect the latest config; falls back to the
  // cached or default list when offline.
  useEffect(() => {
    refreshPlaylistsFromApi();
  }, []);

  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  /**
   * Full on-demand sync (Settings → Sync playlists now, and the first-visit
   * bootstrap): pull the latest playlist config from the API, sync every
   * configured playlist from YouTube, merge the results into the catalog,
   * persist, and announce what changed. Guarded so it can never run twice at
   * once (the sync drives a single shared hidden YouTube player).
   */
  const syncNow = useCallback(
    async (opts = {}) => {
      if (syncingRef.current) return { added: 0, removed: 0, ran: false };
      syncingRef.current = true;
      setSyncing(true);
      try {
        // Fresh playlist config (API first, cached fallback) so every
        // currently-configured playlist is covered.
        await refreshPlaylistsFromApi(true);
        const playlists = getPlaylists();
        let added = 0;
        let removed = 0;
        let failures = 0;
        for (const pl of playlists) {
          try {
            const { entries } = await syncPlaylistFromYouTube(pl.id);
            // Each API playlist doubles as an album: stamp its name as the
            // track's album so the library's album view mirrors the API.
            const stamped = entries.map((e) => ({
              ...e,
              playlistId: pl.id,
              playlistName: pl.name,
              album: pl.name,
            }));
            const res = setPlaylistEntries(pl.id, stamped);
            added += res.added;
            removed += res.removed;
          } catch {
            failures += 1;
          }
        }
        save(STORAGE_KEYS.catalog, getCatalogSnapshot());
        setCatalogVersion((v) => v + 1);
        if (added > 0) {
          toast.push(`Synced ${added} new ${added === 1 ? "song" : "songs"} from your YouTube playlists`, "success");
        } else if (removed > 0) {
          toast.push(`Playlist updated — ${removed} ${removed === 1 ? "song" : "songs"} removed`, "info");
        } else if (failures === playlists.length) {
          if (!opts.quiet) toast.push("Couldn't reach YouTube — your library is unchanged", "error");
        } else if (failures > 0) {
          if (!opts.quiet) toast.push("Synced — some playlists were unreachable", "info");
        } else if (!opts.quiet) {
          toast.push("Your library is up to date", "info");
        }
        return { added, removed, ran: true };
      } finally {
        syncingRef.current = false;
        setSyncing(false);
      }
    },
    [toast]
  );

  // First visit on a new device: refresh the seeded catalog from the live
  // YouTube playlists so newly added songs show up, and persist the result.
  // Devices with their own cache skip this entirely.
  useEffect(() => {
    if (!seededRef.current) return;
    syncNow({ quiet: true });
  }, [syncNow]);

  const bumpCatalogVersion = useCallback(() => {
    setCatalogVersion((v) => v + 1);
  }, []);

  return { catalogVersion, bumpCatalogVersion, syncing, syncNow };
}

/* ---------------- provider composition ---------------- */

export function PlayerProvider({ children }) {
  const toast = useToast();

  const stateRef = useRef({});
  const library = useLibrary(toast, stateRef);
  const catalog = useCatalogSync(toast);
  const core = usePlayerCore(toast, stateRef, library.settings, catalog.bumpCatalogVersion);

  const { queue, queueIndex, shuffle, repeat, currentTrack, isPlaying, position, duration, provider, volume, recent, queueOpen, loadingTrack, setIsPlaying } = core;
  // Snapshot the latest state into the ref after commit (not during render), so
  // callbacks that read stateRef.current always see current values.
  useEffect(() => {
    stateRef.current = {
      queue, queueIndex, shuffle, repeat, isPlaying, settings: library.settings, volume, favorites: library.favorites, recent, currentTrack, duration,
    };
  });

  /* ---------------- background playback ---------------- */

  // OS-level controls (lock screen / hardware keys) driven by the same
  // callbacks the UI uses — guarded so a stale "play" press can't start
  // nothing or double-toggle.
  const mediaOnPlay = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentTrack || s.isPlaying) return;
    core.togglePlay();
  }, [core, stateRef]);

  const mediaOnPause = useCallback(() => {
    const s = stateRef.current;
    if (!s.currentTrack || !s.isPlaying) return;
    core.togglePlay();
  }, [core, stateRef]);

  useMediaSession({
    currentTrack,
    isPlaying,
    position,
    duration,
    onPlay: mediaOnPlay,
    onPause: mediaOnPause,
    onNext: core.nextTrack,
    onPrevious: core.previousTrack,
    onSeekTo: core.seekTo,
  });

  // Close detection. On desktop, closing the tab/window fires pagehide /
  // beforeunload, and we stop the song + play a power-down tone there. On
  // mobile, closing the app (swiping it away) often NEVER fires those events —
  // the process is just killed — so we react to visibilitychange → hidden
  // instead, which fires while the page is still alive (the only time the tone
  // can actually be heard). leftRef guards against multiple events firing for
  // the same leave and resets when the app becomes visible again.
  const leftRef = useRef(false);
  useEffect(() => {
    const onVisibility = () => {
      const hidden = document.visibilityState !== "visible";
      if (hidden) {
        // The app left the foreground — tab switched, window minimized,
        // phone screen locked / app backgrounded, or the tab being closed.
        // Stop the song and play the power-down tone NOW, while the page is
        // still alive (a page that is merely hidden can still produce audio;
        // a page that is truly closed cannot). This replaces the old
        // keep-playing-in-background behavior.
        if (!leftRef.current) {
          leftRef.current = true;
          engine.playCloseTone();
        }
        engine.stop();
        setIsPlaying(false);
      } else {
        leftRef.current = false;
        // Back in the foreground: wake any audio context the browser
        // suspended while hidden. Playback stays stopped until the user
        // presses play.
        engine.resumeIfSuspended();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Desktop / iOS tab close and back/forward navigation (bfcache): stop the
  // song and play the power-down tone. The tone is best-effort here — browsers
  // tear the page down on real unload, so it may not be audible everywhere;
  // stopping the audio cleanly (scheduler, oscillators, YouTube embed) is the
  // part that always matters. leftRef also resets on pageshow if the page is
  // restored from the bfcache.
  useEffect(() => {
    const onLeave = () => {
      // Tone FIRST — it must be scheduled while the AudioContext is still
      // running. stop() silences the music but keeps the context alive so the
      // blip can actually be heard (scheduling it after a suspend would freeze
      // it before it ever plays).
      if (!leftRef.current) {
        leftRef.current = true;
        engine.playCloseTone();
      }
      engine.stop();
      setIsPlaying(false);
    };
    const onShow = () => {
      leftRef.current = false;
    };
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("pageshow", onShow);
    return () => {
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("pageshow", onShow);
    };
  }, []);

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
      syncNow: catalog.syncNow,
      syncing: catalog.syncing,
    }),
    [
      currentTrack, isPlaying, position, duration, provider, volume, shuffle, repeat, queue, queueIndex,
      library.favorites, recent, library.settings, library.savedPlaylists, queueOpen, loadingTrack,
      catalog.catalogVersion, catalog.syncing, catalog.syncNow,
      core.playTrack, core.togglePlay, core.nextTrack, core.previousTrack, core.seekTo, core.setVolume,
      core.toggleShuffle, core.cycleRepeat, core.addToQueue, core.removeFromQueue, core.reorderQueue,
      core.clearQueue, saveQueueAsPlaylist, core.setQueueOpen, library.toggleFavorite, library.clearFavorites,
      core.clearRecentlyPlayed, core.removeRecent, library.deleteSavedPlaylist, library.updateSettings, resetApp,
    ]
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
