import axios from 'axios';

const api = axios.create({
  baseURL: 'https://api.jikan.moe/v4',
  timeout: 15000,
});

// Jikan enforces a strict rate limit (~3 requests/second, 60/minute) and,
// being a free community-run service, occasionally answers with a gateway
// timeout (502/503/504) under load. A couple of short retries clears the
// vast majority of these without the user noticing.
const RETRYABLE_STATUSES = [429, 502, 503, 504];

const getWithRetry = async (url, config = {}, retries = 2) => {
  try {
    const response = await api.get(url, config);
    return response.data;
  } catch (error) {
    if (retries > 0 && RETRYABLE_STATUSES.includes(error.response?.status)) {
      const attempt = 3 - retries; // 0-indexed attempt number for backoff
      await new Promise((resolve) => setTimeout(resolve, 800 + attempt * 700));
      return getWithRetry(url, config, retries - 1);
    }
    throw error;
  }
};

export const searchAnime = async (query, page = 1) => {
  return getWithRetry('/anime', {
    params: {
      q: query,
      page,
    },
  });
};

export const getAnimeDetails = async (id) => {
  return getWithRetry(`/anime/${id}`);
};

export const getAnimeCharacters = async (id) => {
  return getWithRetry(`/anime/${id}/characters`);
};

export const getTopAnime = async (page = 1) => {
  return getWithRetry('/top/anime', {
    params: { page },
  });
};

export const getSeasonalAnime = async (year, season) => {
  return getWithRetry(`/seasons/${year}/${season}`);
};

// Turns an Axios error into a message that actually tells you what happened,
// instead of a generic "something went wrong" for every failure mode.
export const getAnimeErrorMessage = (error) => {
  if (error.response) {
    if (error.response.status === 429) {
      return 'Jikan is rate-limiting requests right now. Please wait a few seconds and try again.';
    }
    if (error.response.status === 404) {
      return 'No matching anime was found.';
    }
    if ([502, 503, 504].includes(error.response.status)) {
      return "Jikan's server timed out responding (a known hiccup with this free API). Please try again in a moment.";
    }
    return `The anime service responded with an error (status ${error.response.status}). Please try again shortly.`;
  }

  if (error.request) {
    return 'Could not reach the anime service. Check your internet connection, or the Jikan API/MyAnimeList may be blocked or unreachable on this network.';
  }

  return 'Something went wrong while loading anime data.';
};

/**
 * Maps a raw Jikan anime object to the normalized shape AnimeGrid/AnimeCard
 * expect, including the favorite payload each card needs to toggle itself.
 * Centralizing this avoids repeating the same mapping in every page that
 * renders a grid of Jikan results (Home, Search).
 */
export const toAnimeCardData = (anime) => ({
  id: anime.mal_id,
  title: anime.title,
  image: anime.images?.jpg?.image_url,
  score: anime.score ? anime.score.toString() : 'N/A',
  episodes: anime.episodes ? anime.episodes.toString() : 'N/A',
  status: anime.status,
  favoritePayload: {
    animeId: anime.mal_id,
    title: anime.title,
    image: anime.images?.jpg?.image_url,
    score: anime.score ?? null,
  },
});
