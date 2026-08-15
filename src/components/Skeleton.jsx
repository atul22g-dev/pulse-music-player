import { AudioLines } from "lucide-react";

export function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function SkeletonSongRow() {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <SkeletonBlock className="h-4 w-6" />
      <SkeletonBlock className="h-11 w-11 rounded-lg" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-3.5 w-1/3 rounded-md" />
        <SkeletonBlock className="h-3 w-1/4 rounded-md" />
      </div>
      <SkeletonBlock className="hidden h-3.5 w-10 rounded-md sm:block" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-5 bg-base">
      <div className="relative">
        <div className="absolute inset-0 -m-3 rounded-3xl bg-accent/30 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl accent-gradient-bg shadow-glow">
          <AudioLines className="text-accent-ink" size={30} strokeWidth={2.25} />
        </div>
      </div>
      <div className="flex items-end gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className="w-1.5 animate-eq-bar rounded-full bg-accent"
            style={{ height: 8 + (i % 3) * 8, animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <p className="font-display text-sm font-semibold tracking-[0.3em] text-faint">PULSE</p>
    </div>
  );
}
