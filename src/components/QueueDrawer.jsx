import { useEffect, useRef, useState } from "react";
import { X, ListMusic, Trash2, Save, GripVertical, Play, Pause, Music } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import Artwork from "./Artwork";
import { formatTime } from "../utils/format";

export default function QueueDrawer() {
  const {
    queue, queueIndex, currentTrack, isPlaying, queueOpen, setQueueOpen,
    togglePlay, nextTrack, removeFromQueue, clearQueue, reorderQueue,
    saveQueueAsPlaylist, playTrack,
  } = usePlayer();

  const [dragIndex, setDragIndex] = useState(null);
  const dialogRef = useRef(null);

  // Keep the native dialog in sync with queueOpen: modal-open when the queue
  // is shown, closed when it's hidden (Escape, backdrop click, or the close
  // button all end up here).
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (queueOpen && !dlg.open) {
      dlg.showModal();
    } else if (!queueOpen && dlg.open) {
      dlg.close();
    }
  }, [queueOpen]);

  const close = () => setQueueOpen(false);

  const upcoming = queue.filter((_, i) => i !== queueIndex);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Queue"
      onCancel={close}
      onClose={close}
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full bg-transparent p-0 [&:not([open])]:hidden"
    >
      {/* click-to-close overlay — lives inside the modal so it stays interactive */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={close} aria-hidden="true" />
      <div className="animate-slide-in-right absolute inset-y-0 right-0 flex w-full max-w-[400px] flex-col border-l border-white/[0.08] bg-surface/95 shadow-soft backdrop-blur-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
            <ListMusic size={18} className="text-accent" />
            Queue
          </h2>
          <div className="flex items-center gap-1">
            <button type="button" onClick={saveQueueAsPlaylist} className="chip !py-1.5">
              <Save size={13} /> Save
            </button>
            <button type="button" onClick={clearQueue} aria-label="Clear queue" className="chip !py-1.5 text-rose-400 hover:text-rose-300">
              <Trash2 size={13} /> Clear
            </button>
            <button type="button" onClick={close} aria-label="Close queue" className="btn-icon h-8 w-8">
              <X size={17} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* now playing */}
          <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.18em] text-faint">Now Playing</p>
          {currentTrack ? (
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-accent/25 bg-accent/[0.07] p-3 shadow-glow-sm">
              <Artwork src={currentTrack.thumbnail} alt="" gradient={currentTrack.gradient} className="h-14 w-14 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-ink">{currentTrack.title}</p>
                <p className="truncate text-[12px] text-dim">{currentTrack.artist}</p>
              </div>
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex h-10 w-10 items-center justify-center rounded-full accent-gradient-bg text-accent-ink shadow-glow-sm active:scale-90"
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="translate-x-[1px]" />}
              </button>
            </div>
          ) : (
            <div className="mb-6 rounded-2xl border border-dashed border-white/10 p-4 text-center">
              <Music size={20} className="mx-auto mb-1.5 text-faint" />
              <p className="text-[12.5px] font-medium text-dim">Nothing playing yet</p>
            </div>
          )}

          {/* next up */}
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-faint">Next Up</p>
            <span className="text-[11px] tabular-nums text-faint">{upcoming.length} tracks</span>
          </div>

          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
              <ListMusic size={22} className="mx-auto mb-2 text-faint" />
              <p className="text-[13px] font-medium text-ink">The queue is clear</p>
              <p className="prose-dim mt-1">Add songs to the queue and they'll appear here.</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {upcoming.map((track, i) => {
                const realIndex = queue.indexOf(track);
                const active = realIndex === queueIndex;
                return (
                  <li
                    key={`${track.id}-${realIndex}`}
                    draggable
                    onDragStart={(e) => {
                      setDragIndex(realIndex);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIndex !== null && dragIndex !== realIndex) reorderQueue(dragIndex, realIndex);
                      setDragIndex(null);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`group flex cursor-grab items-center gap-2.5 rounded-xl px-2 py-2 transition-colors active:cursor-grabbing ${
                      dragIndex === realIndex ? "opacity-40" : "hover:bg-white/[0.05]"
                    }`}
                  >
                    <GripVertical size={14} className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    <button
                      type="button"
                      onClick={() => playTrack(track, { queue, index: realIndex })}
                      className="min-w-0 flex-1 text-left"
                      aria-label={`Play ${track.title}`}
                    >
                      <p className={`truncate text-[13px] font-medium ${active ? "text-accent" : "text-ink"}`}>{track.title}</p>
                      <p className="truncate text-[11.5px] text-dim">{track.artist}</p>
                    </button>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">{formatTime(track.duration)}</span>
                    <button
                      type="button"
                      aria-label={`Remove ${track.title} from queue`}
                      onClick={() => removeFromQueue(realIndex)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-faint opacity-0 transition-[background-color,color,opacity] hover:bg-rose-500/15 hover:text-rose-400 group-hover:opacity-100"
                    >
                      <X size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* footer hint */}
        <div className="border-t border-white/[0.06] px-5 py-3">
          <p className="text-center text-[11px] text-faint">Drag rows to reorder · tap a track to play it</p>
        </div>
      </div>
    </dialog>
  );
}
