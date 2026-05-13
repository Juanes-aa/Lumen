import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LoadingScreen from "./components/LoadingScreen";
import { useInitAuth } from "./hooks/useInitAuth";

const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const MovieDetailPage = lazy(() => import("./pages/MovieDetailPage"));
const LibraryPage = lazy(() => import("./pages/LibraryPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const SessionDetailPage = lazy(() => import("./pages/SessionDetailPage"));
const AnalysisChatPage = lazy(() => import("./pages/AnalysisChatPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const RecommendationsPage = lazy(() => import("./pages/RecommendationsPage"));

function AppRoutes() {
  const { isReady } = useInitAuth();

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/movie/:id" element={<MovieDetailPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:sessionId" element={<SessionDetailPage />} />
            <Route path="/analysis/:sessionId" element={<AnalysisChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
