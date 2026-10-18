import { useMemo, useRef, useState } from 'react';
import AnimeGrid from '../components/AnimeGrid';
import EmptyState from '../components/EmptyState';
import { searchAnime, getAnimeErrorMessage, toAnimeCardData } from '../services/animeService';
import { useFavorites } from '../hooks/useFavorites';
import './SearchPage.css';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchedQuery, setSearchedQuery] = useState('');
  const { isFavorite, toggleFavorite } = useFavorites();

  // Guards against out-of-order responses: if a slower earlier search
  // resolves after a newer one has already started, its result is discarded
  // instead of silently overwriting the newer, correct results.
  const requestIdRef = useRef(0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const data = await searchAnime(trimmed);
      if (requestId === requestIdRef.current) {
        setResults(data.data || []);
        setSearchedQuery(trimmed);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        console.error('Anime search failed:', err);
        setError(getAnimeErrorMessage(err));
        setResults([]);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const items = useMemo(() => results.map(toAnimeCardData), [results]);

  return (
    <section className="page-section">
      <div className="page-section__header">
        <h1>Search anime</h1>
        <p>Find a title by name across the entire Jikan catalog.</p>
      </div>

      <form className="search-form" onSubmit={handleSubmit}>
        <label htmlFor="anime-search-input" className="sr-only">
          Search anime by title
        </label>
        <input
          id="anime-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for an anime..."
        />
        <button type="submit">Search</button>
      </form>

      <AnimeGrid
        items={items}
        loading={loading}
        loadingLabel="Loading anime results..."
        error={error}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        emptyState={
          searchedQuery ? (
            <EmptyState icon="🔍" title="No results" message={`No anime found for "${searchedQuery}".`} />
          ) : null
        }
      />
    </section>
  );
}

export default SearchPage;
