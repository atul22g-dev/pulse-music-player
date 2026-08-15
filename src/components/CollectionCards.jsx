import { Link } from "react-router-dom";
import { Play, Clock } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import { albumPlaylistId } from "../data/playlists";
import Artwork from "./Artwork";
import { getPlaylistArt } from "./artwork/playlistArtRegistry";
import { pluralize, formatTime } from "../utils/format";

function PlayOverlay({ size = 46 }) {
  return (
    <div className="absolute bottom-2 right-2 translate-y-2 opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
      <span
        className="flex items-center justify-center rounded-full text-accent-ink shadow-glow"
        style={{
          width: size,
          height: size,
          background: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-strong)))",
        }}
      >
        <Play size={size * 0.42} fill="currentColor" className="translate-x-[1px]" />
      </span>
    </div>
  );
}

export function AlbumCard({ album }) {
  const { playTrack } = usePlayer();
  const tracks = album.tracks;

  return (
    <Link
      to={`/playlist/${albumPlaylistId(album.name)}`}
      className="group block rounded-2xl p-3 transition-[background-color,box-shadow] duration-300 hover:bg-white/[0.05] hover:shadow-glow"
      aria-label={`Open album ${album.name} by ${album.artist}`}
    >
      <div className="relative mb-3">
        <Artwork
          src={album.artwork || album.thumbnail}
          alt={`${album.name} artwork`}
          gradient={album.gradient}
          className="aspect-square w-full rounded-2xl transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,0.45)" }}
        />
        <button
          type="button"
          aria-label={`Play album ${album.name}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            playTrack(tracks[0], { queue: tracks, index: 0 });
          }}
          className="absolute bottom-3 right-3"
        >
          <PlayOverlay />
        </button>
      </div>
      <h3 className="line-clamp-1 text-[13.5px] font-semibold text-ink">{album.name}</h3>
      <p className="mt-0.5 line-clamp-1 text-[12px] text-dim">
        {album.artist} · {pluralize(tracks.length, "track")}
      </p>
    </Link>
  );
}

export function ArtistCard({ artist }) {
  const { playTrack } = usePlayer();
  const tracks = artist.tracks;

  return (
    <Link
      to={`/artists/${encodeURIComponent(artist.name)}`}
      className="group block rounded-2xl p-3 text-center transition-[background-color,box-shadow] duration-300 hover:bg-white/[0.05] hover:shadow-glow"
      aria-label={`Open artist ${artist.name}`}
    >
      <div className="relative mx-auto mb-3 w-full">
        <div className="overflow-hidden rounded-full">
          <Artwork
            src={artist.thumbnail}
            alt={`${artist.name} portrait`}
            gradient={artist.gradient}
            className="aspect-square w-full rounded-full transition-transform duration-300 group-hover:scale-[1.04]"
          />
        </div>
        <button
          type="button"
          aria-label={`Play ${artist.name}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            playTrack(tracks[0], { queue: tracks, index: 0 });
          }}
          className="absolute bottom-1 right-1"
        >
          <PlayOverlay size={40} />
        </button>
      </div>
      <h3 className="line-clamp-1 text-[13.5px] font-semibold text-ink">{artist.name}</h3>
      <p className="mt-0.5 text-[12px] text-dim">{pluralize(tracks.length, "track")}</p>
    </Link>
  );
}

export function PlaylistCard({ playlist, tracks, to }) {
  const { playTrack } = usePlayer();
  const thumbs = tracks.slice(0, 4);
  const PlaylistArt = getPlaylistArt(playlist.name);

  const play = (e) => {
    e.preventDefault();
    e.stopPropagation();
    playTrack(tracks[0], { queue: tracks, index: 0 });
  };

  return (
    <Link
      to={to || `/playlist/${playlist.id}`}
      className="group block rounded-2xl p-3 transition-[background-color,box-shadow] duration-300 hover:bg-white/[0.05] hover:shadow-glow"
      aria-label={`Open playlist ${playlist.name}`}
    >
      <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-2xl">
        {PlaylistArt ? (
          <PlaylistArt className="h-full w-full" rounded="rounded-none" />
        ) : thumbs.length > 1 ? (
          <div className="grid h-full w-full grid-cols-2 grid-rows-2">
            {thumbs.map((t) => (
              <Artwork key={t.id} src={t.thumbnail} alt="" gradient={t.gradient} className="h-full w-full rounded-none" />
            ))}
          </div>
        ) : (
          <Artwork src={thumbs[0]?.thumbnail} alt="" gradient={thumbs[0]?.gradient || ["#6366f1", "#ec4899"]} className="h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <button type="button" aria-label={`Play playlist ${playlist.name}`} onClick={play} className="absolute bottom-3 right-3">
          <PlayOverlay />
        </button>
        <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
          <Clock size={11} />
          {tracks.length} tracks
        </span>
      </div>
      <h3 className="line-clamp-1 text-[13.5px] font-semibold text-ink">{playlist.name}</h3>
      <p className="mt-0.5 line-clamp-1 text-[12px] text-dim">{playlist.description}</p>
    </Link>
  );
}

/** Horizontal track card used in “recently played” strips. */
export function TrackCard({ track }) {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const active = currentTrack?.id === track.id;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Play ${track.title}`}
      onClick={() => playTrack(track, { queue: [track], index: 0 })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          playTrack(track, { queue: [track], index: 0 });
        }
      }}
      className={`group flex w-44 shrink-0 cursor-pointer items-center gap-3 rounded-2xl border p-2 transition-all duration-300 sm:w-52 ${
        active
          ? "border-accent/30 bg-accent/[0.08] shadow-glow-sm"
          : "border-white/[0.06] bg-surface/60 hover:border-white/15 hover:bg-elevated/60 hover:shadow-soft"
      }`}
    >
      <div className="relative shrink-0">
        <Artwork src={track.thumbnail} alt="" gradient={track.gradient} className="h-12 w-12 rounded-xl" />
        <span
          className={`absolute inset-0 flex items-center justify-center rounded-xl bg-black/45 transition-opacity duration-200 ${active && isPlaying ? "opacity-0" : "opacity-0 group-hover:opacity-100"}`}
        >
          {active && isPlaying ? (
            <span className="flex h-3 items-end gap-[2.5px]">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-[3px] animate-eq-bar rounded-full bg-accent" style={{ height: 9, animationDelay: `${i * 0.14}s` }} />
              ))}
            </span>
          ) : (
            <Play size={17} fill="currentColor" className="text-white" />
          )}
        </span>
      </div>
      <div className="min-w-0">
        <p className={`truncate text-[12.5px] font-semibold ${active ? "text-accent" : "text-ink"}`}>{track.title}</p>
        <p className="truncate text-[11.5px] text-dim">{track.artist}</p>
        <p className="mt-0.5 font-mono text-[10px] tabular-nums text-faint">{formatTime(track.duration)}</p>
      </div>
    </div>
  );
}
