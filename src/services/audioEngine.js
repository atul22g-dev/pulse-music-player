/**
 * audioEngine — a provider-agnostic playback engine with two providers:
 *
 *  1. "youtube" — real playback through YouTube's official IFrame Player API
 *     (embed-based; nothing is downloaded or extracted). Used whenever the
 *     track carries a `youtubeId` and the embed is reachable.
 *  2. "synth"   — a fallback that synthesizes an original ambient composition
 *     locally (Web Audio API oscillators seeded per track) so the player stays
 *     fully functional offline or when a video is blocked/unavailable.
 *
 * The UI never talks to either provider directly — it uses this stable surface:
 *   load / play / pause / seekTo / setVolume / getPosition / getDuration /
 *   getAnalyser / onEnded / onError / onMessage / onProviderChange
 */

import { hashString, mulberry32, clamp } from "../utils/misc";

const SCHEDULE_AHEAD = 0.6; // seconds of notes scheduled in advance
const TICK_MS = 120;

const YT_STATES = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };

class AudioEngine {
  constructor() {
    // synth provider
    this.ctx = null;
    this.volumeNode = null;
    this.analyser = null;
    this._position = 0;
    this._startCtxTime = 0;
    this._startPosition = 0;
    this._tickTimer = null;
    this._seed = 0;
    this._progression = null;
    this._scheduled = new Set();
    this._fading = false;

    // shared state
    this.track = null;
    this.playing = false;
    this._volume = 0.8;
    this.provider = "synth";

    // youtube provider
    this.youtube = null;
    this.youtubeReady = false;
    this.youtubeAvailable = null; // null = unknown, true = ok, false = failed
    this.youtubeFailed = false;
    this._ytCuedId = null;
    this._pendingPlay = false;
    this._apiPromise = null;

    // callbacks
    this.onEnded = null;
    this.onError = null;
    this.onMessage = null;
    this.onProviderChange = null;
  }

  /* ------------------------------------------------------------------ */
  /*  YouTube IFrame provider                                            */
  /* ------------------------------------------------------------------ */

  /** Load the official IFrame API and create a hidden player once. */
  initYouTube() {
    if (this.youtubeAvailable === false || this.youtubeFailed) return Promise.resolve(false);
    if (this._apiPromise) return this._apiPromise;

    let settle;
    this._apiPromise = new Promise((resolve) => {
      settle = resolve;
      if (window.YT && window.YT.Player) {
        this._createYouTubePlayer(resolve);
        return;
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        this._createYouTubePlayer(resolve);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        this.youtubeAvailable = false;
        this.youtubeFailed = true;
        resolve(false);
      };
      document.head.appendChild(script);
    });

    // Safety net: if the embed page never becomes ready (offline, firewall,
    // sandboxed webview), stop waiting and fall back to the synth provider.
    const timer = setTimeout(() => {
      if (!this.youtubeReady) {
        this.youtubeAvailable = false;
        this.youtubeFailed = true;
        this._pendingPlay = false;
        if (settle) settle(false);
      }
    }, 12000);
    this._apiPromise.then(
      () => clearTimeout(timer),
      () => clearTimeout(timer)
    );
    return this._apiPromise;
  }

  _createYouTubePlayer(resolve) {
    if (!window.YT?.Player) {
      this.youtubeAvailable = false;
      this.youtubeFailed = true;
      resolve(false);
      return;
    }
    const host = document.createElement("div");
    host.id = "pulse-yt-host";
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:absolute;left:-10000px;top:0;width:2px;height:2px;overflow:hidden;";
    document.body.appendChild(host);

    this.youtube = new window.YT.Player(host, {
      width: 2,
      height: 2,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        playsinline: 1,
        rel: 0,
        iv_load_policy: 3,
        modestbranding: 1,
      },
      events: {
        onReady: () => {
          this.youtubeReady = true;
          this.youtubeAvailable = true;
          try {
            this.youtube.setVolume(Math.round(this._volume * 100));
          } catch {
            /* noop */
          }
          resolve(true);
          if (this._pendingPlay) {
            this._pendingPlay = false;
            this._ytStart();
          }
        },
        onStateChange: (e) => this._onYtState(e.data),
        onError: () => this._onYtError(),
      },
    });
  }

  _onYtState(state) {
    if (state === YT_STATES.PLAYING) {
      if (!this.playing) {
        this.playing = true;
        this._emit();
      }
    } else if (state === YT_STATES.PAUSED) {
      if (this.playing) {
        this.playing = false;
        this._emit();
      }
    } else if (state === YT_STATES.ENDED) {
      if (this.playing) {
        this.playing = false;
        this._emit();
      }
      this._position = 0;
      if (this.onEnded) this.onEnded();
    }
    // BUFFERING / CUED / UNSTARTED are transient — nothing to do
  }

  _onYtError() {
    this.youtubeFailed = true;
    const wasPending = this._pendingPlay;
    this._pendingPlay = false;
    if (this.provider === "youtube") {
      this.provider = "synth";
      if (this.onProviderChange) this.onProviderChange("synth");
    }
    this.playing = false;
    if (this.track && (wasPending || this.playing)) {
      this._loadSynth(this.track);
      this._playSynth();
    }
    if (this.onMessage) {
      this.onMessage("This video can't be played here — using preview audio instead.");
    }
    this._emit();
  }

  _ytEligible(track) {
    return !!(track?.youtubeId && this.youtubeAvailable !== false && !this.youtubeFailed);
  }

  _ytStart() {
    const t = this.track;
    if (!t?.youtubeId) {
      this._fallbackToSynth("This video can't be played here — using preview audio instead.");
      return;
    }
    this._pendingPlay = false;
    try {
      if (this._ytCuedId === t.youtubeId) {
        this.youtube.playVideo();
      } else {
        this.youtube.loadVideoById(t.youtubeId);
        this._ytCuedId = t.youtubeId;
      }
    } catch {
      this._fallbackToSynth("Couldn't start YouTube playback — using preview audio instead.");
      return;
    }
    this.playing = true;
    this._emit();
    this._ytVerifyStart();
  }

  /**
   * Start verification: if the embed hasn't actually started within a couple
   * of seconds (autoplay policy on a cold start, auto-advance without a fresh
   * gesture, blocked video), retry once — then fall back to the synth provider
   * so the music never silently stops.
   */
  _ytVerifyStart() {
    clearTimeout(this._ytVerifyTimer);
    this._ytVerifyTimer = setTimeout(() => {
      if (!this.playing || !this.youtubeReady || !this.youtube) return;
      let st;
      try {
        st = this.youtube.getPlayerState();
      } catch {
        this._fallbackToSynth("YouTube couldn't start this video — using preview audio instead.");
        return;
      }
      if (st !== YT_STATES.PLAYING && st !== YT_STATES.BUFFERING) {
        try {
          this.youtube.playVideo();
        } catch {
          this._fallbackToSynth("YouTube couldn't start this video — using preview audio instead.");
          return;
        }
        // give it one more beat, then fall back if it's still silent
        this._ytVerifyTimer = setTimeout(() => {
          if (!this.playing || !this.youtubeReady || !this.youtube) return;
          try {
            const st2 = this.youtube.getPlayerState();
            if (st2 !== YT_STATES.PLAYING && st2 !== YT_STATES.BUFFERING) {
              this._fallbackToSynth("YouTube couldn't start this video — using preview audio instead.");
            }
          } catch {
            this._fallbackToSynth("YouTube couldn't start this video — using preview audio instead.");
          }
        }, 1600);
      }
    }, 900);
  }

  _fallbackToSynth(message) {
    // Make sure the embed can't start late and double up with the synth.
    if (this.youtubeReady && this.youtube) {
      try {
        this.youtube.pauseVideo();
      } catch {
        /* noop */
      }
    }
    if (this.provider !== "synth") {
      this.provider = "synth";
      if (this.onProviderChange) this.onProviderChange("synth");
    }
    this._pendingPlay = false;
    if (this.track) {
      this._loadSynth(this.track);
      this._playSynth();
    }
    if (message && this.onMessage) this.onMessage(message);
  }

  /* ------------------------------------------------------------------ */
  /*  Public surface                                                     */
  /* ------------------------------------------------------------------ */

  get isSupported() {
    return typeof window !== "undefined" && !!(window.AudioContext || window.webkitAudioContext);
  }

  load(track) {
    clearTimeout(this._ytVerifyTimer);
    this.track = track;
    this._seed = track ? hashString(track.id) : 0;
    this._progression = track ? this._buildProgression(this._seed) : null;
    this._position = 0;
    this._killScheduled();
    const provider = this._ytEligible(track) ? "youtube" : "synth";
    if (provider !== this.provider) {
      this.provider = provider;
      if (this.onProviderChange) this.onProviderChange(provider);
    }
    this._emit();
  }

  play() {
    if (!this.track) return;
    if (this.provider === "youtube") {
      if (this.youtubeReady && this.youtube) {
        this._pendingPlay = false;
        this._ytStart();
      } else {
        this._pendingPlay = true;
        this.initYouTube().then((ok) => {
          if (!ok) {
            this._fallbackToSynth("YouTube is unavailable — using preview audio instead.");
            return;
          }
          if (this.provider !== "youtube" || !this.youtubeReady) return;
          this._ytStart();
        });
      }
      return;
    }
    if (!this.isSupported) {
      if (this.onError) this.onError("Audio is not supported in this browser.");
      return;
    }
    this._playSynth();
  }

  pause() {
    clearTimeout(this._ytVerifyTimer);
    if (this.provider === "youtube" && this.youtubeReady && this.youtube) {
      try {
        this.youtube.pauseVideo();
      } catch {
        /* noop */
      }
      this.playing = false;
      this._emit();
      return;
    }
    this._pauseSynth();
  }

  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }

  seekTo(seconds) {
    if (!this.track) return;
    const target = clamp(seconds, 0, this.track.duration || seconds);
    if (this.provider === "youtube" && this.youtubeReady && this.youtube) {
      try {
        this.youtube.seekTo(target, true);
      } catch {
        /* noop */
      }
      this._position = target;
      this._emit();
      return;
    }
    this._seekSynth(target);
  }

  getPosition() {
    if (this.provider === "youtube" && this.youtubeReady && this.youtube) {
      try {
        const t = this.youtube.getCurrentTime() || 0;
        this._position = t;
        return t;
      } catch {
        return this._position;
      }
    }
    return this._currentPlaybackPosition();
  }

  getDuration() {
    if (this.provider === "youtube" && this.youtubeReady && this.youtube) {
      try {
        const d = this.youtube.getDuration();
        if (d > 0) return d;
      } catch {
        /* noop */
      }
    }
    return this.track?.duration || 0;
  }

  setVolume(volume) {
    this._volume = clamp(volume, 0, 1);
    if (this.youtubeReady && this.youtube) {
      try {
        this.youtube.setVolume(Math.round(this._volume * 100));
      } catch {
        /* noop */
      }
    }
    if (this.volumeNode && this.ctx) {
      this.volumeNode.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.05);
    }
  }

  getVolume() {
    return this._volume;
  }

  /** Fade the synth master gain (no-op for YouTube — used for crossfade). */
  fadeOut(duration = 0.18) {
    if (!this.ctx || !this.volumeNode) return Promise.resolve();
    this._fading = true;
    return new Promise((resolve) => {
      const now = this.ctx.currentTime;
      this.volumeNode.gain.cancelScheduledValues(now);
      this.volumeNode.gain.setValueAtTime(this.volumeNode.gain.value, now);
      this.volumeNode.gain.linearRampToValueAtTime(0.0001, now + duration);
      setTimeout(resolve, duration * 1000);
    });
  }

  fadeIn(duration = 0.25) {
    if (!this.ctx || !this.volumeNode) return;
    const now = this.ctx.currentTime;
    this.volumeNode.gain.cancelScheduledValues(now);
    this.volumeNode.gain.setValueAtTime(0.0001, now);
    this.volumeNode.gain.linearRampToValueAtTime(this._volume, now + duration);
    this._fading = false;
  }

  /** Returns frequency data for the visualizer (null in YouTube mode → CSS fallback). */
  getFrequencyData() {
    if (this.provider !== "synth" || !this.analyser || !this.playing) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getLevel() {
    const data = this.getFrequencyData();
    if (!data) return 0;
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return sum / data.length / 255;
  }

  destroy() {
    this._stopScheduler();
    this._killScheduled();
    if (this.youtube) {
      try {
        this.youtube.destroy();
      } catch {
        /* noop */
      }
      this.youtube = null;
    }
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch {
        /* noop */
      }
      this.ctx = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Synth provider internals                                           */
  /* ------------------------------------------------------------------ */

  _loadSynth(track) {
    this.track = track;
    this._seed = track ? hashString(track.id) : 0;
    this._progression = track ? this._buildProgression(this._seed) : null;
    this._position = 0;
    this._killScheduled();
    this._emit();
  }

  _playSynth() {
    if (!this.track) return;
    if (!this.isSupported) {
      if (this.onError) this.onError("Audio is not supported in this browser.");
      return;
    }
    this._ensureContext();
    if (this.ctx.state === "suspended") this.ctx.resume();
    this._startCtxTime = this.ctx.currentTime;
    this._startPosition = this._position;
    this.playing = true;
    this._startScheduler();
    this._emit();
  }

  _pauseSynth() {
    if (!this.ctx) return;
    this._position = this._currentPlaybackPosition();
    this.playing = false;
    this._stopScheduler();
    this._killScheduled();
    if (this.ctx.state === "running") this.ctx.suspend();
    this._emit();
  }

  _seekSynth(target) {
    this._killScheduled();
    this._position = target;
    if (!this.ctx) {
      this._emit();
      return;
    }
    this._startCtxTime = this.ctx.currentTime;
    this._startPosition = target;
    if (this.playing) {
      this._startScheduler();
      this._scheduleWindow(this.ctx.currentTime + 0.05);
    }
    this._emit();
  }

  _ensureContext() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.volumeNode = this.ctx.createGain();
    this.volumeNode.gain.value = this._volume;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.82;
    this.volumeNode.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  _buildProgression(seed) {
    const rand = mulberry32(seed);
    const scaleRoot = [48, 50, 52, 53, 55, 57, 59, 60][Math.floor(rand() * 8)];
    const bpm = 78 + Math.floor(rand() * 38);
    const chords = [];
    const rootNotes = [scaleRoot, scaleRoot + 3, scaleRoot + 5, scaleRoot + 7];
    for (let i = 0; i < 4; i++) {
      const root = rootNotes[i];
      const third = rand() > 0.35 ? 4 : 3; // major or minor feel
      chords.push([root, root + third, root + 7]);
    }
    return {
      bpm,
      chords,
      padWave: ["triangle", "sine", "sawtooth"][Math.floor(rand() * 3)],
      pluckWave: ["sine", "triangle"][Math.floor(rand() * 2)],
      brightness: 900 + rand() * 1600,
      padLevel: 0.05 + rand() * 0.035,
      pluckLevel: 0.05 + rand() * 0.04,
      bassLevel: 0.05 + rand() * 0.025,
    };
  }

  _beatDuration() {
    return 60 / this._progression.bpm;
  }

  _currentPlaybackPosition() {
    if (!this.playing || !this.ctx) return this._position;
    return this._position + (this.ctx.currentTime - this._startCtxTime);
  }

  _killScheduled() {
    this._scheduled.forEach((node) => {
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
      try {
        node.disconnect();
      } catch {
        /* noop */
      }
    });
    this._scheduled.clear();
  }

  _note(freq, start, dur, type, gainVal, filterFreq) {
    if (!this.ctx) return;
    if (!Number.isFinite(freq) || !Number.isFinite(start) || !Number.isFinite(dur)) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq || 4200;

    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 8;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainVal, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.volumeNode);

    osc.start(start);
    osc.stop(start + dur + 0.05);
    this._scheduled.add(osc);
    osc.onended = () => {
      this._scheduled.delete(osc);
      try {
        osc.disconnect();
        gain.disconnect();
        filter.disconnect();
      } catch {
        /* noop */
      }
    };
  }

  _scheduleWindow(fromCtxTime) {
    if (!this.ctx || !this._progression) return;
    const beat = this._beatDuration();
    const bar = beat * 4;
    const step = beat / 4;

    for (let t = fromCtxTime; t < fromCtxTime + SCHEDULE_AHEAD; t += step / 2) {
      const pos = this._currentPlaybackPosition() + (t - this.ctx.currentTime);
      const chordIndex = Math.floor(pos / bar) % 4;
      const chord = this._progression.chords[chordIndex];
      const stepInBar = Math.floor((pos % bar) / step) % 16;

      const padDur = bar * 0.98;
      if (stepInBar === 0) {
        chord.forEach((note, i) => {
          const freq = this._midiToFreq(note + (i === 0 ? 12 : 0));
          this._note(freq, t, padDur, this._progression.padWave, this._progression.padLevel * (0.6 + i * 0.2), this._progression.brightness);
        });
        this._note(this._midiToFreq(chord[0] - 12), t, padDur * 0.85, "sine", this._progression.bassLevel, 300);
      }

      const arpPattern = [0, 1, 2, 1, 0, 2, 1, 2];
      if (stepInBar % 2 === 0) {
        const stepIdx = (stepInBar / 2) % 8;
        const octave = stepIdx % 4 === 3 ? 12 : 0;
        const note = chord[arpPattern[stepIdx]] + octave + (stepIdx > 5 ? 12 : 0);
        this._note(this._midiToFreq(note), t, step * 1.8, this._progression.pluckWave, this._progression.pluckLevel * (1 - stepIdx * 0.06), 5200);
      }
    }
  }

  _midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  _startScheduler() {
    if (this._tickTimer) return;
    const tick = () => {
      if (!this.playing) return;
      const pos = this._currentPlaybackPosition();
      // Guard duration <= 0 (e.g. metadata not yet synced) so a track never
      // instantly "ends" and loops forever.
      if (this.track && this.track.duration > 0 && pos >= this.track.duration) {
        this._position = this.track.duration;
        this.pause();
        if (this.onEnded) this.onEnded();
        return;
      }
      this._scheduleWindow(this.ctx.currentTime + 0.05);
    };
    this._tickTimer = setInterval(tick, TICK_MS);
    tick();
  }

  _stopScheduler() {
    if (this._tickTimer) {
      clearInterval(this._tickTimer);
      this._tickTimer = null;
    }
  }

  _emit() {
    if (this.onStateChange) this.onStateChange({ playing: this.playing, position: this.getPosition() });
  }
}

export const engine = new AudioEngine();
