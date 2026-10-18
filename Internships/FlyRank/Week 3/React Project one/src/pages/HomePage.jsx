import { useEffect, useMemo, useState } from 'react';
import AnimeGrid from '../components/AnimeGrid';
import EmptyState from '../components/EmptyState';
import { getTopAnime, getAnimeErrorMessage, toAnimeCardData } from '../services/animeService';
import { useFavorites } from '../hooks/useFavorites';

function HomePage() {
  const [animeList, setAnimeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    let isMounted = true;

    const fetchTopAnime = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getTopAnime();
        if (isMounted) {
          setAnimeList(data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load top anime:', err);
          setError(getAnimeErrorMessage(err));
          setAnimeList([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTopAnime();

    return () => {
      isMounted = false;
    };
  }, []);

  // Memoized so the mapped array (and each item within it) only gets a new
  // reference when the underlying anime list actually changes — this is
  // what lets the memoized AnimeCard below skip re-rendering unaffected cards.
  const items = useMemo(() => animeList.map(toAnimeCardData), [animeList]);

  return (
    <section className="page-section">
      <div className="page-section__header">
        <h1>Discover your next obsession</h1>
        <p>Browse the latest anime picks in a sleek, modern experience.</p>
      </div>

      <AnimeGrid
        items={items}
        loading={loading}
        loadingLabel="Loading anime results..."
        error={error}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        emptyState={
          <EmptyState icon="📭" title="Nothing to show yet" message="We couldn't find any anime to display right now." />
        }
      />
    </section>
  );
}

export default HomePage;
