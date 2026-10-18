import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AppShell from "../layouts/AppShell.jsx";
import LandingPage from "../pages/LandingPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import LearningPathPage from "../pages/LearningPathPage.jsx";
import LevelPage from "../pages/LevelPage.jsx";
import ModulePage from "../pages/ModulePage.jsx";
import LessonReaderPage from "../pages/LessonReaderPage.jsx";
import QuizPage from "../pages/QuizPage.jsx";
import ExercisesPage from "../pages/ExercisesPage.jsx";
import ProjectsPage from "../pages/ProjectsPage.jsx";
import LibraryPage from "../pages/LibraryPage.jsx";
import BookmarksPage from "../pages/BookmarksPage.jsx";
import SearchPage from "../pages/SearchPage.jsx";
import SkillTreePage from "../pages/SkillTreePage.jsx";
import AchievementsPage from "../pages/AchievementsPage.jsx";
import CertificatePage from "../pages/CertificatePage.jsx";
import ProfilePage from "../pages/ProfilePage.jsx";
import SettingsPage from "../pages/SettingsPage.jsx";
import AdminDashboardPage from "../pages/AdminDashboardPage.jsx";

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/learning-path" element={<LearningPathPage />} />
        <Route path="/levels/:levelId" element={<LevelPage />} />
        <Route path="/modules/:moduleId" element={<ModulePage />} />
        <Route path="/lessons/:slug" element={<LessonReaderPage />} />
        <Route path="/quiz/:scope/:id" element={<QuizPage />} />
        <Route path="/exercises" element={<ExercisesPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/skill-tree" element={<SkillTreePage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="/certificate" element={<CertificatePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin" element={<AdminOnly><AdminDashboardPage /></AdminOnly>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
