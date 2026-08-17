import { useEffect, useRef } from "react";
import { engine } from "../services/audioEngine";
import {
  updateMediaSession,
  clearMediaSession,
  registerMediaSessionActions,
} from "../services/mediaSession";

/**
 * useMediaSession — bridges the player to the OS's lock-screen / hardware
 * media controls (Media Session API).
 *
 * - Registers play / pause / next / previous / seek handlers once; the
 *   handlers always read the latest callbacks from a ref, so they never
 *   capture stale player state.
 * - Republishes metadata + playback state whenever the now-playing picture
 *   changes (throttled internally by the service).
 *
 * Pass the player's real callbacks (togglePlay / nextTrack / previousTrack /
 * seekTo) and the current track + transport values from PlayerContext.
 */
export function useMediaSession({
  currentTrack,
  isPlaying,
  position,
  duration,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onSeekTo,
}) {
  const ref = useRef({ currentTrack, isPlaying, position, duration, onPlay, onPause, onNext, onPrevious, onSeekTo });
  ref.current = { currentTrack, isPlaying, position, duration, onPlay, onPause, onNext, onPrevious, onSeekTo };

  // Wire OS-level controls once.
  useEffect(() => {
    registerMediaSessionActions({
      onPlay: () => ref.current.onPlay?.(),
      onPause: () => ref.current.onPause?.(),
      onNext: () => ref.current.onNext?.(),
      onPrevious: () => ref.current.onPrevious?.(),
      onSeekTo: (details) => ref.current.onSeekTo?.(details?.seekTime ?? 0),
      onSeekBackward: (details) =>
        ref.current.onSeekTo?.(Math.max(0, engine.getPosition() - (details?.seekOffset ?? 10))),
      onSeekForward: (details) =>
        ref.current.onSeekTo?.(engine.getPosition() + (details?.seekOffset ?? 10)),
    });
    return () => clearMediaSession();
  }, []);

  // Publish the now-playing picture on every relevant change.
  useEffect(() => {
    updateMediaSession(currentTrack, isPlaying, position, duration);
  }, [currentTrack, isPlaying, position, duration]);
}
