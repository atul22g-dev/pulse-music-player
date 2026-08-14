import { Heart } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

export default function FavoriteButton({ trackId, size = 17, className = "", showTooltip = true }) {
  const { favorites, toggleFavorite } = usePlayer();
  if (!trackId) return null;
  const active = favorites.includes(trackId);

  return (
    <button
      type="button"
      aria-label={active ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={active}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(trackId);
      }}
      className={`group/btn relative flex shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-90 ${className || "h-9 w-9 hover:bg-white/10"}`}
    >
      <Heart
        size={size}
        strokeWidth={2}
        className={`transition-all duration-300 ${
          active
            ? "scale-110 fill-[rgb(var(--accent))] stroke-[rgb(var(--accent))] drop-shadow-[0_0_6px_rgb(var(--accent-glow))]"
            : "text-dim group-hover/btn:text-ink"
        }`}
      />
      {showTooltip && (
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-surface px-2.5 py-1 text-[11px] font-medium text-ink opacity-0 shadow-soft transition-opacity duration-150 group-hover/btn:opacity-100">
          {active ? "Remove from favorites" : "Add to favorites"}
        </span>
      )}
    </button>
  );
}
