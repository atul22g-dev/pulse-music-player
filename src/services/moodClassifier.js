/**
 * moodClassifier — automatically matches catalog songs to the curated mood
 * playlists. This runs whenever the catalog changes, so future songs added to
 * your YouTube playlists are checked and placed into fitting moods on their
 * own (no manual editing needed).
 *
 * How it works: each mood defines keyword + artist rules with weights. A track
 * is scored by matching its title and artist (case-insensitive); if the score
 * reaches the threshold it joins that mood. A track can belong to several
 * moods. To tune matching, edit the keyword weights below — heavier keywords
 * matter more, and the threshold can be raised/lowered per mood.
 */

const THRESHOLD = 2;

const RULES = {
  "late-night-drives": {
    label: "Late Night Drives",
    description: "Window down, city lights, nowhere to be. Slow burners for the midnight road.",
    keywords: {
      "night": 2, "raat": 2, "drive": 2, "midnight": 2, "city": 1,
      "chaand": 2, "chand": 2, "bairan": 2, "barsaat": 2, "rain": 2,
      "tu hai kahan": 2, "slow": 1, "reprise": 1, "acoustic": 1, "lofi": 2,
      "soul": 1, "chor": 2, "tanha": 1, "aansu": 1, "yaad": 1,
    },
    artists: {},
  },
  "soul-and-silence": {
    label: "Soul & Silence",
    description: "Quiet hours and quieter hearts. Acoustic-leaning gems for deep listening.",
    keywords: {
      "reprise": 3, "acoustic": 3, "unplugged": 3, "cover": 2, "piano": 3,
      "chaand": 2, "chand": 2, "chidiya": 2, "dinle": 2, "yemin": 2,
      "tu hai kahan": 2, "soul": 2, "dil": 1, "ishq": 1, "bairan": 1,
    },
    artists: { "jalraj": 2, "reymir": 1, "aur": 1 },
  },
  "rising-indie": {
    label: "Rising Indie",
    description: "Fresh voices rewriting the charts — the indie wave you should be following.",
    keywords: {
      "indie": 3, "rap": 2, "japanese": 2, "chor": 2, "badtameez": 2,
      "just a boy": 2, "tu na samjhe": 2, "remix": 2, "official music video": 1,
      "fresh": 1, "banjaare": 1,
    },
    artists: { "justh": 3, "aur": 2, "raja": 2, "hellow raja": 2, "saini": 1, "banjaare": 1 },
  },
  "haryanvi-heat": {
    label: "Haryanvi Heat",
    description: "Folk fire and desi attitude. Bold, percussive, unapologetic.",
    keywords: {
      "haryanvi": 4, "haryana": 4, "desi": 2, "kudi": 2, "launde": 2,
      "kyu": 2, "aise hote": 2, "zamane": 2, "saini": 2, "bairan": 2,
      "barsaat": 2, "tu na samjhe": 2,
    },
    artists: { "taran saini": 3 },
  },
  "sad-hours": {
    label: "Sad Hours",
    description: "For the feelings you can't name. Let the volume carry it.",
    keywords: {
      "sad": 3, "aansu": 2, "tanha": 2, "judai": 3, "dil": 1, "ishq": 1,
      "yaad": 2, "tujhe": 1, "kaise": 1, "kyu": 2, "bairan": 2,
      "tu hai kahan": 3, "dinle": 2, "yemin": 2, "chidiya": 2,
      "na samjhe": 1, "chand": 1,
    },
    artists: {},
  },
};

/**
 * Score one track against every mood. Returns the list of mood ids the track
 * fits (possibly empty). Pure function — no state, no side effects.
 */
export function matchMoodIds(track) {
  if (!track) return [];
  const hay = `${track.title || ""} ${track.artist || ""}`.toLowerCase();
  const artist = (track.artist || "").toLowerCase();

  const matches = [];
  for (const [moodId, rule] of Object.entries(RULES)) {
    let score = 0;
    for (const [kw, weight] of Object.entries(rule.keywords)) {
      if (hay.includes(kw)) score += weight;
    }
    for (const [a, weight] of Object.entries(rule.artists)) {
      if (artist.includes(a)) score += weight;
    }
    if (score >= THRESHOLD) matches.push(moodId);
  }
  return matches;
}
