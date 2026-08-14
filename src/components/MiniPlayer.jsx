import { useNavigate } from "react-router-dom";
import {
  SkipBack, SkipForward, Shuffle, Repeat, Repeat1, ListMusic, Maximize2,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import Artwork from "./Artwork";
import { ThinProgress } from "./ProgressBar";
import VolumeControl from "./VolumeControl";
import FavoriteButton from "./FavoriteButton";
import PlayPauseButton from "./PlayPauseButton";

export default function MiniPlayer() {
  const {
    currentTrack, isPlaying, togglePlay, nextTrack, previousTrack,
    shuffle, repeat, toggleShuffle, cycleRepeat, setQueueOpen, provider,
  } = usePlayer();
  const navigate = useNavigate();

  if (!currentTrack) return null;

  return (
    <div className="relative border-t border-white/[0.06] bg-base/85 backdrop-blur-2xl">
      <ThinProgress className="absolute -top-[3px] left-0 right-0" />
      <div className="mx-auto flex h-[72px] max-w-[1400px] items-center gap-3 px-3 sm:px-5">
        {/* left: track info */}
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none sm:flex-1 sm:max-w-[320px]">
          <button
            type="button"
            onClick={() => navigate("/now-playing")}
            aria-label="Open full now playing view"
            className="relative shrink-0 transition-transform duration-200 hover:scale-105"
          >
            <Artwork src={currentTrack.thumbnail} alt="" gradient={currentTrack.gradient} className="h-12 w-12 rounded-xl" />
            {isPlaying && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent shadow-glow-sm">
                <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-accent-ink" />
              </span>
            )}
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[13px] font-semibold text-ink">
              <span className="truncate">{currentTrack.title}</span>
              {provider === "youtube" && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                  <span className="h-1 w-1 animate-pulse-glow rounded-full bg-emerald-400" />
                  YouTube
                </span>
              )}
            </p>
            <p className="truncate text-[12px] text-dim">{currentTrack.artist}</p>
          </div>
          <div className="hidden items-center sm:flex">
            <FavoriteButton trackId={currentTrack.id} size={16} className="h-9 w-9" />
          </div>
        </div>

        {/* center: transport (hidden on mobile) */}
        <div className="hidden items-center gap-1 md:flex">
          <button
            type="button"
            aria-label={shuffle ? "Turn shuffle off" : "Turn shuffle on"}
            aria-pressed={shuffle}
            onClick={toggleShuffle}
            className={`btn-icon h-9 w-9 ${shuffle ? "text-accent" : ""}`}
          >
            <Shuffle size={15} />
          </button>
          <button type="button" aria-label="Previous track" onClick={previousTrack} className="btn-icon h-9 w-9">
            <SkipBack size={17} fill="currentColor" />
          </button>
          <PlayPauseButton size="xs" className="mx-1" playing={isPlaying} onToggle={togglePlay} />
          <button type="button" aria-label="Next track" onClick={nextTrack} className="btn-icon h-9 w-9">
            <SkipForward size={17} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label={repeat === "one" ? "Repeat one — click to turn off" : repeat === "all" ? "Repeat all — click for repeat one" : "Repeat off — click to enable"}
            onClick={cycleRepeat}
            className={`btn-icon h-9 w-9 ${repeat !== "off" ? "text-accent" : ""}`}
          >
            {repeat === "one" ? <Repeat1 size={15} /> : <Repeat size={15} />}
          </button>
        </div>

        {/* right: extras */}
        <div className="hidden items-center gap-1 md:flex">
          <VolumeControl />
          <button type="button" aria-label="Open queue" onClick={() => setQueueOpen(true)} className="btn-icon h-9 w-9">
            <ListMusic size={17} />
          </button>
        </div>

        {/* mobile transport */}
        <div className="flex items-center gap-1 md:hidden">
          <FavoriteButton trackId={currentTrack.id} size={15} className="h-9 w-9" showTooltip={false} />
          <PlayPauseButton size="xs" playing={isPlaying} onToggle={togglePlay} />
          <button
            type="button"
            aria-label="Open queue"
            onClick={() => setQueueOpen(true)}
            className="btn-icon h-9 w-9"
          >
            <ListMusic size={17} />
          </button>
          <button
            type="button"
            aria-label="Open now playing"
            onClick={() => navigate("/now-playing")}
            className="btn-icon h-9 w-9"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
