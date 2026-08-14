import { useState } from "react";
import { Play, MoreHorizontal, ListPlus, Heart, Share2, Youtube, X } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import Artwork from "./Artwork";
import FavoriteButton from "./FavoriteButton";
import { formatTime } from "../utils/format";
import { shareTrack } from "../utils/share";
import { useToast } from "../context/ToastContext";

function EqBars() {
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="w-[3px] animate-eq-bar rounded-full bg-accent"
          style={{ height: 10, animationDelay: `${i * 0.13}s` }}
        />
      ))}
    </span>
  );
}

export default function SongRow({ track, index, isCurrent, isPlaying, onPlay, showAlbum = true }) {
  const { addToQueue, toggleFavorite, favorites } = usePlayer();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const fav = favorites.includes(track.id);

  const rowClick = () => {
    setMenuOpen(false);
    onPlay(track, index);
  };

  return (
    <div
      className={`group relative flex w-full items-center gap-3 rounded-xl px-2 py-2 sm:gap-4 sm:px-3 ${
        isCurrent
          ? "bg-accent/[0.08] shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.25)]"
          : "hover:bg-white/[0.05]"
      }`}
    >
      {/* play region */}
      <button
        type="button"
        aria-label={`Play ${track.title} by ${track.artist}`}
        onClick={rowClick}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left sm:gap-4"
      >
        {/* number / play */}
        <span className="flex w-7 shrink-0 items-center justify-center text-center">
          {isCurrent && isPlaying ? (
            <EqBars />
          ) : (
            <>
              <span className="font-mono text-[12px] tabular-nums text-faint transition-opacity duration-150 group-hover:opacity-0">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Play
                size={15}
                fill="currentColor"
                className="absolute hidden text-ink transition-transform duration-150 group-hover:block group-hover:scale-110"
              />
            </>
          )}
        </span>

        {/* artwork */}
        <span className="relative shrink-0">
          <Artwork
            src={track.thumbnail}
            alt={`${track.title} artwork`}
            gradient={track.gradient}
            className="h-11 w-11 rounded-lg"
          />
          <span className="pointer-events-none absolute inset-0 hidden items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Play size={18} fill="currentColor" className="text-white" />
          </span>
        </span>

        {/* title / artist */}
        <span className="min-w-0 flex-1">
          <p className={`truncate text-[13.5px] font-semibold ${isCurrent ? "text-accent" : "text-ink"}`}>
            {track.title}
          </p>
          <p className="truncate text-[12px] text-dim">{track.artist}</p>
        </span>
      </button>

      {/* album */}
      {showAlbum && (
        <p className="hidden w-40 shrink-0 truncate text-[12.5px] text-dim md:block">{track.album}</p>
      )}

      {/* duration */}
      <span className="hidden shrink-0 font-mono text-[12px] tabular-nums text-faint sm:block">
        {formatTime(track.duration)}
      </span>

      {/* favorite */}
      <div className="flex shrink-0 items-center justify-end gap-1">
        <FavoriteButton trackId={track.id} size={16} className="h-8 w-8" showTooltip={false} />

        {/* more options */}
        <div className="relative">
          <button
            type="button"
            aria-label={`More options for ${track.title}`}
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((o) => !o);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-faint transition-[background-color,color,transform] duration-200 hover:bg-white/10 hover:text-ink active:scale-90"
          >
            <MoreHorizontal size={17} />
          </button>

          {menuOpen && (
            <>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
                className="fixed inset-0 z-40 cursor-default"
              />
              <div
                role="menu"
                className="absolute right-0 top-9 z-50 w-52 animate-scale-in overflow-hidden rounded-xl border border-white/10 bg-elevated/95 p-1.5 shadow-soft backdrop-blur-xl"
              >
                <MenuItem icon={ListPlus} label="Play next" onClick={() => { addToQueue(track, { playNext: true }); setMenuOpen(false); }} />
                <MenuItem icon={ListPlus} label="Add to queue" onClick={() => { addToQueue(track); setMenuOpen(false); }} />
                <MenuItem icon={Heart} label={fav ? "Remove from favorites" : "Add to favorites"} onClick={() => { toggleFavorite(track.id); setMenuOpen(false); }} />
                <MenuItem icon={Share2} label="Share" onClick={() => { shareTrack(track, toast); setMenuOpen(false); }} />
                <MenuItem icon={Youtube} label="Open on YouTube" onClick={() => { window.open(`https://www.youtube.com/watch?v=${track.youtubeId}`, "_blank", "noopener"); setMenuOpen(false); }} />
              </div>
            </>
          )}
        </div>
      </div>

      {isCurrent && (
        <span className="pointer-events-none absolute inset-y-1 left-0 w-[3px] rounded-r-full bg-accent shadow-glow-sm" aria-hidden="true" />
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] font-medium text-dim transition-colors hover:bg-white/10 hover:text-ink"
    >
      <Icon size={15} className="shrink-0" />
      {label}
    </button>
  );
}
