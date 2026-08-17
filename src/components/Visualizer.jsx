import { useEffect, useRef } from "react";
import { engine } from "../services/audioEngine";
import { usePlayer } from "../context/PlayerContext";

/**
 * Audio visualizer. While the synth provider is playing it reads real
 * frequency data from the engine's analyser; when idle (or in YouTube mode,
 * where no analyser exists) it falls back to layered sine waves so the UI
 * never looks dead. One rAF keeps it cheap.
 *
 * Polish details:
 *  - bars sample the spectrum on a log scale, so bass and treble both read
 *  - heights are smoothed (fast attack, slow release) and self-normalized,
 *    so quiet tracks still fill the canvas without constant clipping
 *  - peak caps linger above each bar and drift down — the classic EQ look
 *  - bass energy drives a subtle whole-wave pulse on the beat
 *  - reduced motion renders a calm, static pattern
 */
export default function Visualizer({ bars = 48, className = "", height = 40, ariaLabel = "Audio visualizer" }) {
  const canvasRef = useRef(null);
  const { isPlaying, settings } = usePlayer();
  const reduced = settings.reduceMotion || window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const getColors = () => {
      const style = getComputedStyle(document.documentElement);
      const parse = (name) => {
        const rgb = style.getPropertyValue(name).trim().split(/\s+/).map(Number);
        return rgb.length === 3 ? rgb : null;
      };
      return {
        accent: parse("--accent") ?? [139, 92, 246],
        strong: parse("--accent-strong") ?? [167, 139, 250],
      };
    };

    // Cross-frame state.
    const level = new Float32Array(bars); // smoothed bar heights
    const peak = new Float32Array(bars);  // lingering peak caps
    let norm = 0.4;   // slow-running average level, used to self-normalize
    let pulse = 0;    // bass onset → whole-wave pop
    let bass = 0;     // last bass energy
    let lastT = 0;
    let bins = null;

    // Precompute each bar's log-spaced spectrum bin: bar i → bin
    // 10^(t·log10(len)) − 1, so bars span 0..len−1 but concentrate on the
    // low end where real audio energy lives.
    const binFor = (len) => {
      const table = new Uint16Array(bars);
      const logRange = Math.log10(Math.max(len, 1));
      for (let i = 0; i < bars; i++) {
        const t = bars > 1 ? i / (bars - 1) : 0;
        table[i] = Math.min(len - 1, Math.max(0, Math.round(Math.pow(10, t * logRange) - 1)));
      }
      return table;
    };

    const draw = (t) => {
      raf = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      const dt = Math.min(Math.max((t - lastT) / 1000, 0.001), 0.05);
      lastT = t;

      const { accent, strong } = getColors();
      const data = engine.getFrequencyData();
      const hasData = data && isPlaying && !reduced;

      // Self-normalization: drift a reference level toward the current
      // average so both quiet and loud material render comfortably.
      if (hasData) {
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        norm = Math.max(0.02, norm + (avg - norm) * 0.06);
      } else {
        norm = Math.max(0.02, norm * (1 - dt * 0.4));
      }

      // Bass onset → beat pulse. The synth bass is a held note, so a rising
      // low-end spike marks each chord change / kick-like moment.
      if (hasData) {
        if (!bins) bins = binFor(data.length);
        let b = 0;
        for (let i = 0; i < 4; i++) b += data[i];
        b /= 4 * 255;
        if (b > 0.2 && b > bass * 1.12) pulse = 1;
        bass = b;
      } else {
        bass = 0;
      }
      pulse = Math.max(0, pulse - dt * 2.4);

      const n = bars;
      const gap = (w / n) * 0.35;
      const bw = w / n - gap;
      const usable = h * 0.92;

      for (let i = 0; i < n; i++) {
        let v;
        if (hasData) {
          v = data[bins[i]] / 255 / norm;
          // Asymmetric smoothing: pop up fast, fall back slowly.
          const k = v > level[i] ? 0.55 : 0.16;
          level[i] += (v - level[i]) * k;
          v = Math.min(1, level[i]);
          peak[i] = Math.max(v, peak[i] - dt * 0.5);
        } else if (reduced) {
          // Calm, static pattern for reduced-motion.
          v = 0.35;
          level[i] = v;
          peak[i] = v;
        } else {
          // Fallback (YouTube mode or idle) — layered traveling sines.
          const s = t / 1000;
          const raw =
            Math.sin(s * 1.3 + i * 0.36) * 0.55 +
            Math.sin(s * 2.6 + i * 0.8) * 0.3 +
            Math.sin(s * 0.55 + i * 0.13) * 0.15;
          const wave = 0.5 + 0.5 * raw;
          v = isPlaying ? 0.18 + wave * 0.5 : 0.08 + wave * 0.2;
          level[i] = v;
          peak[i] = v;
        }

        const pop = 1 + pulse * 0.16;
        const bh = Math.max(2, v * usable * pop);
        const x = i * (bw + gap);
        const y = (h - bh) / 2;

        // Gradient: accent → accent-strong as the bar grows.
        const mix = Math.min(1, v * 1.2);
        const r = Math.round(accent[0] + (strong[0] - accent[0]) * mix);
        const g = Math.round(accent[1] + (strong[1] - accent[1]) * mix);
        const b = Math.round(accent[2] + (strong[2] - accent[2]) * mix);
        const alpha = Math.min(1, (isPlaying ? 0.42 + v * 0.5 : 0.16 + v * 0.12) * (1 + pulse * 0.3));
        const radius = Math.min(bw / 2, 3);

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bh, radius);
        ctx.fill();

        // Peak cap — a small bright nub that lingers above the bar.
        if (hasData) {
          const py = (h - Math.max(2, peak[i] * usable)) / 2;
          const capH = Math.min(2.5, Math.max(1.5, bh * 0.12));
          ctx.fillStyle = `rgba(${strong[0]}, ${strong[1]}, ${strong[2]}, ${0.35 + peak[i] * 0.5})`;
          ctx.beginPath();
          ctx.roundRect(x + bw * 0.18, py - capH, bw * 0.64, capH, capH / 2);
          ctx.fill();
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [bars, isPlaying, reduced]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={ariaLabel}
      className={`w-full ${className}`}
      style={{ height }}
    />
  );
}
