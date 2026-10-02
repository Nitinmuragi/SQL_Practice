import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts
import { AppLayout } from './layouts/AppLayout';
import { AuthLayout } from './layouts/AuthLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { SqlPracticePage } from './pages/SqlPracticePage';
import { DatabasesPage } from './pages/DatabasesPage';
import { DatabaseDetailPage } from './pages/DatabaseDetailPage';
import { HistoryPage } from './pages/HistoryPage';
import { SqlErrorGuidePage } from './pages/SqlErrorGuidePage';
import { ChallengesPage } from './pages/ChallengesPage';
import { CheatSheetPage } from './pages/CheatSheetPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AssessmentPage } from './pages/AssessmentPage';
import { AdminChallengesPage } from './pages/AdminChallengesPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ContestsPage } from './pages/ContestsPage';
import { ContestArenaPage } from './pages/ContestArenaPage';
import { ContestLeaderboardPage } from './pages/ContestLeaderboardPage';
import { AdminContestsPage } from './pages/AdminContestsPage';
import { useAuth } from './hooks/useAuth';
import { LoadingSpinner } from './components/LoadingSpinner';

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Verifying administrative access..." />
      </div>
    );
  }
  if (!isAuthenticated || !user?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Auth Layout for login / register / admin login */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
            </Route>

            {/* Protected App Layout */}
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/sql-practice" element={<SqlPracticePage />} />
              <Route path="/challenges" element={<ChallengesPage />} />
              <Route path="/assessment" element={<AssessmentPage />} />
              <Route path="/cheatsheet" element={<CheatSheetPage />} />
              <Route path="/databases" element={<DatabasesPage />} />
              <Route path="/databases/:id" element={<DatabaseDetailPage />} />
              <Route path="/error-guide" element={<SqlErrorGuidePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/contests" element={<ContestsPage />} />
              <Route path="/contests/:id" element={<ContestLeaderboardPage />} />
              <Route path="/contests/:id/arena" element={<ContestArenaPage />} />
              <Route path="/contests/:id/leaderboard" element={<ContestLeaderboardPage />} />
              <Route
                path="/admin/contests"
                element={
                  <AdminRoute>
                    <AdminContestsPage />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/challenges"
                element={
                  <AdminRoute>
                    <AdminChallengesPage initialTab="challenges" />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/assessments"
                element={
                  <AdminRoute>
                    <AdminChallengesPage initialTab="assessments" />
                  </AdminRoute>
                }
              />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
