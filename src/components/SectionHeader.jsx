import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function SectionHeader({ title, subtitle, to, actionLabel = "See all", className = "" }) {
  return (
    <div className={`flex items-end justify-between gap-4 ${className}`}>
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">{title}</h2>
        {subtitle && <p className="prose-dim mt-1">{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="group inline-flex items-center gap-1 text-[13px] font-medium text-dim transition-colors hover:text-accent"
        >
          {actionLabel}
          <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
