# PULSE — A Personal Music Player

A premium, cinematic music-player web app — a personal Spotify/Apple-Music-style
dashboard with its own identity. Dark glassmorphism UI, a generative audio
engine, full player state, queue management, favorites, history, themes, and a
complete responsive layout.

Built with **React + Vite + Tailwind CSS + React Router + Lucide**, persisting
everything to **LocalStorage**.

![stack](https://img.shields.io/badge/React-18-61dafb) ![vite](https://img.shields.io/badge/Vite-5-646cff) ![tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8)

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npm run preview    # serve the production build
```

## What's inside

| Area | Highlights |
| --- | --- |
| **Home** | Featured hero player with vinyl artwork, visualizer, progress; Jump back in; mood playlists; favorites; trending |
| **Discover** | Recently played shelf, recommended mixes, trending list, favorites shelf, continue listening |
| **Playlist** | Header collage, play-all/shuffle, live filter, sort by title/artist/duration, YouTube-sync indicator, saved playlists |
| **Favorites** | Songs / Artists / Albums tabs, empty states |
| **Recently Played** | Timestamps, continue-listening hero, clear history |
| **Artists & Albums** | Index + detail pages with play-all |
| **Search** | Global, grouped results (songs / artists / albums / playlists), keyboard friendly |
| **Settings** | Dark / OLED / Light themes, 5 accent colors, volume, autoplay, crossfade, reduce-motion, data controls, keyboard map |
| **Now Playing** | Full-screen immersive view with vinyl, visualizer, full transport |
| **Queue drawer** | Now playing + next up, drag-to-reorder, play next, remove, clear, save as playlist |
| **Mini player** | Sticky bottom bar on every page, compact on mobile, full transport on desktop |

Playback state, favorites, history, queue, volume, theme and settings all
persist across refreshes via LocalStorage (`music-player-*` keys).

## Architecture

```
src/
├── components/      Reusable UI (Artwork, Visualizer, SongRow/List, cards,
│                    MiniPlayer, QueueDrawer, Sidebar, HeroPlayer, toasts, …)
├── pages/           One file per route (Home, Discover, Playlist, Search, …)
├── layouts/         AppLayout — sidebar + header + mini player + bottom nav
├── context/         PlayerContext (global player state) + ToastContext
├── hooks/           useFirstVisitLoading, useMediaQuery
├── services/        audioEngine (playback), youtubeService (API), moodClassifier, storage
├── config/          youtubePlaylists.js — manage your playlists here
├── data/            tracks.js (live catalog), playlists.js (playlist objects)
├── utils/           formatting, seeded RNG, sharing, library helpers
└── App.jsx          Router + lazy-loaded pages
```

The layers are deliberately separated so the app can swap providers without
touching UI:

```
UI (pages/components)
   │  playTrack / pause / next / seekTo / setVolume …
   ▼
PlayerContext (global state, queue, favorites, history, settings)
   │
   ▼
audioEngine  ──────►  Web Audio API (generative synth + analyser)
youtubeService ─────►  YouTube Data API v3 (optional, when key configured)
storage ───────────►  LocalStorage persistence
```

## How playback works (important)

Tracks play **for real, from YouTube** — through YouTube's official IFrame
Player API (`services/audioEngine.js`). It's an official embed-based
integration: nothing is downloaded or extracted, and playback shows up in the
embed's own view counter like any normal embed.

The engine has two providers behind one stable surface
(`load / play / pause / seekTo / setVolume / getPosition / getDuration / onEnded`):

- **`youtube`** — a hidden official IFrame player streams each track's real
  audio/video; real `getCurrentTime()` / `getDuration()` drive the progress UI.
- **`synth`** — automatic fallback that synthesizes an original ambient
  composition locally when YouTube is unreachable or a video is blocked
  (region restrictions, embedding disabled). The UI shows a toast when this
  happens.

Swap in any other provider later without touching the player context or UI.

## Configuring your playlists (no hardcoded tracks)

**The song catalog is 100% live — there is no hardcoded track list anywhere.**
All playlists are managed in one config file:

```js
// src/config/youtubePlaylists.js

export const YOUTUBE_PLAYLISTS = [
  {
    id: "PLIV4nZCjWE3E",
    name: "Personal Songs",
    description: "Your personal collection, beautifully organized.",
  },
  // Add more playlists here — each becomes its own playlist in the app:
  // {
  //   id: "PLxxxxxx",
  //   name: "Workout Mix",
  //   description: "Energy for the gym.",
  // },
];
```

- Paste any YouTube playlist id (from `?list=...`) plus a name, and it becomes
  its own playlist — the sidebar shows a **Your Playlists** section and each
  entry gets a `/playlist/:id` page.
- Songs across **all** configured playlists are aggregated into the library
  (home, search, favorites, artists, albums). A video shared by two playlists
  appears once in the library but in both playlists.
- The first entry is the app's main playlist (route `/playlist`).

### How the live sync works (no API key, no scraping, official surfaces only)

1. **Boot + every 10 minutes** the app reads each playlist's *current* video
   ids through YouTube's official IFrame Player API (`cuePlaylist` on a hidden
   player — no scraping, no CORS issues).
2. If any id list differs from the cached catalog (songs added or removed), a
   full sync runs: each video is cued and its real title, channel and duration
   are read back. A quick probe detects environments where the embed can't
   load per-video metadata and falls back to YouTube's CORS-enabled **oEmbed**
   endpoint for complete titles/artists (durations then arrive live from the
   player during playback and are written back to the catalog).
3. The catalog is cached in LocalStorage (`music-player-catalog-v3`) so the
   app is instant and works offline, and a manual **Sync now** button forces a
   re-check any time.

If you set `VITE_YOUTUBE_API_KEY`, sync switches to the YouTube Data API v3
(paginated `playlistItems` + exact durations from `videos`).

## Automatic mood matching

The five mood-mix playlists ("Late Night Drives", "Soul & Silence", "Rising
Indie", "Haryanvi Heat", "Sad Hours") are **fully automatic** — there is no
manual track list anywhere. Every time the catalog changes (new songs synced,
new playlists added), `src/services/moodClassifier.js` scores each song
against the moods using keyword + artist rules and drops it into every mood it
fits. A song can be in several moods, and songs that match nothing simply stay
out. Tune matching by editing the keyword weights and the per-mood threshold
in that file; the **Settings → Mood playlists → Re-analyze moods** button
re-runs it over the whole library.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `←` / `→` | Seek ±5s |
| `Shift + ←` / `→` | Previous / next track |
| `↑` / `↓` | Volume |
| `F` | Favorite current track |

## Accessibility & performance

- ARIA labels throughout, focus-visible rings, semantic landmarks, keyboard
  navigation on song rows, `prefers-reduced-motion` + in-app reduce-motion.
- Lazy-loaded routes, memoized song lists, canvas visualizer (single rAF),
  thumbnail fallbacks, skeleton loaders, toast notifications.

## Notes

- Album artwork comes from YouTube's public image CDN (same images YouTube
  embeds use) and falls back to a generated gradient if it ever fails.
- This is a frontend-only demo: no accounts, no backend. All state is local to
  the browser.
