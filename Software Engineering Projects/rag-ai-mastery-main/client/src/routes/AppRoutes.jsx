import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "../layouts/AppLayout.jsx";
import AdminContentPage from "../pages/AdminContentPage.jsx";
import AdminDashboardPage from "../pages/AdminDashboardPage.jsx";
import CertificatePage from "../pages/CertificatePage.jsx";
import CodeLabsPage from "../pages/CodeLabsPage.jsx";
import DashboardPage from "../pages/DashboardPage.jsx";
import EvaluationPage from "../pages/EvaluationPage.jsx";
import ExercisesPage from "../pages/ExercisesPage.jsx";
import LandingPage from "../pages/LandingPage.jsx";
import LearningPathPage from "../pages/LearningPathPage.jsx";
import LessonPage from "../pages/LessonPage.jsx";
import LevelPage from "../pages/LevelPage.jsx";
import LoginPage from "../pages/LoginPage.jsx";
import PlaygroundPage from "../pages/PlaygroundPage.jsx";
import ProjectsPage from "../pages/ProjectsPage.jsx";
import RegisterPage from "../pages/RegisterPage.jsx";
import SearchPage from "../pages/SearchPage.jsx";
import ToolsPage from "../pages/ToolsPage.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import StandaloneDashboardPage from "../pages/StandaloneDashboardPage.jsx";

export default function AppRoutes() {
  const standaloneMode = import.meta.env.VITE_STANDALONE_MODE === "true";

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={standaloneMode ? <StandaloneDashboardPage /> : <DashboardPage />} />
        <Route path="learning-path" element={<LearningPathPage />} />
        <Route path="levels/:levelId" element={<LevelPage />} />
        <Route path="lessons/:slug" element={<LessonPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="code-labs" element={<CodeLabsPage />} />
        <Route path="exercises" element={<ExercisesPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="playground" element={<PlaygroundPage />} />
        <Route path="evaluation" element={<EvaluationPage />} />
        <Route path="certificate" element={<CertificatePage />} />
        <Route
          path="admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/content"
          element={
            <ProtectedRoute adminOnly>
              <AdminContentPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
