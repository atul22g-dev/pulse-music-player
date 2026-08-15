import { Link } from "react-router-dom";
import { Heart, Flame, ListMusic } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useFirstVisitLoading } from "../hooks/useUi";
import HeroPlayer from "../components/HeroPlayer";
import SectionHeader from "../components/SectionHeader";
import { TrackCard } from "../components/CollectionCards";
import SongList from "../components/SongList";
import EmptyState from "../components/EmptyState";
import { SkeletonBlock } from "../components/Skeleton";

export default function HomePage() {
  const { recent, favorites, catalog, syncState, syncNow } = usePlayer();
  const ready = useFirstVisitLoading("home", 550);

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
  const trending = catalog.toSorted((a, b) => b.duration - a.duration).slice(0, 6);

  return (
    <div className="animate-fade-up space-y-12">
      {/* hero */}
      {!ready ? (
        <div className="space-y-5">
          <SkeletonBlock className="h-8 w-56 rounded-lg" />
          <SkeletonBlock className="h-4 w-80 max-w-full rounded-md" />
          <SkeletonBlock className="h-[420px] w-full rounded-3xl" />
        </div>
      ) : catalog.length ? (
        <>
          <div className="mb-10 text-center lg:text-left">
            <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
              Your Music, <span className="text-gradient">Your Mood.</span>
            </h1>
            <p className="prose-dim mt-3 text-[15px]">Your personal collection, beautifully organized.</p>
          </div>
          <HeroPlayer />
        </>
      ) : syncState === "syncing" ? (
        <SkeletonBlock className="h-[420px] w-full rounded-3xl" />
      ) : (
        <EmptyState
          icon={ListMusic}
          title="Your playlist is empty"
          message="PULSE pulls your songs straight from your YouTube playlist — connect to sync them in."
          action={{ onClick: () => syncNow(), label: "Sync from YouTube", icon: ListMusic }}
        />
      )}

      {/* jump back in */}
      <section aria-label="Jump back in">
        <SectionHeader title="Jump back in" subtitle="Continue where you left off" to="/recently-played" />
        {recentTracks.length ? (
          <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2">
            {recentTracks.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-6 text-center">
            <p className="text-[13px] text-dim">Tracks you play will show up here.</p>
            <Link to="/playlist" className="mt-3 inline-flex text-[13px] font-semibold text-accent hover:underline">
              Browse your playlist →
            </Link>
          </div>
        )}
      </section>

      {/* favorites */}
      <section aria-label="Your favorites">
        <SectionHeader title="Your favorites" subtitle="The ones you keep coming back to" to="/favorites" />
        {favTracks.length ? (
          <div className="mt-5">
            <SongList tracks={favTracks.slice(0, 5)} />
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              icon={Heart}
              title="No favorites yet"
              message="Tap the heart on any song and it will live here, always one click away."
              action={{ to: "/discover", label: "Discover music", icon: Flame }}
            />
          </div>
        )}
      </section>

      {/* trending strip */}
      <section aria-label="Trending in your library">
        <SectionHeader title="Trending in your library" subtitle="Longest journeys, most played energy" to="/playlist" />
        <div className="mt-5">
          <SongList tracks={trending} showAlbum={false} />
        </div>
      </section>

      <p className="flex items-center justify-center gap-2 pb-4 text-[11.5px] text-faint">
        <ListMusic size={13} />
        Built with PULSE · {catalog.length} songs synced from your YouTube playlists
      </p>
    </div>
  );
}
