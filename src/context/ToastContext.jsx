import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Check, Info, X, AlertTriangle, Heart } from "lucide-react";
import { uid } from "../utils/misc";

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const ICONS = {
  success: Check,
  error: X,
  info: Info,
  favorite: Heart,
  warning: AlertTriangle,
};

const TINT = {
  success: "rgb(16 185 129)",
  error: "rgb(244 63 94)",
  info: "rgb(139 92 246)",
  favorite: "rgb(236 72 153)",
  warning: "rgb(249 115 22)",
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (message, type = "success", duration = 2800) => {
      const id = uid("toast");
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const api = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          const tint = TINT[t.type] || TINT.info;
          return (
            <div
              key={t.id}
              role="status"
              className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-surface/90 px-4 py-3 shadow-soft backdrop-blur-xl"
              style={{ boxShadow: `0 8px 30px rgba(0,0,0,0.4), 0 0 0 1px ${tint}33` }}
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${tint}22`, color: tint }}
              >
                <Icon size={16} strokeWidth={2.5} />
              </span>
              <p className="flex-1 text-[13px] font-medium leading-snug text-ink">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="rounded-full p-1 text-faint transition-colors hover:bg-white/10 hover:text-ink"
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
