import { useParams, Link } from "react-router-dom";
import { Disc3, ArrowLeft, Play, Shuffle } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { AlbumCard } from "../components/CollectionCards";
import SongList from "../components/SongList";
import Artwork from "../components/Artwork";
import EmptyState from "../components/EmptyState";
import { pluralize, formatListDuration } from "../utils/format";
import { shuffleArray } from "../utils/misc";

export default function AlbumsPage() {
  const { name } = useParams();
  const { albums } = usePlayer();

  if (name) return <AlbumDetail name={name} />;

  return (
    <div className="animate-fade-up">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Your library</p>
      <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Albums</h1>
      <p className="prose-dim mt-2">The records behind your playlist.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {albums.map((a) => (
          <AlbumCard key={a.name} album={a} />
        ))}
      </div>
    </div>
  );
}

function AlbumDetail({ name }) {
  const { playTrack, albums } = usePlayer();
  const album = albums.find((a) => a.name === decodeURIComponent(name));
  if (!album) {
    return (
      <EmptyState
        icon={Disc3}
        title="Album not found"
        message="This album isn't in your library."
        action={{ to: "/albums", label: "Back to albums" }}
      />
    );
  }

  const tracks = album.tracks;
  const playAll = () => playTrack(tracks[0], { queue: tracks, index: 0 });
  const shufflePlay = () => {
    const s = shuffleArray(tracks);
    playTrack(s[0], { queue: s, index: 0 });
  };

  return (
    <div className="animate-fade-up">
      <Link to="/albums" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-dim transition-colors hover:text-accent">
        <ArrowLeft size={15} /> Albums
      </Link>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end">
        <Artwork src={album.thumbnail} alt="" gradient={album.gradient} className="h-40 w-40 rounded-2xl shadow-glow sm:h-48 sm:w-48" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Album</p>
          <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{album.name}</h1>
          <p className="mt-2 text-[13px] font-medium text-dim">
            {album.artist} · {pluralize(tracks.length, "track")} · {formatListDuration(tracks.reduce((s, t) => s + t.duration, 0))}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={playAll} className="btn-primary">
              <Play size={16} fill="currentColor" /> Play all
            </button>
            <button type="button" onClick={shufflePlay} className="btn-ghost">
              <Shuffle size={15} /> Shuffle
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <SongList tracks={tracks} showAlbum showHeader />
      </div>
    </div>
  );
}
