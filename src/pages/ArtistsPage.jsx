import { useParams, Link } from "react-router-dom";
import { Users, ArrowLeft, Play, Shuffle, Music2 } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { ArtistCard } from "../components/CollectionCards";
import SongList from "../components/SongList";
import Artwork from "../components/Artwork";
import EmptyState from "../components/EmptyState";
import { pluralize } from "../utils/format";
import { shuffleArray } from "../utils/misc";

export default function ArtistsPage() {
  const { name } = useParams();
  const { artists } = usePlayer();

  if (name) return <ArtistDetail name={name} artists={artists} />;

  return (
    <div className="animate-fade-up">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Your library</p>
      <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Artists</h1>
      <p className="prose-dim mt-2">Everyone in your Personal Songs.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {artists.map((a) => (
          <ArtistCard key={a.name} artist={a} />
        ))}
      </div>
    </div>
  );
}

function ArtistDetail({ name, artists }) {
  const { playTrack } = usePlayer();
  const artist = artists.find((a) => a.name === decodeURIComponent(name));
  if (!artist) {
    return (
      <EmptyState
        icon={Users}
        title="Artist not found"
        message="This artist isn't in your library."
        action={{ to: "/artists", label: "Back to artists" }}
      />
    );
  }

  const tracks = artist.tracks;
  const playAll = () => playTrack(tracks[0], { queue: tracks, index: 0 });
  const shufflePlay = () => {
    const s = shuffleArray(tracks);
    playTrack(s[0], { queue: s, index: 0 });
  };

  return (
    <div className="animate-fade-up">
      <Link to="/artists" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-dim transition-colors hover:text-accent">
        <ArrowLeft size={15} /> Artists
      </Link>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="relative shrink-0">
          <div className="overflow-hidden rounded-full border-4 border-white/10">
            <Artwork src={artist.thumbnail} alt="" gradient={artist.gradient} className="h-40 w-40 sm:h-48 sm:w-48" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full accent-gradient-bg text-accent-ink shadow-glow">
            <Music2 size={18} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Artist</p>
          <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{artist.name}</h1>
          <p className="mt-2 text-[13px] font-medium text-dim">{pluralize(tracks.length, "track")} in your library</p>
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
        <h2 className="mb-3 font-display text-lg font-bold text-ink">Popular songs</h2>
        <SongList tracks={tracks} showAlbum showHeader />
      </div>
    </div>
  );
}
