import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Each user's favorites live at users/{uid}/favorites/{animeId}, so lookups,
// writes, and security rules can all scope naturally to the signed-in user.
const favoritesCollection = (uid) => collection(db, 'users', uid, 'favorites');
const favoriteDoc = (uid, animeId) => doc(db, 'users', uid, 'favorites', String(animeId));

/**
 * Subscribes to real-time updates for a user's favorites, newest first.
 * Returns an unsubscribe function (safe to call from a useEffect cleanup).
 */
export const subscribeFavorites = (uid, onData, onError) => {
  const favoritesQuery = query(favoritesCollection(uid), orderBy('timestamp', 'desc'));

  return onSnapshot(
    favoritesQuery,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      onData(items);
    },
    onError
  );
};

/**
 * Saves an anime to a user's favorites. anime should be
 * { animeId, title, image, score }.
 */
export const addFavorite = async (uid, anime) => {
  await setDoc(favoriteDoc(uid, anime.animeId), {
    animeId: anime.animeId,
    title: anime.title,
    image: anime.image || null,
    score: anime.score ?? null,
    timestamp: serverTimestamp(),
  });
};

export const removeFavorite = async (uid, animeId) => {
  await deleteDoc(favoriteDoc(uid, animeId));
};

/**
 * Maps a stored favorite document to the same normalized card shape
 * toAnimeCardData produces for Jikan results, so FavoritesPage can reuse
 * the shared AnimeGrid component like every other results page.
 */
export const toFavoriteCardData = (favorite) => ({
  id: favorite.animeId,
  title: favorite.title,
  image: favorite.image,
  score: favorite.score ? favorite.score.toString() : 'N/A',
  episodes: '—',
  status: 'Saved',
  favoritePayload: favorite,
});
