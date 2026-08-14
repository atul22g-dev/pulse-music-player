export default function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group flex w-full items-center justify-between gap-4 text-left"
    >
      <span>
        <span className="block text-[13.5px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[12px] text-dim">{description}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "accent-gradient-bg shadow-glow-sm" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-all duration-200 ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
