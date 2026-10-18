import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import AnimeGrid from '../components/AnimeGrid';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { toFavoriteCardData } from '../services/favoritesService';

function FavoritesPage() {
  const { user } = useAuth();
  const { favorites, loading, error, isFavorite, toggleFavorite } = useFavorites();

  const items = useMemo(() => favorites.map(toFavoriteCardData), [favorites]);

  return (
    <section className="page-section">
      <div className="page-section__header">
        <h1>Your favorites</h1>
        <p>Anime saved to {user?.email || 'your account'}.</p>
      </div>

      <AnimeGrid
        items={items}
        loading={loading}
        loadingLabel="Loading your favorites..."
        error={error}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        emptyState={
          <EmptyState
            icon="💫"
            title="No favorites yet"
            message={
              <>
                You haven&apos;t saved any favorites yet. Head over to <Link to="/search">Search</Link> to find
                something to add.
              </>
            }
          />
        }
      />
    </section>
  );
}

export default FavoritesPage;
