import { useEffect, useRef } from "react";
import { engine } from "../services/audioEngine";
import { usePlayer } from "../context/PlayerContext";

/**
 * Subtle audio visualizer. Reads real frequency data from the engine's
 * analyser while playing; when idle it falls back to a gentle CSS-style
 * sine motion so the UI never looks dead. Canvas keeps it cheap — one rAF.
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

    const getAccent = () => {
      const style = getComputedStyle(document.documentElement);
      const rgb = style.getPropertyValue("--accent").trim().split(/\s+/).map(Number);
      return rgb.length === 3 ? rgb : [139, 92, 246];
    };

    const draw = (t) => {
      raf = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const data = engine.getFrequencyData();
      const n = bars;
      const gap = w / n * 0.35;
      const bw = w / n - gap;
      const [r, g, b] = getAccent();

      for (let i = 0; i < n; i++) {
        let v;
        if (data && isPlaying) {
          const idx = Math.floor((i / n) * data.length * 0.7) + 2;
          v = data[idx] / 255;
        } else if (isPlaying && reduced) {
          v = 0.35;
        } else {
          // fallback (YouTube mode or idle) — soft, deterministic wave.
          // Livelier while playing so the UI never looks dead without analyser data.
          const wave = Math.sin(t / 900 + i * 0.35) * 0.5 + 0.5;
          v = isPlaying ? 0.16 + wave * 0.3 : 0.06 + wave * 0.14;
        }
        const bh = Math.max(2, v * h * 0.92);
        const x = i * (bw + gap);
        const y = (h - bh) / 2;
        const alpha = isPlaying ? 0.4 + v * 0.55 : 0.16;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        const radius = Math.min(bw / 2, 3);
        ctx.beginPath();
        ctx.roundRect(x, y, bw, bh, radius);
        ctx.fill();
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
