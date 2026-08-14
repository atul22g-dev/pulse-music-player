import { Heart, History, Compass } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useFirstVisitLoading } from "../hooks/useUi";
import SectionHeader from "../components/SectionHeader";
import { TrackCard, PlaylistCard, AlbumCard } from "../components/CollectionCards";
import SongList from "../components/SongList";
import EmptyState from "../components/EmptyState";
import { SkeletonGrid } from "../components/Skeleton";
import { playlists } from "../data/playlists";
import { getPlaylistTracks } from "../utils/library";

export default function DiscoverPage() {
  const { recent, favorites, catalog, albums, syncState, syncNow } = usePlayer();
  const ready = useFirstVisitLoading("discover", 500);

  const catalogById = new Map(catalog.map((t) => [t.id, t]));
  const recentTracks = [];
  for (const r of recent.slice(0, 10)) {
    const t = catalogById.get(r.id);
    if (t) recentTracks.push(t);
  }
  const favTracks = [];
  for (const id of favorites) {
    const t = catalogById.get(id);
    if (t) favTracks.push(t);
  }
  const trending = catalog.toSorted((a, b) => a.duration - b.duration).slice(0, 6);
  const continueListening = albums.toSorted((a, b) => b.tracks.length - a.tracks.length).slice(0, 2);

  return (
    <div className="animate-fade-up space-y-12">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Discover</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Find your <span className="text-gradient">next obsession</span>
        </h1>
        <p className="prose-dim mt-2 max-w-md">
          A dashboard of everything your library has to offer — fresh picks, moods and momentum.
        </p>
      </div>

      {/* recently played */}
      <section aria-label="Recently played">
        <SectionHeader title="Recently played" to="/recently-played" />
        {ready && recentTracks.length ? (
          <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2">
            {recentTracks.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        ) : ready ? (
          <EmptyState
            icon={History}
            title="Nothing here yet"
            message="Play a few songs and your listening history will build this shelf."
            action={{ to: "/playlist", label: "Start listening" }}
            className="mt-5 !py-10"
          />
        ) : (
          <div className="mt-5 flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[74px] w-44 shrink-0 rounded-2xl sm:w-52" />
            ))}
          </div>
        )}
      </section>

      {/* recommended */}
      <section aria-label="Recommended">
        <SectionHeader title="Recommended for you" subtitle="Mood mixes built from your catalog" />
        {!ready ? (
          <SkeletonGrid count={4} />
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {playlists.map((p) => (
              <PlaylistCard key={p.id} playlist={p} tracks={getPlaylistTracks(p)} />
            ))}
          </div>
        )}
      </section>

      {/* trending */}
      <section aria-label="Trending">
        <SectionHeader title="Trending" subtitle="Shortest bangers, biggest momentum" to="/playlist" />
        <div className="mt-5">
          <SongList tracks={trending} showAlbum={false} />
        </div>
      </section>

      {/* favorites shelf */}
      <section aria-label="Your favorites">
        <SectionHeader title="Your favorites" subtitle="Songs you've hearted" to="/favorites" />
        {ready && favTracks.length ? (
          <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2">
            {favTracks.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        ) : ready ? (
          <EmptyState
            icon={Heart}
            title="No favorites yet"
            message="Heart a song anywhere in the app and it will show up here."
            action={{ to: "/playlist", label: "Explore your playlist" }}
            className="mt-5 !py-10"
          />
        ) : null}
      </section>

      {/* continue listening */}
      <section aria-label="Continue listening">
        <SectionHeader title="Continue listening" subtitle="Pick up where you left off" to="/albums" />
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {continueListening.map((album) => (
            <div key={album.name} className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-surface/60">
              <AlbumCard album={album} />
            </div>
          ))}
        </div>
      </section>

      {!catalog.length && syncState !== "syncing" && (
        <EmptyState
          icon={Compass}
          title="Nothing synced yet"
          message="Your library is built from your YouTube playlist. Sync it once and every shelf lights up."
          action={{ onClick: () => syncNow(), label: "Sync from YouTube", icon: Compass }}
        />
      )}
      <p className="flex items-center justify-center gap-2 pb-4 text-[11.5px] text-faint">
        <Compass size={13} /> More shelves coming as your library grows
      </p>
    </div>
  );
}
