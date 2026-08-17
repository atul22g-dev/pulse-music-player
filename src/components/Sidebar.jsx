import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Home, Compass, ListMusic, Heart, History, Users, Disc3,
  Settings, X, Play, Pause,
} from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import Artwork from "./Artwork";
import FavoriteButton from "./FavoriteButton";
import { getAlbumPlaylists } from "../data/playlists";
import { getPlaylistTracks } from "../utils/library";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/playlist", label: "My Playlist", icon: ListMusic },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/recently-played", label: "Recently Played", icon: History },
  { to: "/artists", label: "Artists", icon: Users },
  { to: "/albums", label: "Albums", icon: Disc3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const { currentTrack, isPlaying, togglePlay } = usePlayer();
  const navigate = useNavigate();
  const albumPlaylists = getAlbumPlaylists();

  const playlistLink = (p, keyPrefix = "") => {
    const tracks = getPlaylistTracks(p);
    const artSrc = p.artwork || tracks[0]?.thumbnail;
    return (
      <Link key={`${keyPrefix}${p.id}`} to={`/playlist/${p.id}`} onClick={onClose} className="nav-link !py-2">
        <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md">
          {artSrc ? (
            <Artwork src={artSrc} alt="" gradient={tracks[0]?.gradient} className="h-full w-full rounded-none" />
          ) : (
            <ListMusic size={14} className="absolute inset-0 m-auto text-faint" />
          )}
        </span>
        <span className="truncate">{p.name}</span>
      </Link>
    );
  };

  return (
    <>
      {/* mobile/tablet overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col border-r border-white/[0.06] bg-base/95 backdrop-blur-2xl transition-transform duration-300 ease-smooth lg:translate-x-0 lg:bg-transparent ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Main navigation"
      >
        {/* logo */}
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <Link to="/" onClick={onClose} className="group flex items-center gap-2.5">
            <span className="p-[3px] relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl shadow-glow-sm transition-transform duration-200 group-hover:scale-105">
              <img src="/icon.png" alt="Pulse logo" className="h-full w-full object-cover" />
            </span>
            <span className="font-display text-[17px] font-extrabold tracking-[0.22em] text-ink">
              Pulse
            </span>
          </Link>
          <button type="button" onClick={onClose} aria-label="Close menu" className="btn-icon h-8 w-8 lg:hidden">
            <X size={17} />
          </button>
        </div>

        {/* nav */}
        <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Sections">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={18} strokeWidth={2} className="shrink-0" />
              {label}
            </NavLink>
          ))}

          {albumPlaylists.length > 0 && (
            <>
              <p className="mt-6 px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-faint">
                Albums
              </p>
              {albumPlaylists.map((p) => playlistLink(p, "album-"))}
            </>
          )}
        </nav>

        {/* now playing mini */}
        <div className="border-t border-white/[0.06] p-3">
          {currentTrack ? (
            <div className="group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-surface/70 p-2.5">
              <button
                type="button"
                onClick={() => navigate("/now-playing")}
                className="relative shrink-0"
                aria-label="Open now playing"
              >
                <Artwork src={currentTrack.thumbnail} alt="" gradient={currentTrack.gradient} className="h-11 w-11 rounded-xl" />
                {isPlaying && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent shadow-glow-sm">
                    <span className="h-1.5 w-1.5 animate-Pulse-glow rounded-full bg-accent-ink" />
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1 text-left">
                <button
                  type="button"
                  onClick={() => navigate("/now-playing")}
                  className="block w-full truncate text-left text-[12.5px] font-semibold text-ink hover:text-accent"
                >
                  {currentTrack.title}
                </button>
                <p className="truncate text-[11.5px] text-dim">{currentTrack.artist}</p>
              </div>
              <FavoriteButton trackId={currentTrack.id} size={15} className="h-8 w-8" showTooltip={false} />
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex h-8 w-8 items-center justify-center rounded-full accent-gradient-bg text-accent-ink shadow-glow-sm transition-transform active:scale-90"
              >
                {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="translate-x-[1px]" />}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-white/10 p-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] text-faint">
                <Play size={16} />
              </div>
              <div>
                <p className="text-[12px] font-medium text-dim">Nothing playing</p>
                <p className="text-[11px] text-faint">Pick a song to start</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
