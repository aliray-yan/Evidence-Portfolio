import AnimeCard from './AnimeCard';
import Spinner from './Spinner';
import ErrorState from './ErrorState';

/**
 * Renders a grid of normalized anime card data ({ id, title, image, score,
 * episodes, status, favoritePayload }), with consistent loading/error/empty
 * handling. Home, Search, and Favorites all render a results grid with the
 * same states — this component is the single place that logic lives.
 */
function AnimeGrid({ items, loading, loadingLabel, error, emptyState, isFavorite, onToggleFavorite }) {
  if (loading) {
    return <Spinner label={loadingLabel} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (items.length === 0) {
    return emptyState ?? null;
  }

  return (
    <div className="anime-grid">
      {items.map((item) => (
        <AnimeCard
          key={item.id}
          id={item.id}
          title={item.title}
          image={item.image}
          score={item.score}
          episodes={item.episodes}
          status={item.status}
          isFavorite={isFavorite(item.id)}
          favoritePayload={item.favoritePayload}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

export default AnimeGrid;
