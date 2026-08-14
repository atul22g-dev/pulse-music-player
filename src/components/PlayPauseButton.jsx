import { Play, Pause } from "lucide-react";

const SIZES = {
  xs: "h-10 w-10",
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-14 w-14",
  xl: "h-16 w-16",
};

const ICON = {
  xs: 17,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
};

export default function PlayPauseButton({
  playing = false,
  onToggle,
  size = "md",
  className = "",
  label = null,
  disabled = false,
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={playing ? (label || "Pause") : (label || "Play")}
      className={`group relative inline-flex shrink-0 items-center justify-center rounded-full text-accent-ink shadow-glow-sm transition-[filter,box-shadow,transform] duration-200 hover:brightness-110 hover:shadow-glow active:scale-90 disabled:pointer-events-none disabled:opacity-40 ${SIZES[size]} ${className}`}
      style={{
        background: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-strong)))",
      }}
    >
      <span className="absolute inset-0 rounded-full bg-white/0 transition-colors group-hover:bg-white/10" />
      {playing ? <Pause size={ICON[size]} fill="currentColor" /> : <Play size={ICON[size]} fill="currentColor" className="translate-x-[1px]" />}
    </button>
  );
}
