import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import {
  addFavorite as addFavoriteDoc,
  removeFavorite as removeFavoriteDoc,
  subscribeFavorites,
} from '../services/favoritesService';

/**
 * Reusable favorites hook. Any page can call this to read the signed-in
 * user's favorites in real time and toggle them, without touching Firestore
 * directly. Guests who try to toggle a favorite are redirected to /login
 * and sent back to where they were once they sign in.
 */
export function useFavorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // null = "haven't received a snapshot yet", distinct from "loaded, and empty".
  const [favorites, setFavorites] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const unsubscribe = subscribeFavorites(
      user.uid,
      (items) => {
        setFavorites(items);
        setError('');
      },
      (err) => {
        console.error('Failed to load favorites:', err);
        setError('Unable to load your favorites right now.');
        setFavorites([]);
      }
    );

    return unsubscribe;
  }, [user]);

  const effectiveFavorites = useMemo(() => favorites ?? [], [favorites]);
  const effectiveLoading = Boolean(user) && favorites === null;

  const isFavorite = useCallback(
    (animeId) => effectiveFavorites.some((favorite) => favorite.animeId === animeId),
    [effectiveFavorites]
  );

  const toggleFavorite = useCallback(
    async (anime) => {
      if (!user) {
        navigate('/login', { state: { from: location } });
        return;
      }

      try {
        if (isFavorite(anime.animeId)) {
          await removeFavoriteDoc(user.uid, anime.animeId);
        } else {
          await addFavoriteDoc(user.uid, anime);
        }
      } catch (err) {
        console.error('Failed to update favorite:', err);
        setError('Unable to update your favorites right now.');
      }
    },
    [user, isFavorite, navigate, location]
  );

  return { favorites: effectiveFavorites, loading: effectiveLoading, error, isFavorite, toggleFavorite };
}
