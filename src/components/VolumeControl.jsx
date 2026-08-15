import { useState } from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";

function VolumeIcon({ volume }) {
  if (volume === 0) return <VolumeX size={18} />;
  if (volume < 0.5) return <Volume1 size={18} />;
  return <Volume2 size={18} />;
}

export default function VolumeControl({ className = "" }) {
  const { volume, setVolume } = usePlayer();
  const [open, setOpen] = useState(false);
  const pct = volume * 100;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label={volume === 0 ? "Unmute" : "Mute"}
        aria-expanded={open}
        onClick={() => {
          if (volume > 0) setVolume(0);
          else setVolume(0.8);
        }}
        onMouseEnter={() => setOpen(true)}
        className="btn-icon"
      >
        <VolumeIcon volume={volume} />
      </button>
      <div
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`absolute bottom-full left-1/2 z-40 mb-3 -translate-x-1/2 rounded-2xl border border-white/10 bg-surface/95 px-3 py-3 shadow-soft backdrop-blur-xl transition-all duration-200 ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-1 opacity-0"
        }`}
      >
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          aria-label="Volume"
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          className="range-input range-input-vertical [writing-mode:vertical-lr] rotate-180"
          style={{ "--fill": `${pct}%` }}
        />
      </div>
    </div>
  );
}
