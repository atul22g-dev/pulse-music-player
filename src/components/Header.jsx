import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Bell, Settings, Search } from "lucide-react";
import SearchBar from "./SearchBar";
import { usePlayer } from "../context/PlayerContext";
import { initials } from "../utils/format";

export default function Header({ onOpenSidebar }) {
  const { settings } = usePlayer();
  const navigate = useNavigate();
  const [mobileSearch, setMobileSearch] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.05] bg-base/70 backdrop-blur-2xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open navigation"
          className="btn-icon lg:hidden"
        >
          <Menu size={20} />
        </button>

        <div className={`${mobileSearch ? "flex" : "hidden"} min-w-0 flex-1 md:flex`}>
          <SearchBar className="mx-auto w-full max-w-xl" />
        </div>

        <button
          type="button"
          onClick={() => setMobileSearch((s) => !s)}
          aria-label="Toggle search"
          aria-expanded={mobileSearch}
          className="btn-icon md:hidden"
        >
          <Search size={19} />
        </button>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Notifications — no new notifications"
            className="btn-icon relative"
          >
            <Bell size={18} />
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-accent shadow-glow-sm" />
          </button>
          <Link to="/settings" aria-label="Settings" className="btn-icon">
            <Settings size={18} />
          </Link>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label="Profile"
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-bold text-accent-ink shadow-glow-sm transition-transform duration-200 hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-strong)))" }}
          >
            {initials(settings.username || "Pulse")}
          </button>
        </div>
      </div>
    </header>
  );
}
