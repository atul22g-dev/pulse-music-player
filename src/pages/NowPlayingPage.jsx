import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, ListMusic, Share2, Heart, Play, Pause,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import Artwork from "./../components/Artwork";
import Visualizer from "../components/Visualizer";
import ProgressBar from "../components/ProgressBar";
import VolumeControl from "../components/VolumeControl";
import FavoriteButton from "../components/FavoriteButton";
import EmptyState from "../components/EmptyState";
import { shareTrack } from "../utils/share";

export default function NowPlayingPage() {
  const {
    currentTrack, isPlaying, togglePlay, nextTrack, previousTrack,
    shuffle, repeat, toggleShuffle, cycleRepeat, setQueueOpen, provider,
  } = usePlayer();
  const navigate = useNavigate();
  const toast = useToast();

  if (!currentTrack) {
    return (
      <EmptyState
        icon={Play}
        title="Nothing is playing"
        message="Head to your playlist and pick a song to fill this screen with music."
        action={{ to: "/playlist", label: "Go to playlist" }}
      />
    );
  }

  return (
    <div className="animate-fade-in relative flex min-h-[calc(100vh-220px)] flex-col overflow-hidden">
      {/* ambient background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-25%] h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[110px]"
          style={{ background: "rgb(var(--accent) / 0.22)" }} />
        <div className="absolute bottom-[-30%] left-[5%] h-[320px] w-[320px] rounded-full blur-[110px]"
          style={{ background: "rgb(var(--accent-strong) / 0.14)" }} />
      </div>

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 pt-2">
        {/* top bar */}
        <div className="flex w-full items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} aria-label="Go back" className="btn-icon">
            <ArrowLeft size={19} />
          </button>
          <div className="text-center">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-faint">Now Playing</p>
            <Link to="/playlist" className="text-[12px] font-medium text-accent hover:underline">
              {currentTrack.album}
            </Link>
          </div>
          <button type="button" aria-label="Open queue" onClick={() => setQueueOpen(true)} className="btn-icon">
            <ListMusic size={19} />
          </button>
        </div>

        {/* artwork */}
        <div className="relative mt-6">
          <div className={`vinyl-ring absolute -inset-6 rounded-full border border-white/10 ${isPlaying ? "animate-spin-slow" : ""}`} aria-hidden="true" />
          <Artwork
            src={currentTrack.thumbnail}
            alt={`${currentTrack.title} artwork`}
            gradient={currentTrack.gradient}
            className={`h-56 w-56 rounded-3xl shadow-glow transition-transform duration-700 sm:h-72 sm:w-72 ${isPlaying ? "scale-100" : "scale-[0.985]"}`}
          />
        </div>

        {/* title */}
        <div className="mt-8 w-full text-center">
          <h1 className="line-clamp-2 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            {currentTrack.title}
          </h1>
          <p className="mt-1.5 text-[14px] font-medium text-dim">{currentTrack.artist}</p>
        </div>

        {/* visualizer */}
        <Visualizer className="mt-5 max-w-sm" bars={56} height={34} ariaLabel="Now playing visualizer" />

        {/* progress */}
        <div className="mt-4 w-full">
          <ProgressBar />
        </div>

        {/* transport */}
        <div className="mt-4 flex w-full items-center justify-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label={shuffle ? "Turn shuffle off" : "Turn shuffle on"}
            aria-pressed={shuffle}
            onClick={toggleShuffle}
            className={`btn-icon h-11 w-11 ${shuffle ? "text-accent" : ""}`}
          >
            <Shuffle size={17} />
          </button>
          <button type="button" aria-label="Previous track" onClick={previousTrack} className="btn-icon h-12 w-12">
            <SkipBack size={21} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlay}
            className="mx-1 flex h-[74px] w-[74px] items-center justify-center rounded-full text-accent-ink shadow-glow transition-[filter,box-shadow,transform] duration-200 hover:brightness-110 hover:shadow-glow active:scale-90"
            style={{ background: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-strong)))" }}
          >
            {isPlaying ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="translate-x-[2px]" />}
          </button>
          <button type="button" aria-label="Next track" onClick={nextTrack} className="btn-icon h-12 w-12">
            <SkipForward size={21} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label="Repeat mode"
            onClick={cycleRepeat}
            className={`btn-icon h-11 w-11 ${repeat !== "off" ? "text-accent" : ""}`}
          >
            {repeat === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        {/* secondary row */}
        <div className="mt-5 flex w-full items-center justify-center gap-2 pb-8">
          <FavoriteButton trackId={currentTrack.id} size={19} className="h-10 w-10" />
          <VolumeControl />
          <button type="button" aria-label="Share track" onClick={() => shareTrack(currentTrack, toast)} className="btn-icon h-10 w-10">
            <Share2 size={17} />
          </button>
        </div>
      </div>
    </div>
  );
}
