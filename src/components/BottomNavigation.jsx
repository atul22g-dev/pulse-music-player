import { NavLink } from "react-router-dom";
import { Home, Compass, ListMusic, Heart, Settings } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/playlist", label: "Playlist", icon: ListMusic },
  { to: "/favorites", label: "Favorites", icon: Heart },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function BottomNavigation() {
  return (
    <nav
      aria-label="Bottom navigation"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-base/90 backdrop-blur-2xl md:hidden"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-1 py-2.5 pt-3 text-[10px] font-semibold transition-colors ${
                isActive ? "text-accent" : "text-faint hover:text-ink"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span className="absolute top-0 h-[2.5px] w-8 rounded-b-full bg-accent shadow-glow-sm" />}
                <Icon size={20} strokeWidth={isActive ? 2.25 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
