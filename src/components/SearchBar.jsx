import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Slash } from "lucide-react";

export default function SearchBar({ className = "", autoFocus = false }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    if (!autoFocus) setQuery("");
  };

  return (
    <form role="search" onSubmit={submit} className={`relative ${className}`}>
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
      <input
        type="search"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs, artists, albums…"
        aria-label="Search"
        className="h-10 w-full rounded-full border border-white/10 bg-white/[0.05] pl-10 pr-9 text-[13px] text-ink placeholder:text-faint outline-none backdrop-blur-xl transition-[border-color,background-color,box-shadow] duration-200 focus:border-accent/40 focus:bg-white/[0.08] focus:shadow-glow-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setQuery("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-faint hover:bg-white/10 hover:text-ink"
        >
          <X size={14} />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-faint md:flex">
          <Slash size={10} /> Enter
        </kbd>
      )}
    </form>
  );
}
