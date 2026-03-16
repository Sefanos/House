"use client";

import type { GifOption } from "@/lib/giphy";

const GIF_FAVORITES_STORAGE_KEY = "houseplan.gif-favorites.v1";
const MAX_GIF_FAVORITES = 24;

export type GifFavorite = GifOption;

export function readGifFavorites(): GifFavorite[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(GIF_FAVORITES_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isGifFavorite);
  } catch {
    return [];
  }
}

export function writeGifFavorites(favorites: GifFavorite[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    GIF_FAVORITES_STORAGE_KEY,
    JSON.stringify(favorites.slice(0, MAX_GIF_FAVORITES))
  );
}

export function toggleGifFavorite(favorites: GifFavorite[], gif: GifFavorite): GifFavorite[] {
  const exists = favorites.some((favorite) => favorite.id === gif.id);
  const nextFavorites = exists
    ? favorites.filter((favorite) => favorite.id !== gif.id)
    : [gif, ...favorites.filter((favorite) => favorite.id !== gif.id)].slice(0, MAX_GIF_FAVORITES);

  writeGifFavorites(nextFavorites);
  return nextFavorites;
}

function isGifFavorite(value: unknown): value is GifFavorite {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<GifFavorite>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.alt === "string" &&
    typeof candidate.url === "string" &&
    typeof candidate.previewUrl === "string" &&
    typeof candidate.stillUrl === "string"
  );
}
