import { memo } from "react";
import { usePlayer } from "../context/PlayerContext";
import SongRow from "./SongRow";

const SongList = memo(function SongList({
  tracks,
  showAlbum = true,
  showHeader = false,
  className = "",
  empty,
}) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();

  if (!tracks.length) {
    return empty || null;
  }

  const onPlay = (track, index) => {
    playTrack(track, { queue: tracks, index });
  };

  return (
    <div className={className}>
      {showHeader && (
        <div className="mb-2 flex items-center gap-4 border-b border-white/[0.06] px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-faint">
          <span className="w-7 text-center">#</span>
          <span className="flex-1">Title</span>
          {showAlbum && <span className="hidden w-40 md:block">Album</span>}
          <span className="hidden w-16 text-right sm:block">Duration</span>
          <span className="w-16" />
        </div>
      )}
      <div className="space-y-0.5">
        {tracks.map((track, index) => (
          <SongRow
            key={track.id}
            track={track}
            index={index}
            isCurrent={currentTrack?.id === track.id}
            isPlaying={isPlaying && currentTrack?.id === track.id}
            onPlay={onPlay}
            showAlbum={showAlbum}
          />
        ))}
      </div>
    </div>
  );
});

export default SongList;
