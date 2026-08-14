import { getTrack } from "../data/tracks";

export const getPlaylistTracks = (playlist) => {
  const tracks = [];
  for (const id of playlist?.trackIds || []) {
    const track = getTrack(id);
    if (track) tracks.push(track);
  }
  return tracks;
};

export const getPlaylistDuration = (playlist) =>
  getPlaylistTracks(playlist).reduce((sum, t) => sum + t.duration, 0);
