import { useState } from "react";
import { Heart, Compass, Trash2 } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import SongList from "../components/SongList";
import EmptyState from "../components/EmptyState";
import { AlbumCard, ArtistCard } from "../components/CollectionCards";

const TABS = [
  { id: "songs", label: "Songs" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
];

export default function FavoritesPage() {
  const { favorites, clearFavorites, artists, albums, catalog } = usePlayer();
  const [tab, setTab] = useState("songs");

  const catalogById = new Map(catalog.map((t) => [t.id, t]));
  const favTracks = [];
  for (const id of favorites) {
    const t = catalogById.get(id);
    if (t) favTracks.push(t);
  }
  const favSet = new Set(favorites);
  const favArtists = artists.filter((a) => a.tracks.some((t) => favSet.has(t.id)));
  const favAlbums = albums.filter((a) => a.tracks.some((t) => favSet.has(t.id)));

  const total = favorites.length;

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Your library</p>
          <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Favorites
          </h1>
          <p className="prose-dim mt-2">
            {total ? `${total} hearted ${total === 1 ? "track" : "tracks"} across your library` : "Every song you heart, all in one place."}
          </p>
        </div>
        {total > 0 && (
          <button type="button" onClick={clearFavorites} className="chip text-rose-400 hover:text-rose-300">
            <Trash2 size={13} /> Clear favorites
          </button>
        )}
      </div>

      {/* tabs */}
      <div role="tablist" aria-label="Favorite categories" className="mt-6 flex gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] p-1 sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-full px-5 py-2 text-[13px] font-semibold transition-all duration-200 sm:flex-none ${
              tab === t.id ? "bg-white/10 text-ink shadow-soft" : "text-dim hover:text-ink"
            }`}
          >
            {t.label}
            {t.id === "songs" && total > 0 && <span className="ml-1.5 text-[11px] text-faint">{total}</span>}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "songs" && (
          favTracks.length ? (
            <SongList tracks={favTracks} showAlbum showHeader />
          ) : (
            <EmptyState
              icon={Heart}
              title="No favorites yet"
              message="Tap the heart next to any song to add it here. Favorites sync automatically to this device."
              action={{ to: "/discover", label: "Discover music", icon: Compass }}
            />
          )
        )}

        {tab === "artists" && (
          favArtists.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {favArtists.map((a) => (
                <ArtistCard key={a.name} artist={a} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Heart} title="No favorite artists yet" message="Favorite a song and its artist will appear here." />
          )
        )}

        {tab === "albums" && (
          favAlbums.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {favAlbums.map((a) => (
                <AlbumCard key={a.name} album={a} />
              ))}
            </div>
          ) : (
            <EmptyState icon={Heart} title="No favorite albums yet" message="Favorite a song and its album will appear here." />
          )
        )}
      </div>
    </div>
  );
}
