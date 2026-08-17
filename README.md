# Pulse — A Personal Music Player

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
| **Home** | Featured hero player with vinyl artwork, visualizer, progress; Jump back in; your playlists; favorites; trending |
| **Discover** | Recently played shelf, recommended mixes, trending list, favorites shelf, continue listening |
| **Playlist** | Header collage, play-all/shuffle, live filter, sort by title/artist/duration, saved playlists |
| **Favorites** | Songs / Artists / Albums tabs, empty states |
| **Recently Played** | Timestamps, continue-listening hero, clear history |
| **Artists & Albums** | Index + detail pages with play-all |
| **Search** | Global, grouped results (songs / artists / albums / playlists), keyboard friendly |
| **Settings** | Dark / OLED / Light themes, 5 accent colors, volume, autoplay, crossfade, reduce-motion, data controls, keyboard map |
| **Background music** | Media Session API: lock-screen metadata + controls; PWA installable app that keeps playing with the screen locked |
| **Now Playing** | Full-screen immersive view with vinyl, visualizer, full transport |
| **Queue drawer** | Now playing + next up, drag-to-reorder, play next, remove, clear, save as playlist |
| **Mini player** | Sticky bottom bar on every page, compact on mobile, full transport on desktop |

Playback state, favorites, history, queue, volume, theme and settings all
persist across refreshes via LocalStorage (`music-player-*` keys).

## Background music

Pulse plays in the background — switch tabs, minimize the window, or lock
your phone and the music keeps going:

- **Media Session API** (`src/services/mediaSession.js`): the OS shows the
  current track (title, artist, artwork) on the lock screen / notification
  shade with working **play / pause / next / previous / seek** controls.
- **PWA install** (`public/manifest.webmanifest`, `public/sw.js`, generated
  icons): on a phone, **Add to Home Screen** (Chrome) / **Add to Home Screen**
  (Safari), then launch the installed app and lock the phone — audio keeps
  playing with the screen off. Browsers pause audio when a *page* is fully
  closed, so the installed app is required for true lock-screen playback.
- **Background-safe synth scheduler**: the local ambient engine schedules
  notes well ahead of playback so throttled background timers can't starve
  it, and the audio context resumes if the browser suspended it while
  backgrounded.
- **Automatic background handoff**: mobile browsers suspend YouTube embeds
  the moment the app is backgrounded or the screen locks — that would stop
  the music. Pulse detects it, hands the current track off to the
  background-safe synth preview *at the same position* (with a toast so
  you know), keeps playing through the lock screen with full media-session
  controls, and hands back to the real YouTube track when the app is
  visible again. Desktop is untouched — YouTube keeps playing in
  background tabs there.

Regenerate the PWA icons anytime with `npm run icons` (zero dependencies).

## Architecture

```
src/
├── components/      Reusable UI (Artwork, Visualizer, SongRow/List, cards,
│                    MiniPlayer, QueueDrawer, Sidebar, HeroPlayer, toasts, …)
├── pages/           One file per route (Home, Discover, Playlist, Search, …)
├── layouts/         AppLayout — sidebar + header + mini player + bottom nav
├── context/         PlayerContext (global player state) + ToastContext
├── hooks/           useFirstVisitLoading, useMediaQuery
├── services/        audioEngine (playback), playlistService (playlists from
│                    API), storage
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

## Configuring your playlists

**The song catalog is dynamic — it comes from the live YouTube playlists, never
written by hand.** The playlists Pulse tracks are fetched at boot from the Atual API
(`https://apis-atual-dev.vercel.app/api/playlists`), authenticated with the
**API key** — sent as the `X-API-Key` header and the `api_key` query param.
Set it in `.env.local`:

```js
// .env.local
VITE_ATUAL_API_KEY=your-key-here
```

…or paste it at runtime in **Settings → Playlist API** (saved locally, no
rebuild needed).

The endpoint returns a `{ "data": [...] }` wrapper of playlist objects (a bare
array or other wrappers like `{ "playlists": [...] }` are accepted too):

```json
{
  "data": [
    {
      "id": "songs",
      "playlistId": "PLIV4nZCjWE3E",
      "name": "Personal Songs",
      "description": "Your personal collection, beautifully organized."
    }
  ]
}
```

The **`playlistId`** is the real YouTube playlist id; the endpoint URL can be
swapped via `VITE_PLAYLISTS_API_URL`.

- Every entry becomes its own playlist — the sidebar shows a **Your Playlists**
  section and each entry gets a `/playlist/:id` page. Paste any YouTube
  playlist id (from `?list=...`) plus a name.
- Songs across **all** fetched playlists are aggregated into the library
  (home, search, favorites, artists, albums). A video shared by two playlists
  appears once in the library but in both playlists.
- The first entry is the app's main playlist (route `/playlist`).
- The playlist list is fetched at boot (and cached in LocalStorage), so the
  sidebar and playlist routes reflect the latest config. When no API key is
  configured (or the API is unreachable), Pulse falls back to the built-in
  defaults in `src/services/playlistService.js`.

### Where the catalog comes from

The catalog is restored at boot from the last snapshot cached in LocalStorage
(`music-player-catalog-v3`), so the app is instant and works offline. The
cached snapshot is the source of truth; the app does **not** re-sync from
YouTube on every visit. The one exception is a brand-new browser with no
snapshot yet (e.g. a phone opening the LAN URL for the first time) — there the
bundled seed snapshot (`src/data/seedCatalog.js`) is restored so songs appear
immediately, then the catalog is refreshed once from every configured playlist
and cached. Even if YouTube is unreachable from that device, the seeded songs
still show. Regenerate the seed when your playlists change (see the header
comment in `src/data/seedCatalog.js`).

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
  skeleton loaders, toast notifications.

## Notes

- Track thumbnails stream from YouTube's public image CDN (the same images
  YouTube embeds use) with an automatic fallback to a generated gradient.
  Playlist and album artwork is generated locally as SVG — bespoke
  illustrations for known playlists, or a deterministic gradient seeded from
  each name — so no images are ever pulled from the playlist API.
- This is a frontend-only demo: no accounts, no backend. All state is local to
  the browser.
