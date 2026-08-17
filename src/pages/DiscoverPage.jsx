import { useMemo } from "react";
import { Heart, History, Compass, Users, Library } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useFirstVisitLoading } from "../hooks/useUi";
import SectionHeader from "../components/SectionHeader";
import { TrackCard, AlbumCard, ArtistCard } from "../components/CollectionCards";
import SongList from "../components/SongList";
import EmptyState from "../components/EmptyState";
import { shuffleArray } from "../utils/misc";
import { pluralize } from "../utils/format";

export default function DiscoverPage() {
  const { recent, favorites, catalog, artists, albums } = usePlayer();
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

  // Random gems you haven't just heard or hearted — reshuffled only when the
  // catalog changes, so the shelf stays stable within a session.
  const freshPicks = useMemo(() => {
    const seen = new Set();
    for (const r of recent) seen.add(typeof r === "string" ? r : r?.id);
    for (const f of favorites) seen.add(typeof f === "string" ? f : f?.id);
    const pool = catalog.filter((t) => !seen.has(t.id));
    const source = pool.length >= 3 ? pool : catalog;
    return shuffleArray(source).slice(0, 6);
  }, [catalog, recent, favorites]);

  const topArtists = useMemo(
    () => artists.toSorted((a, b) => b.tracks.length - a.tracks.length).slice(0, 8),
    [artists]
  );
  const topAlbums = useMemo(
    () => albums.toSorted((a, b) => b.tracks.length - a.tracks.length).slice(0, 4),
    [albums]
  );

  return (
    <div className="animate-fade-up space-y-12">
      <div className="mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Discover</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Find your <span className="text-gradient">next obsession</span>
        </h1>
        <p className="prose-dim mt-2 max-w-md">
          Fresh picks from your library, plus the artists and albums behind the music.
        </p>
      </div>

      {/* fresh picks */}
      <section aria-label="Fresh picks">
        <SectionHeader title="Fresh picks" subtitle="Random gems, never the same shelf twice" to="/playlist" />
        {freshPicks.length ? (
          <div className="mt-5">
            <SongList tracks={freshPicks} showAlbum={false} />
          </div>
        ) : ready && catalog.length ? (
          <EmptyState
            icon={Compass}
            title="Every gem is spoken for"
            message="You've listened to or hearted it all — play something new and fresh picks will follow."
            action={{ to: "/playlist", label: "Browse your playlist" }}
            className="mt-5 !py-10"
          />
        ) : ready ? null : (
          <div className="mt-5 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-12 w-full rounded-2xl" />
            ))}
          </div>
        )}
      </section>

      {/* recently played */}
      <section aria-label="Recently played">
        <SectionHeader title="Recently played" subtitle="Pick up where you left off" to="/recently-played" />
        {ready && recentTracks.length ? (
          <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2">
            {recentTracks.map((t) => (
              <TrackCard key={t.id} track={t} />
            ))}
          </div>
        ) : ready && catalog.length ? (
          <EmptyState
            icon={History}
            title="Nothing here yet"
            message="Play a few songs and your listening history will build this shelf."
            action={{ to: "/playlist", label: "Start listening" }}
            className="mt-5 !py-10"
          />
        ) : ready ? null : (
          <div className="mt-5 flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[74px] w-44 shrink-0 rounded-2xl sm:w-52" />
            ))}
          </div>
        )}
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
        ) : ready && catalog.length ? (
          <EmptyState
            icon={Heart}
            title="No favorites yet"
            message="Heart a song anywhere in the app and it will show up here."
            action={{ to: "/playlist", label: "Explore your playlist" }}
            className="mt-5 !py-10"
          />
        ) : ready ? null : (
          <div className="mt-5 flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[74px] w-44 shrink-0 rounded-2xl sm:w-52" />
            ))}
          </div>
        )}
      </section>

      {/* explore artists */}
      <section aria-label="Explore artists">
        <SectionHeader title="Explore artists" subtitle="The voices behind your library" to="/artists" />
        {ready && topArtists.length ? (
          <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2">
            {topArtists.map((a) => (
              <div key={a.name} className="w-40 shrink-0 sm:w-44">
                <ArtistCard artist={a} />
              </div>
            ))}
          </div>
        ) : ready && catalog.length ? (
          <EmptyState
            icon={Users}
            title="No artists yet"
            message="Every channel in your playlists becomes an artist page."
            action={{ to: "/playlist", label: "Go to your playlist" }}
            className="mt-5 !py-10"
          />
        ) : ready ? null : (
          <div className="mt-5 flex gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-40 w-40 shrink-0 rounded-2xl sm:w-44" />
            ))}
          </div>
        )}
      </section>

      {/* your albums */}
      <section aria-label="Your albums">
        <SectionHeader title="Your albums" subtitle="Biggest collections first" to="/albums" />
        {ready && topAlbums.length ? (
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {topAlbums.map((album) => (
              <AlbumCard key={album.name} album={album} />
            ))}
          </div>
        ) : ready && catalog.length ? (
          <EmptyState
            icon={Library}
            title="No albums yet"
            message="Each playlist becomes an album — they'll line up here once you have tracks."
            action={{ to: "/albums", label: "Browse albums" }}
            className="mt-5 !py-10"
          />
        ) : ready ? null : (
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="skeleton aspect-square w-full rounded-2xl" />
                <div className="skeleton h-4 w-3/4 rounded-md" />
                <div className="skeleton h-3 w-1/2 rounded-md" />
              </div>
            ))}
          </div>
        )}
      </section>

      {!catalog.length && (
        <EmptyState
          icon={Compass}
          title="Nothing here yet"
          message="Your library is built from your playlists — once you have tracks, every shelf lights up."
        />
      )}
      <p className="flex items-center justify-center gap-2 pb-4 text-[11.5px] text-faint">
        <Compass size={13} />
        {pluralize(catalog.length, "track")} · {pluralize(artists.length, "artist")} ·{" "}
        {pluralize(albums.length, "album")} — more shelves coming as your library grows
      </p>
    </div>
  );
}
