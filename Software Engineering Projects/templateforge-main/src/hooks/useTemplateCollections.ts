"use client";

import { useEffect, useMemo, useState } from "react";

const FAVORITES_KEY = "templateforge-favorite-templates";
const COMPARE_KEY = "templateforge-compare-templates";
const maxCompare = 3;

function readIds(key: string) {
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: string[]) {
  window.localStorage.setItem(key, JSON.stringify(ids));
}

export function useTemplateCollections() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteIds(readIds(FAVORITES_KEY));
    setCompareIds(readIds(COMPARE_KEY));
  }, []);

  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const compareSet = useMemo(() => new Set(compareIds), [compareIds]);

  function toggleFavorite(id: string) {
    setFavoriteIds((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [id, ...current];
      writeIds(FAVORITES_KEY, next);
      return next;
    });
  }

  function toggleCompare(id: string) {
    setCompareIds((current) => {
      const next = current.includes(id) ? current.filter((entry) => entry !== id) : [id, ...current].slice(0, maxCompare);
      writeIds(COMPARE_KEY, next);
      return next;
    });
  }

  function clearCompare() {
    setCompareIds([]);
    writeIds(COMPARE_KEY, []);
  }

  return { favoriteIds, compareIds, favoriteSet, compareSet, toggleFavorite, toggleCompare, clearCompare, maxCompare };
}
