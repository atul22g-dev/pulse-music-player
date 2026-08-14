export async function shareTrack(track, toast) {
  const text = `${track.title} — ${track.artist}`;
  const url = `https://www.youtube.com/watch?v=${track.youtubeId || track.id}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: text, text, url });
      return;
    } catch {
      // user cancelled — no toast needed
      return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.push(`Link to “${track.title}” copied`, "success");
  } catch {
    toast.push("Couldn't copy the link", "error");
  }
}
