import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Spinner from './components/Spinner';
import { AuthProvider } from './context/AuthContext';

// Route-level code splitting: each page becomes its own chunk, loaded only
// when the user actually navigates there, instead of all pages shipping in
// the initial bundle.
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const AnimeDetailsPage = lazy(() => import('./pages/AnimeDetailsPage'));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function AppNav() {
  return (
    <div>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <Navbar />

      <main id="main-content" className="app-shell" tabIndex={-1}>
        <Suspense fallback={<Spinner label="Loading page..." />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/anime/:id" element={<AnimeDetailsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/favorites" element={<FavoritesPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppNav />
    </AuthProvider>
  );
}

export default App;
