import { memo } from 'react';
import { Link } from 'react-router-dom';
import './AnimeCard.css';

// Self-contained fallback poster (no third-party dependency). via.placeholder.com,
// previously used here, has become unreliable, so this avoids broken images
// in production when an anime has no poster.
const FALLBACK_POSTER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="430" viewBox="0 0 300 430">' +
      '<rect width="300" height="430" fill="#1e293b"/>' +
      '<text x="50%" y="50%" fill="#94a3b8" font-family="sans-serif" font-size="20" ' +
      'text-anchor="middle" dominant-baseline="middle">AnimeVerse</text>' +
      '</svg>'
  );

function AnimeCard({ id, title, image, score, episodes, status, isFavorite = false, favoritePayload, onToggleFavorite }) {
  const handleFavoriteClick = (event) => {
    // The card itself links to the details page, so the favorite button
    // needs to stop that click from also triggering navigation.
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite?.(favoritePayload);
  };

  return (
    <Link to={`/anime/${id}`} className="anime-card">
      <div className="anime-card__image-wrap">
        <img className="anime-card__image" src={image || FALLBACK_POSTER} alt={title} loading="lazy" />
        <button
          className="anime-card__favorite"
          type="button"
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`}
          aria-pressed={isFavorite}
        >
          {isFavorite ? '♥' : '♡'}
        </button>
      </div>

      <div className="anime-card__content">
        <h3 className="anime-card__title">{title}</h3>
        <div className="anime-card__meta">
          <span>⭐ {score}</span>
          <span>EP {episodes}</span>
        </div>
        <p className="anime-card__status">{status}</p>
      </div>
    </Link>
  );
}

export default memo(AnimeCard);
