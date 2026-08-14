import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MiniPlayer from "../components/MiniPlayer";
import BottomNavigation from "../components/BottomNavigation";
import QueueDrawer from "../components/QueueDrawer";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isNowPlaying = location.pathname === "/now-playing";

  return (
    <div className="min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-[264px]">
        <Header onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-40 pt-6 sm:px-6 lg:pb-32">
          <Outlet />
        </main>

        {!isNowPlaying && (
          <div className="fixed inset-x-0 bottom-0 z-40 lg:left-[264px]">
            <MiniPlayer />
            <BottomNavigation />
          </div>
        )}
      </div>

      <QueueDrawer />
    </div>
  );
}
