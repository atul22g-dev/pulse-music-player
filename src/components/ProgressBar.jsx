import { usePlayer } from "../context/PlayerContext";
import { formatTime } from "../utils/format";
import { clamp } from "../utils/misc";

/** Full seekable progress bar with time labels. */
export default function ProgressBar({ className = "", showTimes = true }) {
  const { position, duration, seekTo } = usePlayer();
  const pct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div className={`flex w-full items-center gap-3 ${className}`}>
      <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-faint">
        {formatTime(position)}
      </span>
      <input
        type="range"
        min={0}
        max={Math.max(duration, 1)}
        step={0.5}
        value={clamp(position, 0, duration)}
        aria-label="Seek"
        onChange={(e) => seekTo(Number(e.target.value))}
        className="range-input"
        style={{ "--fill": `${pct}%` }}
      />
      {showTimes && (
        <span className="w-10 shrink-0 font-mono text-[11px] tabular-nums text-faint">
          {formatTime(duration)}
        </span>
      )}
    </div>
  );
}

/** Thin clickable progress line — used on mini player and artwork overlays. */
export function ThinProgress({ className = "", barClassName = "" }) {
  const { position, duration, seekTo } = usePlayer();
  const pct = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <button
      type="button"
      aria-label="Seek"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientX - rect.left) / rect.width;
        seekTo(ratio * duration);
      }}
      className={`group relative block h-1 w-full cursor-pointer rounded-full bg-white/10 ${className}`}
    >
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-200 ease-linear group-hover:shadow-glow-sm"
        style={{ width: `${pct}%` }}
      />
    </button>
  );
}
