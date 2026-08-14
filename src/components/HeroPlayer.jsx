import { useNavigate } from "react-router-dom";
import { SkipBack, SkipForward, Heart, Share2, ListPlus, Sparkles } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { shareTrack } from "../utils/share";
import Artwork from "./Artwork";
import Visualizer from "./Visualizer";
import PlayPauseButton from "./PlayPauseButton";
import FavoriteButton from "./FavoriteButton";
import ProgressBar from "./ProgressBar";

export default function HeroPlayer() {
  const {
    currentTrack, isPlaying, togglePlay, nextTrack, previousTrack,
    playTrack, addToQueue, catalog,
  } = usePlayer();
  const toast = useToast();
  const navigate = useNavigate();

  // Featured = the current track, or the lead track of the live playlist.
  const featured = currentTrack || catalog[0];
  if (!featured) return null;
  const featuredIndex = catalog.findIndex((t) => t.id === featured.id);
  const isActive = currentTrack?.id === featured.id;

  return (
    <section
      aria-label="Featured player"
      className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10"
    >
      {/* ambient background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="aurora left-[-10%] top-[-30%] h-72 w-72"
          style={{ background: "rgb(var(--accent) / 0.5)", animationDelay: "0s" }}
        />
        <div
          className="aurora bottom-[-40%] right-[-5%] h-80 w-80"
          style={{ background: "rgb(var(--accent-strong) / 0.35)", animationDelay: "2s" }}
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            background:
              "radial-gradient(ellipse at 20% 0%, rgb(var(--accent) / 0.12), transparent 50%), radial-gradient(ellipse at 90% 100%, rgb(var(--accent-strong) / 0.1), transparent 50%)",
          }}
        />
      </div>

      <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
        {/* artwork + visualizer */}
        <div className="flex shrink-0 flex-col items-center gap-5">
          <div className="relative">
            {/* vinyl disc */}
            <div
              className={`vinyl-ring absolute -inset-5 rounded-full border border-white/10 shadow-soft ${isPlaying && isActive ? "animate-spin-slow" : ""}`}
              aria-hidden="true"
            />
            <div
              className={`absolute -inset-5 rounded-full bg-black/20 blur-2xl ${isPlaying && isActive ? "animate-pulse-glow" : ""}`}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => navigate("/now-playing")}
              aria-label="Open now playing"
              className="group relative block transition-transform duration-500 hover:scale-[1.02]"
            >
              <Artwork
                src={featured.thumbnail}
                alt={`${featured.title} album artwork`}
                gradient={featured.gradient}
                className="h-48 w-48 rounded-2xl shadow-glow sm:h-60 sm:w-60 lg:h-64 lg:w-64"
              />
              <span className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
              <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <Sparkles size={22} className="text-white" />
              </span>
            </button>
          </div>
          <Visualizer className="max-w-[240px]" bars={42} height={26} ariaLabel="Featured track visualizer" />
        </div>

        {/* copy + controls */}
        <div className="min-w-0 flex-1 text-center md:text-left">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.2em] text-accent">
            <Sparkles size={11} /> Featured
          </p>

          <h2 className="mt-4 line-clamp-2 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl lg:text-[44px]">
            {featured.title}
          </h2>
          <p className="mt-2 text-[15px] font-medium text-dim">
            {featured.artist}
            <span className="mx-2 text-faint">·</span>
            <span className="text-faint">{featured.album}</span>
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <PlayPauseButton
              size="xl"
              playing={isActive && isPlaying}
              onToggle={() => {
                if (isActive) togglePlay();
                else playTrack(featured, { queue: catalog, index: featuredIndex });
              }}
            />
            <button type="button" aria-label="Previous track" onClick={previousTrack} className="btn-icon h-12 w-12">
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button type="button" aria-label="Next track" onClick={nextTrack} className="btn-icon h-12 w-12">
              <SkipForward size={20} fill="currentColor" />
            </button>

            <span className="mx-1 h-8 w-px bg-white/10" aria-hidden="true" />

            <FavoriteButton trackId={featured.id} size={20} className="h-11 w-11" />
            <button
              type="button"
              aria-label="Share track"
              onClick={() => shareTrack(featured, toast)}
              className="btn-icon h-11 w-11"
            >
              <Share2 size={19} />
            </button>
            <button
              type="button"
              aria-label="Add to queue"
              onClick={() => addToQueue(featured)}
              className="btn-icon h-11 w-11"
            >
              <ListPlus size={19} />
            </button>
          </div>

          <div className="mx-auto mt-8 max-w-xl md:mx-0">
            <ProgressBar />
          </div>
        </div>
      </div>
    </section>
  );
}
