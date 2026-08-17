import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "./context/ToastContext";
import { PlayerProvider } from "./context/PlayerContext";
import "./index.css";

// Register the service worker only in production builds — in dev it would
// cache hot-reloaded assets and confuse things. It makes the app installable
// and offline-capable, which is what enables background playback on mobile.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        /* offline / unsupported — the app still works */
      });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
