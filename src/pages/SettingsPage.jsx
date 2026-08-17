import { useState } from "react";
import { Palette, SlidersHorizontal, Database, Info, Check, Moon, Sun, MonitorSmartphone, RefreshCw, Trash2, Heart, History, Headphones, Smartphone, Lock } from "lucide-react";
import { usePlayer } from "../context/PlayerContext";
import Toggle from "../components/Toggle";
import { STORAGE_KEYS } from "../services/storage";

const ACCENTS = ["purple", "blue", "pink", "green", "orange"];
const THEMES = ["dark", "oled", "light"];

const THEME_META = {
  dark: { label: "Dark", desc: "Premium default", icon: Moon },
  oled: { label: "OLED", desc: "True black", icon: MonitorSmartphone },
  light: { label: "Light", desc: "Clean & bright", icon: Sun },
};

const ACCENT_HEX = {
  purple: "#8b5cf6",
  blue: "#3b82f6",
  pink: "#ec4899",
  green: "#10b981",
  orange: "#f97316",
};

function Card({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`card p-5 sm:p-6 ${className}`}>
      <h2 className="mb-5 flex items-center gap-2.5 font-display text-[15px] font-bold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <Icon size={16} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const {
    settings, updateSettings, setVolume, volume,
    clearRecentlyPlayed, clearFavorites, resetApp, recent, favorites,
    syncNow, syncing,
  } = usePlayer();

  return (
    <div className="animate-fade-up mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Preferences</p>
        <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Settings</h1>
        <p className="prose-dim mt-2">Everything is saved locally — themes, accents, playback and history.</p>
      </div>

      {/* appearance */}
      <Card title="Appearance" icon={Palette}>
        <p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-faint">Theme</p>
        <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => {
            const meta = THEME_META[t];
            const Icon = meta.icon;
            const active = settings.theme === t;
            return (
              <button
                key={t}
                role="radio"
                aria-checked={active}
                onClick={() => updateSettings({ theme: t })}
                className={`group relative rounded-2xl border p-4 text-left transition-all duration-200 ${
                  active ? "border-accent/50 bg-accent/[0.08] shadow-glow-sm" : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <Icon size={18} className={active ? "text-accent" : "text-dim"} />
                <p className="mt-3 text-[13px] font-semibold text-ink">{meta.label}</p>
                <p className="mt-0.5 text-[11px] text-dim">{meta.desc}</p>
                {active && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full accent-gradient-bg text-accent-ink">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <p className="mb-3 mt-7 text-[12px] font-semibold uppercase tracking-wider text-faint">Accent color</p>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Accent color">
          {ACCENTS.map((a) => {
            const active = settings.accent === a;
            return (
              <button
                key={a}
                role="radio"
                aria-checked={active}
                aria-label={`${a} accent`}
                onClick={() => updateSettings({ accent: a })}
                className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${
                  active ? "shadow-glow" : ""
                }`}
                style={{ background: ACCENT_HEX[a], boxShadow: active ? `0 0 0 3px rgb(var(--bg)), 0 0 0 5px ${ACCENT_HEX[a]}66, 0 0 22px ${ACCENT_HEX[a]}88` : undefined }}
              >
                {active && <Check size={17} strokeWidth={3} className="text-white" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* playback */}
      <Card title="Playback" icon={SlidersHorizontal}>
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="vol" className="text-[13.5px] font-medium text-ink">Volume</label>
              <span className="font-mono text-[12px] tabular-nums text-faint">{Math.round(volume * 100)}%</span>
            </div>
            <input
              id="vol"
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="range-input"
              style={{ "--fill": `${volume * 100}%` }}
            />
          </div>
          <div className="space-y-5 border-t border-white/[0.06] pt-5">
            <Toggle
              checked={settings.autoplay}
              onChange={(v) => updateSettings({ autoplay: v })}
              label="Autoplay"
              description="When the queue ends, keep the music going with a fresh shuffle."
            />
            <Toggle
              checked={settings.crossfade}
              onChange={(v) => updateSettings({ crossfade: v })}
              label="Crossfade"
              description="Smoothly blend the end of one track into the next."
            />
            <Toggle
              checked={settings.reduceMotion}
              onChange={(v) => updateSettings({ reduceMotion: v })}
              label="Reduce animations"
              description="Calm the interface down — minimal motion everywhere."
            />
          </div>
        </div>
      </Card>

      {/* background music */}
      <Card title="Background music" icon={Headphones}>
        <p className="mb-4 text-[13px] leading-relaxed text-dim">
          Playback stops with a short tone whenever the app leaves the foreground
          — switch tabs, minimize the window, lock your phone, or close the app.
          The song pauses right away and the tone plays as the app goes quiet.
        </p>
        <ol className="space-y-3">
          {[
            [
              <Smartphone key="s" size={17} className="mt-0.5 shrink-0 text-accent" />,
              <>
                <span className="font-semibold text-ink">Open Pulse in your browser</span>
                <span className="block text-[11.5px] text-faint">On your phone — Chrome on Android, Safari on iPhone.</span>
              </>,
            ],
            [
              <Lock key="l" size={17} className="mt-0.5 shrink-0 text-accent" />,
              <>
                <span className="font-semibold text-ink">Add it to your home screen</span>
                <span className="block text-[11.5px] text-faint">
                  Chrome: ⋮ → “Add to Home screen”. Safari: Share → “Add to Home Screen”.
                </span>
              </>,
            ],
            [
              <Headphones key="h" size={17} className="mt-0.5 shrink-0 text-accent" />,
              <>
                <span className="font-semibold text-ink">Play from the installed app</span>
                <span className="block text-[11.5px] text-faint">
                  Lock the phone — playback stops with the tone; play / pause / skip / scrub stay on the lock screen.
                </span>
              </>,
            ],
          ].map(([icon, copy], i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 font-mono text-[10.5px] font-bold text-accent">
                {i + 1}
              </span>
              <div className="flex items-start gap-3 text-[13px]">
                {icon}
                <span>{copy}</span>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 border-t border-white/[0.06] pt-4 text-[11.5px] leading-relaxed text-faint">
          Desktop works the same way: switch tabs or minimize the window and playback
          stops with the tone, while media keys (⏯ ⏮ ⏭) still control it.
        </p>
      </Card>

      {/* data */}
      <Card title="Your data" icon={Database}>
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => syncNow()}
            disabled={syncing}
            className="flex w-full items-center gap-3 rounded-2xl border border-accent/25 bg-accent/[0.07] px-4 py-3 text-left transition-colors hover:border-accent/45 disabled:opacity-60"
          >
            <RefreshCw size={17} className={syncing ? "animate-spin text-accent" : "text-accent"} />
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-ink">
                {syncing ? "Syncing playlists…" : "Sync playlists now"}
              </span>
              <span className="block text-[11.5px] text-dim">
                Pull the latest songs from your YouTube playlists
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={clearRecentlyPlayed}
            disabled={recent.length === 0}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-white/15 disabled:opacity-40"
          >
            <History size={17} className="text-dim" />
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-ink">Clear recently played</span>
              <span className="block text-[11.5px] text-dim">{recent.length} entries in history</span>
            </span>
            <Trash2 size={15} className="text-faint" />
          </button>
          <button
            type="button"
            onClick={clearFavorites}
            disabled={favorites.length === 0}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-left transition-colors hover:border-white/15 disabled:opacity-40"
          >
            <Heart size={17} className="text-dim" />
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-ink">Clear favorites</span>
              <span className="block text-[11.5px] text-dim">{favorites.length} hearted tracks</span>
            </span>
            <Trash2 size={15} className="text-faint" />
          </button>
          <button
            type="button"
            onClick={resetApp}
            className="flex w-full items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-left transition-colors hover:border-rose-400/40"
          >
            <RefreshCw size={17} className="text-rose-400" />
            <span className="flex-1">
              <span className="block text-[13px] font-semibold text-ink">Reset application</span>
              <span className="block text-[11.5px] text-dim">Wipe all local data and start fresh</span>
            </span>
          </button>
        </div>
      </Card>

      {/* about */}
      <Card title="About & shortcuts" icon={Info}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {[
              ["Space", "Play / pause"],
              ["← / →", "Seek ±5s"],
              ["Shift + ← / →", "Previous / next"],
              ["↑ / ↓", "Volume"],
              ["F", "Favorite track"],
            ].map(([key, action]) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <kbd className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-1 font-mono text-[11px] text-ink">{key}</kbd>
                <span className="text-right text-[11.5px] text-dim">{action}</span>
              </div>
            ))}
          </div>

          <p className="border-t border-white/[0.06] pt-4 text-center text-[11px] leading-relaxed text-faint">
            Tracks play through YouTube's official embed — nothing is downloaded or extracted. If YouTube is
            unreachable or a video is blocked, Pulse falls back to an original ambient preview generated locally.
            Playback state persists via <span className="font-mono">{STORAGE_KEYS.queue}</span>.
          </p>
        </div>
      </Card>
    </div>
  );
}
