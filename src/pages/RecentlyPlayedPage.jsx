import { History, Trash2, Play, RotateCcw } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import EmptyState from "../components/EmptyState";
import Artwork from "../components/Artwork";
import { formatTime, relativeTime, pluralize } from "../utils/format";

export default function RecentlyPlayedPage() {
  const { recent, playTrack, clearRecentlyPlayed, removeRecent, catalog } = usePlayer();

  const catalogById = new Map(catalog.map((t) => [t.id, t]));
  const items = [];
  for (const r of recent) {
    const track = catalogById.get(r.id);
    if (track) items.push({ ...r, track });
  }

  const continueTrack = items[0]?.track;

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Listening history</p>
          <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Recently Played
          </h1>
          <p className="prose-dim mt-2">
            {items.length
              ? `Your last ${pluralize(items.length, "track")} — pick up right where you left off.`
              : "Your listening history lives here."}
          </p>
        </div>
        {items.length > 0 && (
          <button type="button" onClick={clearRecentlyPlayed} className="chip text-rose-400 hover:text-rose-300">
            <Trash2 size={13} /> Clear history
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={History}
            title="Your history is empty"
            message="Play any song and it will appear here with the exact time you listened — perfect for continuing later."
            action={{ to: "/playlist", label: "Play something", icon: Play }}
          />
        </div>
      ) : (
        <>
          {/* continue listening hero */}
          <div className="group relative mt-8 overflow-hidden rounded-3xl border border-white/[0.07] bg-surface/60">
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(120deg, rgb(var(--accent) / 0.22), transparent 55%)",
              }}
            />
            <div className="relative flex items-center gap-5 p-5 sm:p-6">
              <button
                type="button"
                aria-label={`Continue playing ${continueTrack.title}`}
                onClick={() => playTrack(continueTrack, { queue: items.map((i) => i.track), index: 0 })}
                className="shrink-0 transition-transform duration-300 group-hover:scale-[1.03]"
              >
                <Artwork src={continueTrack.thumbnail} alt="" gradient={continueTrack.gradient} className="h-24 w-24 rounded-2xl shadow-glow sm:h-28 sm:w-28" />
              </button>
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-accent">Continue listening</p>
                <h2 className="mt-1 truncate font-display text-xl font-bold text-ink sm:text-2xl">{continueTrack.title}</h2>
                <p className="truncate text-[13px] text-dim">{continueTrack.artist}</p>
                <p className="mt-2 text-[11.5px] text-faint">{relativeTime(items[0].playedAt)}</p>
                <button type="button" onClick={() => playTrack(continueTrack, { queue: items.map((i) => i.track), index: 0 })} className="btn-primary mt-4 !px-4 !py-2">
                  <Play size={15} fill="currentColor" /> Resume
                </button>
              </div>
            </div>
          </div>

          {/* full history */}
          <ul className="mt-8 space-y-1">
            {items.map(({ track, playedAt }, i) => {
              const play = () => playTrack(track, { queue: items.map((x) => x.track), index: i });
              return (
                <li
                  key={`${track.id}-${playedAt}`}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.05] sm:gap-4 sm:px-3"
                >
                  <button
                    type="button"
                    aria-label={`Play ${track.title} again`}
                    onClick={play}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left sm:gap-4"
                  >
                    <span className="w-6 shrink-0 text-center font-mono text-[11px] tabular-nums text-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="relative shrink-0">
                      <Artwork src={track.thumbnail} alt="" gradient={track.gradient} className="h-11 w-11 rounded-lg" />
                      <span className="absolute inset-0 hidden items-center justify-center rounded-lg bg-black/40 group-hover:flex">
                        <Play size={15} fill="currentColor" className="text-white" />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink">{track.title}</p>
                      <p className="truncate text-[12px] text-dim">{track.artist}</p>
                    </span>
                  </button>
                  <span className="hidden w-16 shrink-0 text-right font-mono text-[12px] tabular-nums text-faint sm:block">
                    {formatTime(track.duration)}
                  </span>
                  <span className="w-16 shrink-0 text-right text-[11px] text-faint sm:w-20">{relativeTime(playedAt)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${track.title} from history`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRecent(track.id);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-faint opacity-0 transition-[background-color,color,opacity] hover:bg-rose-500/15 hover:text-rose-400 group-hover:opacity-100"
                  >
                    <RotateCcw size={13} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
