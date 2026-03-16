import { GiphyFetch } from "@giphy/js-fetch-api";
import type { IGif } from "@giphy/js-types";

export type GifOption = {
  id: string;
  title: string;
  alt: string;
  url: string;
  previewUrl: string;
  stillUrl: string;
};

const DEFAULT_GIPHY_API_KEY = "29OYHAN3zAHeLHolt92JHSPHhtuXoUGd";
const GIPHY_RESULTS_LIMIT = 18;
const GIPHY_RELATED_LIMIT = 9;
const GIPHY_RATING = "pg-13" as const;

export const giphyFetch = new GiphyFetch(process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? DEFAULT_GIPHY_API_KEY);

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (value) {
      return value;
    }
  }

  return "";
}

function normalizeTitle(gif: IGif): string {
  const preferred = gif.alt_text?.trim() || gif.title?.trim();
  if (!preferred) {
    return "GIF";
  }

  const trimmed = preferred.replace(/\s+GIF(?:\s+by.*)?$/i, "").trim();
  return trimmed || "GIF";
}

export function toGifOption(gif: IGif): GifOption {
  const url = firstNonEmpty(
    gif.images.original.url,
    gif.images.fixed_height.url,
    gif.images.fixed_width.url,
    gif.url
  );
  const previewUrl = firstNonEmpty(
    gif.images.fixed_height.webp,
    gif.images.fixed_width.webp,
    gif.images.fixed_height.url,
    gif.images.fixed_width.url,
    gif.images.downsized_medium.url,
    url
  );
  const stillUrl = firstNonEmpty(
    gif.images.fixed_height_still.url,
    gif.images.fixed_width_still.url,
    gif.images.original_still.url,
    previewUrl
  );
  const title = normalizeTitle(gif);

  return {
    id: String(gif.id),
    title,
    alt: gif.alt_text?.trim() || title,
    url,
    previewUrl,
    stillUrl
  };
}

function normalizeGifList(gifs: IGif[]): GifOption[] {
  return gifs
    .map(toGifOption)
    .filter((gif) => gif.id && gif.url && gif.previewUrl);
}

export async function fetchTrendingGifs(limit = GIPHY_RESULTS_LIMIT): Promise<GifOption[]> {
  const { data } = await giphyFetch.trending({
    type: "gifs",
    rating: GIPHY_RATING,
    limit
  });

  return normalizeGifList(data);
}

export async function searchGifs(query: string, limit = GIPHY_RESULTS_LIMIT): Promise<GifOption[]> {
  const { data } = await giphyFetch.search(query, {
    type: "gifs",
    rating: GIPHY_RATING,
    sort: "relevant",
    limit
  });

  return normalizeGifList(data);
}

export async function fetchRelatedGifs(gifId: string, limit = GIPHY_RELATED_LIMIT): Promise<GifOption[]> {
  const { data } = await giphyFetch.related(gifId, {
    type: "gifs",
    rating: GIPHY_RATING,
    limit
  });

  return normalizeGifList(data).filter((gif) => gif.id !== gifId);
}
