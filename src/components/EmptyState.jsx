import { Link } from "react-router-dom";

export default function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className = "",
}) {
  return (
    <div className={`animate-scale-in flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center ${className}`}>
      <div className="relative mb-5">
        <div className="absolute inset-0 -m-4 rounded-full bg-accent/20 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-surface shadow-soft">
          <Icon className="text-accent" size={28} strokeWidth={1.75} />
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="prose-dim mt-2 max-w-sm">{message}</p>
      {action && (
        <div className="mt-6">
          {action.to ? (
            <Link to={action.to} className="btn-primary">
              {action.icon && <action.icon size={16} />}
              {action.label}
            </Link>
          ) : (
            <button type="button" onClick={action.onClick} className="btn-primary">
              {action.icon && <action.icon size={16} />}
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
