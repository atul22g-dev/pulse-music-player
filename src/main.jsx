import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ToastProvider } from "./context/ToastContext";
import { PlayerProvider } from "./context/PlayerContext";
import "./index.css";

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
