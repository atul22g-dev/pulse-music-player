import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Sparkles, CornerDownLeft } from "lucide-react";
import SearchBar from "../components/SearchBar";
import SongList from "../components/SongList";
import EmptyState from "../components/EmptyState";
import { AlbumCard, ArtistCard, PlaylistCard, TrackCard } from "../components/CollectionCards";
import SectionHeader from "../components/SectionHeader";
import { usePlayer } from "../context/PlayerContext";
import { getYoutubePlaylists } from "../data/playlists";
import { getPlaylistTracks } from "../utils/library";

function normalize(s) {
  return s.toLowerCase().trim();
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const initial = params.get("q") || "";
  const [query, setQuery] = useState(initial);
  const { recent, playTrack, catalog, artists, albums } = usePlayer();
  const youtubePlaylists = getYoutubePlaylists();

  const q = query.trim().toLowerCase();
  const recentTracks = recent.slice(0, 6).map((r) => catalog.find((t) => t.id === r.id)).filter(Boolean);

  const results = useMemo(() => {
    if (!q) return null;
    const match = (hay = "") => hay.toLowerCase().includes(q);
    return {
      songs: catalog.filter((t) => match(t.title) || match(t.artist) || match(t.album)),
      artists: artists.filter((a) => match(a.name) || a.tracks.some((t) => match(t.title))),
      albums: albums.filter((a) => match(a.name) || match(a.artist)),
      playlists: youtubePlaylists.filter((p) => match(p.name) || match(p.description)),
    };
  }, [q, catalog, artists, albums, youtubePlaylists]);

  const total = results ? results.songs.length + results.artists.length + results.albums.length + results.playlists.length : 0;

  return (
    <div className="animate-fade-up">
      <div className="mx-auto max-w-2xl">
        <SearchBar autoFocus className="w-full" />
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11.5px] text-faint">
          <Sparkles size={12} />
          Try “chaand”, “banjaare” or “haryanvi” — press Enter to jump to results
        </p>
      </div>

      {!q ? (
        <div className="mt-10">
          <SectionHeader title="Suggestions" subtitle="Jump back into what you've been playing" />
          {recentTracks.length ? (
            <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4 pb-2">
              {recentTracks.map((t) => (
                <TrackCard key={t.id} track={t} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Search}
              title="Search your library"
              message="Songs, artists, albums and playlists — all searchable from one place."
              className="mt-5"
            />
          )}
        </div>
      ) : total === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Search}
            title={`No results for “${query}”`}
            message="Check the spelling, or try searching for a different song, artist or album."
            action={{ onClick: () => setQuery(""), label: "Clear search" }}
          />
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {results.songs.length > 0 && (
            <section aria-label="Songs">
              <div className="mb-4 flex items-center gap-3">
                <h2 className="font-display text-xl font-bold text-ink">Songs</h2>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold text-dim">{results.songs.length}</span>
                {results.songs[0] && (
                  <button
                    type="button"
                    onClick={() => playTrack(results.songs[0], { queue: results.songs, index: 0 })}
                    className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-accent hover:underline"
                  >
                    Play top result <CornerDownLeft size={12} />
                  </button>
                )}
              </div>
              <SongList tracks={results.songs} showAlbum />
            </section>
          )}

          {results.artists.length > 0 && (
            <section aria-label="Artists">
              <h2 className="mb-4 font-display text-xl font-bold text-ink">Artists</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {results.artists.map((a) => (
                  <ArtistCard key={a.name} artist={a} />
                ))}
              </div>
            </section>
          )}

          {results.albums.length > 0 && (
            <section aria-label="Albums">
              <h2 className="mb-4 font-display text-xl font-bold text-ink">Albums</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                {results.albums.map((a) => (
                  <AlbumCard key={a.name} album={a} />
                ))}
              </div>
            </section>
          )}

          {results.playlists.length > 0 && (
            <section aria-label="Playlists">
              <h2 className="mb-4 font-display text-xl font-bold text-ink">Playlists</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {results.playlists.map((p) => (
                  <PlaylistCard key={p.id} playlist={p} tracks={getPlaylistTracks(p)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
