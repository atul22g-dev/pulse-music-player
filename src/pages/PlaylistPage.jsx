import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Play, Shuffle, Search, RefreshCw, ArrowDownWideNarrow, Clock, ListMusic } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import SongList from "../components/SongList";
import EmptyState from "../components/EmptyState";
import Artwork from "../components/Artwork";
import { SkeletonSongRow } from "../components/Skeleton";
import { getPlaylist, getMainPlaylist } from "../data/playlists";
import { getPlaylistTracks, getPlaylistDuration } from "../utils/library";
import { formatListDuration, pluralize } from "../utils/format";
import { shuffleArray } from "../utils/misc";

const SORTS = [
  { id: "default", label: "Original order" },
  { id: "title", label: "Title (A–Z)" },
  { id: "artist", label: "Artist (A–Z)" },
  { id: "duration", label: "Duration" },
];

export default function PlaylistPage() {
  const { id } = useParams();
  const { playTrack, savedPlaylists, catalog, syncState, syncNow } = usePlayer();

  const main = getMainPlaylist();
  const playlist = id ? getPlaylist(id) || savedPlaylists.find((p) => p.id === id) || null : main;
  const isMain = !id || id === main.id;
  const isYouTubePlaylist = Boolean(playlist?.isYouTube);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("default");

  const baseTracks = useMemo(
    () => (playlist ? getPlaylistTracks(playlist) : []),
    // `playlist` is a stable reference (module constant) — the catalog is the
    // thing that changes, so it must be a dependency or the list goes stale.
    [playlist, catalog]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? baseTracks.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q) ||
            t.album.toLowerCase().includes(q)
        )
      : baseTracks;
    const sorted = [...list];
    if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "artist") sorted.sort((a, b) => a.artist.localeCompare(b.artist));
    else if (sort === "duration") sorted.sort((a, b) => a.duration - b.duration);
    return sorted;
  }, [baseTracks, query, sort]);

  if (!playlist) {
    return (
      <EmptyState
        icon={ListMusic}
        title="Playlist unavailable"
        message="We couldn't find that playlist. It may have been deleted or the link is stale."
        action={{ to: "/playlist", label: "Back to My Playlist" }}
      />
    );
  }

  const thumbs = baseTracks.slice(0, 4);
  const totalDuration = baseTracks.reduce((sum, t) => sum + t.duration, 0);

  const playAll = () => {
    if (!baseTracks.length) return;
    playTrack(baseTracks[0], { queue: baseTracks, index: 0 });
  };
  const shufflePlay = () => {
    if (!baseTracks.length) return;
    const shuffled = shuffleArray(baseTracks);
    playTrack(shuffled[0], { queue: shuffled, index: 0 });
  };

  const sortLabel = SORTS.find((s) => s.id === sort)?.label;

  return (
    <div className="animate-fade-up">
      {/* header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative shrink-0">
          <div className="grid h-40 w-40 grid-cols-2 overflow-hidden rounded-2xl shadow-glow sm:h-48 sm:w-48">
            {thumbs.map((t) => (
              <Artwork key={t.id} src={t.thumbnail} alt="" gradient={t.gradient} className="h-full w-full rounded-none" />
            ))}
          </div>
          <span className="absolute -bottom-2 -right-2 rounded-xl border border-white/10 bg-surface/95 px-2.5 py-1.5 text-[11px] font-semibold text-ink shadow-soft backdrop-blur">
            {pluralize(baseTracks.length, "song")}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Playlist</p>
          <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            {playlist.name}
          </h1>
          <p className="prose-dim mt-2 max-w-xl">{playlist.description}</p>
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-medium text-dim">
            <span>{pluralize(baseTracks.length, "song")}</span>
            <span className="text-faint">·</span>
            <span>{formatListDuration(totalDuration)}</span>
            {isYouTubePlaylist && (
              <>
                <span className="text-faint">·</span>
                <span className="flex items-center gap-1.5">
                  <RefreshCw size={12} className={syncState === "syncing" ? "animate-spin text-accent" : syncState === "offline" ? "text-amber-400" : "text-emerald-400"} />
                  {syncState === "syncing"
                    ? "Syncing with YouTube…"
                    : syncState === "offline"
                      ? "YouTube unreachable — showing local copy"
                      : `Live YouTube playlist · ${catalog.length} tracks`}
                </span>
                <button
                  type="button"
                  onClick={syncNow}
                  disabled={syncState === "syncing"}
                  className="chip !py-1 text-[11px] disabled:pointer-events-none disabled:opacity-50"
                >
                  <RefreshCw size={11} className={syncState === "syncing" ? "animate-spin" : ""} />
                  Sync now
                </button>
              </>
            )}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={playAll} className="btn-primary">
              <Play size={16} fill="currentColor" /> Play all
            </button>
            <button type="button" onClick={shufflePlay} className="btn-ghost">
              <Shuffle size={15} /> Shuffle
            </button>
          </div>
        </div>
      </div>

      {/* controls */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search in ${playlist.name}`}
            aria-label={`Search in ${playlist.name}`}
            className="h-10 w-full rounded-full border border-white/10 bg-white/[0.05] pl-10 pr-4 text-[13px] text-ink placeholder:text-faint outline-none transition-[border-color,box-shadow] focus:border-accent/40 focus:shadow-glow-sm [&::-webkit-search-cancel-button]:hidden"
          />
        </div>

        <div className="relative">
          <ArrowDownWideNarrow size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort songs"
            className="h-10 appearance-none rounded-full border border-white/10 bg-white/[0.05] pl-9 pr-8 text-[13px] font-medium text-ink outline-none transition-colors hover:border-white/20 focus:border-accent/40"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id} className="bg-surface text-ink">
                {s.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-faint">▾</span>
        </div>

        {sort !== "default" && (
          <span className="chip !py-1.5 !text-[11px]">{sortLabel}</span>
        )}
        {query && (
          <button type="button" onClick={() => setQuery("")} className="chip !py-1.5 text-accent hover:text-accent">
            ✕ Clear filter ({filtered.length})
          </button>
        )}
      </div>

      {/* songs */}
      <div className="mt-4">
        {syncState === "syncing" ? (
          <div aria-label="Loading playlist" className="space-y-1 rounded-2xl border border-white/[0.05] p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonSongRow key={i} />
            ))}
          </div>
        ) : filtered.length ? (
          <SongList tracks={filtered} showAlbum showHeader />
        ) : (
          <EmptyState
            icon={Search}
            title={query ? "No matching songs" : "This playlist is empty"}
            message={
              query
                ? `Nothing in ${playlist.name} matches “${query}”. Try a different search.`
                : "Songs added to this playlist will appear here."
            }
            action={query ? { onClick: () => setQuery(""), label: "Clear search" } : { to: "/discover", label: "Explore music" }}
          />
        )}
      </div>

      {/* saved playlists (only on main playlist view) */}
      {isMain && savedPlaylists.length > 0 && (
        <section className="mt-12" aria-label="Your saved playlists">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-ink">Saved from your queue</h2>
            <Link to="/settings" className="text-[13px] font-medium text-dim hover:text-accent">
              Manage
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {savedPlaylists.map((p) => (
              <Link
                key={p.id}
                to={`/playlist/${p.id}`}
                className="group rounded-2xl border border-white/[0.06] bg-surface/50 p-3 transition-colors hover:border-white/15 hover:bg-elevated/60"
              >
                <div className="mb-2 flex h-20 items-center justify-center rounded-xl bg-white/[0.03]">
                  <Clock size={22} className="text-faint transition-colors group-hover:text-accent" />
                </div>
                <p className="truncate text-[13px] font-semibold text-ink">{p.name}</p>
                <p className="text-[11.5px] text-dim">{p.trackIds.length} tracks</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-center text-[11px] text-faint">
        {playlist.isAlbum ? (
          <>Derived from your library — tracks grouped by album</>
        ) : (
          <>
            Source: <span className="font-mono">youtube.com/playlist?list={isYouTubePlaylist ? playlist.id : "PL…"}</span> ·
            playback streams the official YouTube embed for each track
          </>
        )}
      </p>
    </div>
  );
}
