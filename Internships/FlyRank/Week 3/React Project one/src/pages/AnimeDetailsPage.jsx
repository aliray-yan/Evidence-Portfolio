import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAnimeDetails, getAnimeCharacters, getAnimeErrorMessage, toAnimeCardData } from '../services/animeService';
import { useFavorites } from '../hooks/useFavorites';
import Spinner from '../components/Spinner';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import './AnimeDetailsPage.css';

function AnimeDetailsPage() {
  const { id } = useParams();
  const [anime, setAnime] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isFavorite, toggleFavorite } = useFavorites();

  // Reuses the same favoritePayload shape toAnimeCardData produces for grid
  // cards, instead of re-building the object by hand here too.
  const favoritePayload = useMemo(() => (anime ? toAnimeCardData(anime).favoritePayload : null), [anime]);

  useEffect(() => {
    let isMounted = true;

    const fetchDetails = async () => {
      setLoading(true);
      setError('');

      try {
        // Characters are a "nice to have" on this page, so a hiccup on that
        // endpoint shouldn't take down the whole page — only the main
        // /anime/:id call is treated as critical.
        const [detailsResult, charactersResult] = await Promise.all([
          getAnimeDetails(id),
          getAnimeCharacters(id).catch(() => ({ data: [] })),
        ]);

        if (isMounted) {
          setAnime(detailsResult.data);
          setCharacters(charactersResult.data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load anime details:', err);
          setError(getAnimeErrorMessage(err));
          setAnime(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetails();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <section className="page-section">
        <Spinner label="Loading anime details..." />
      </section>
    );
  }

  if (error || !anime) {
    return (
      <section className="page-section">
        <ErrorState message={error || 'Anime details are unavailable.'} />
        <Link to="/search" className="details-back-link">
          ← Back to search
        </Link>
      </section>
    );
  }

  const genres = anime.genres?.length ? anime.genres.map((genre) => genre.name).join(', ') : 'N/A';
  const studios = anime.studios?.length ? anime.studios.map((studio) => studio.name).join(', ') : 'N/A';
  const poster = anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url;

  return (
    <section className="page-section anime-details">
      <Link to="/search" className="details-back-link">
        ← Back to search
      </Link>

      <div className="anime-details__hero">
        <img className="anime-details__poster" src={poster} alt={anime.title} />

        <div className="anime-details__info">
          <h1>{anime.title}</h1>
          {anime.title_english && anime.title_english !== anime.title ? (
            <p className="anime-details__subtitle">{anime.title_english}</p>
          ) : null}

          <div className="anime-details__stats">
            <span className="stat-pill">⭐ {anime.score ?? 'N/A'}</span>
            <span className="stat-pill">EP {anime.episodes ?? 'N/A'}</span>
            <span className="stat-pill">{anime.status || 'Unknown status'}</span>
            {anime.rank ? <span className="stat-pill">Rank #{anime.rank}</span> : null}
          </div>

          <button
            type="button"
            className="anime-details__favorite-btn"
            onClick={() => toggleFavorite(favoritePayload)}
            aria-pressed={isFavorite(anime.mal_id)}
          >
            {isFavorite(anime.mal_id) ? '♥ In your favorites' : '♡ Add to favorites'}
          </button>

          <div className="anime-details__tags">
            <p>
              <strong>Genres:</strong> {genres}
            </p>
            <p>
              <strong>Studios:</strong> {studios}
            </p>
          </div>

          <p className="anime-details__synopsis">{anime.synopsis || 'No synopsis available.'}</p>
        </div>
      </div>

      <div className="anime-details__section">
        <h2>Trailer</h2>
        {anime.trailer?.embed_url ? (
          <div className="anime-details__trailer-frame">
            <iframe
              src={anime.trailer.embed_url}
              title={`${anime.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <EmptyState icon="🎬" title="No trailer" message="No trailer available for this title." />
        )}
      </div>

      <div className="anime-details__section">
        <h2>Characters</h2>
        {characters.length ? (
          <div className="characters-grid">
            {characters.slice(0, 12).map((entry) => (
              <div className="character-card" key={entry.character.mal_id}>
                <img src={entry.character.images?.jpg?.image_url} alt={entry.character.name} loading="lazy" />
                <p className="character-card__name">{entry.character.name}</p>
                <p className="character-card__role">{entry.role}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon="🎭" title="No characters found" message="Character data isn't available for this title." />
        )}
      </div>
    </section>
  );
}

export default AnimeDetailsPage;
