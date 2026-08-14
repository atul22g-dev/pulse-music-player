import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import { PageLoader } from "./components/Skeleton";

const HomePage = lazy(() => import("./pages/HomePage"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const PlaylistPage = lazy(() => import("./pages/PlaylistPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const RecentlyPlayedPage = lazy(() => import("./pages/RecentlyPlayedPage"));
const ArtistsPage = lazy(() => import("./pages/ArtistsPage"));
const AlbumsPage = lazy(() => import("./pages/AlbumsPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NowPlayingPage = lazy(() => import("./pages/NowPlayingPage"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/playlist" element={<PlaylistPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/recently-played" element={<RecentlyPlayedPage />} />
            <Route path="/artists" element={<ArtistsPage />} />
            <Route path="/artists/:name" element={<ArtistsPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/albums/:name" element={<AlbumsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/now-playing" element={<NowPlayingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
