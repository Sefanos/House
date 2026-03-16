"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { type GifOption, fetchRelatedGifs, fetchTrendingGifs, searchGifs } from "@/lib/giphy";
import { readGifFavorites, toggleGifFavorite, type GifFavorite } from "./gifFavorites";

type GifPickerProps = {
  isSending: boolean;
  tone?: "sky" | "rose";
  onSelect: (content: string) => Promise<void>;
};

type ToneStyles = {
  accentText: string;
  accentBorder: string;
  accentBackground: string;
  accentButton: string;
  hoverBorder: string;
};

const TONE_STYLES: Record<NonNullable<GifPickerProps["tone"]>, ToneStyles> = {
  sky: {
    accentText: "text-sky-200",
    accentBorder: "border-sky-400/40",
    accentBackground: "bg-sky-400/10",
    accentButton: "border-sky-500/30 text-sky-100 hover:bg-sky-400/10",
    hoverBorder: "hover:border-sky-400/30"
  },
  rose: {
    accentText: "text-rose-200",
    accentBorder: "border-rose-400/40",
    accentBackground: "bg-rose-400/10",
    accentButton: "border-rose-500/30 text-rose-100 hover:bg-rose-400/10",
    hoverBorder: "hover:border-rose-400/30"
  }
};

function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

function FavoriteIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path
        d="m12 3.8 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.5l5.4-.8L12 3.8Z"
        fill={filled ? "currentColor" : "none"}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z" strokeLinejoin="round" />
      <path d="m18 16 .8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16Z" strokeLinejoin="round" />
    </svg>
  );
}

function GifCard({
  gif,
  isActive,
  isFavorite,
  isSending,
  toneStyles,
  onSend,
  onShowRelated,
  onToggleFavorite
}: {
  gif: GifOption;
  isActive: boolean;
  isFavorite: boolean;
  isSending: boolean;
  toneStyles: ToneStyles;
  onSend: (gif: GifOption) => Promise<void>;
  onShowRelated: (gif: GifOption) => void;
  onToggleFavorite: (gif: GifOption) => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-left transition",
        toneStyles.hoverBorder,
        isActive && [toneStyles.accentBorder, toneStyles.accentBackground].join(" ")
      )}
    >
      <img src={gif.previewUrl} alt={gif.alt} className="h-32 w-full object-cover" loading="lazy" />
      <div className="space-y-3 px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100" title={gif.title}>
            {gif.title}
          </p>
          <button
            type="button"
            onClick={() => onToggleFavorite(gif)}
            aria-label={isFavorite ? "Remove GIF from favorites" : "Save GIF to favorites"}
            aria-pressed={isFavorite}
            className={cn(
              "rounded-full border border-slate-700 bg-slate-900/90 p-2 text-slate-300 transition hover:border-slate-500 hover:text-slate-50",
              isFavorite && [toneStyles.accentBorder, toneStyles.accentText].join(" ")
            )}
          >
            <FavoriteIcon filled={isFavorite} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSending}
            onClick={() => void onSend(gif)}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
          <button
            type="button"
            onClick={() => onShowRelated(gif)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border bg-slate-950 px-3 py-2 text-sm transition",
              toneStyles.accentButton
            )}
          >
            <SparkIcon />
            {isActive ? "Showing variations" : "Variations"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GifPicker({ isSending, tone = "sky", onSelect }: GifPickerProps) {
  const toneStyles = TONE_STYLES[tone];
  const requestIdRef = useRef(0);
  const relatedRequestIdRef = useRef(0);
  const [query, setQuery] = useState("");
  const [customGifUrl, setCustomGifUrl] = useState("");
  const [results, setResults] = useState<GifOption[]>([]);
  const [favorites, setFavorites] = useState<GifFavorite[]>([]);
  const [selectedGif, setSelectedGif] = useState<GifOption | null>(null);
  const [relatedGifs, setRelatedGifs] = useState<GifOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRelated, setIsLoadingRelated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim());

  const favoriteIds = useMemo(() => new Set(favorites.map((gif) => gif.id)), [favorites]);

  useEffect(() => {
    setFavorites(readGifFavorites());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);

    async function loadGifs() {
      try {
        const nextResults = deferredQuery ? await searchGifs(deferredQuery) : await fetchTrendingGifs();
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        startTransition(() => {
          setResults(nextResults);
          setSelectedGif((current) =>
            current ? nextResults.find((gif) => gif.id === current.id) ?? nextResults[0] ?? null : nextResults[0] ?? null
          );
          setError(null);
        });
      } catch (nextError) {
        if (cancelled || requestId !== requestIdRef.current) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Failed to load GIFs.");
        setResults([]);
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    void loadGifs();
    return () => {
      cancelled = true;
    };
  }, [deferredQuery]);

  useEffect(() => {
    if (!selectedGif) {
      setRelatedGifs([]);
      setRelatedError(null);
      return;
    }

    let cancelled = false;
    const requestId = relatedRequestIdRef.current + 1;
    relatedRequestIdRef.current = requestId;
    setIsLoadingRelated(true);
    const selectedGifId = selectedGif.id;

    async function loadRelated() {
      try {
        const nextRelated = await fetchRelatedGifs(selectedGifId);
        if (cancelled || requestId !== relatedRequestIdRef.current) {
          return;
        }

        startTransition(() => {
          setRelatedGifs(nextRelated);
          setRelatedError(null);
        });
      } catch (nextError) {
        if (cancelled || requestId !== relatedRequestIdRef.current) {
          return;
        }

        setRelatedError(nextError instanceof Error ? nextError.message : "Failed to load GIF variations.");
        setRelatedGifs([]);
      } finally {
        if (!cancelled && requestId === relatedRequestIdRef.current) {
          setIsLoadingRelated(false);
        }
      }
    }

    void loadRelated();
    return () => {
      cancelled = true;
    };
  }, [selectedGif]);

  function handleToggleFavorite(gif: GifOption) {
    setFavorites((current) => toggleGifFavorite(current, gif));
  }

  async function handleSendGif(gif: GifOption) {
    await onSelect(gif.url || gif.previewUrl);
  }

  async function handleSendCustomUrl() {
    const normalized = customGifUrl.trim();
    if (!normalized) {
      return;
    }

    await onSelect(normalized);
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-800 bg-slate-900/95 shadow-2xl shadow-black/35">
      <div className="grid gap-3 border-b border-slate-800/80 p-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
            }
          }}
          placeholder="Search GIPHY for reactions, moods, memes..."
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
        />
        <input
          value={customGifUrl}
          onChange={(event) => setCustomGifUrl(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            event.preventDefault();
            void handleSendCustomUrl();
          }}
          placeholder="Paste a GIF URL"
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
        />
        <button
          type="button"
          disabled={isSending}
          onClick={() => void handleSendCustomUrl()}
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send URL
        </button>
      </div>

      <div
        className="max-h-[min(68vh,38rem)] overflow-y-auto overscroll-contain p-3"
        onWheel={(event) => event.stopPropagation()}
      >
      {favorites.length > 0 ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Favorites</p>
            <p className="text-xs text-slate-500">{favorites.length} saved</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.slice(0, 6).map((gif) => (
              <GifCard
                key={`favorite-${gif.id}`}
                gif={gif}
                isActive={selectedGif?.id === gif.id}
                isFavorite
                isSending={isSending}
                toneStyles={toneStyles}
                onSend={handleSendGif}
                onShowRelated={setSelectedGif}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        </div>
      ) : null}

      {selectedGif ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Variations</p>
              <p className={cn("mt-1 text-sm", toneStyles.accentText)} title={selectedGif.title}>
                More like {selectedGif.title}
              </p>
            </div>
            {isLoadingRelated ? <p className="text-xs text-slate-500">Loading variations...</p> : null}
          </div>

          {relatedError ? <p className="text-sm text-rose-400">{relatedError}</p> : null}

          {relatedGifs.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {relatedGifs.map((gif) => (
                <GifCard
                  key={`related-${gif.id}`}
                  gif={gif}
                  isActive={selectedGif.id === gif.id}
                  isFavorite={favoriteIds.has(gif.id)}
                  isSending={isSending}
                  toneStyles={toneStyles}
                  onSend={handleSendGif}
                  onShowRelated={setSelectedGif}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : !isLoadingRelated && !relatedError ? (
            <p className="text-sm text-slate-400">Pick another GIF to explore a different variation set.</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {deferredQuery ? "Search Results" : "Trending on GIPHY"}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {deferredQuery ? `Results for "${deferredQuery}"` : "Live results instead of a fixed preset list"}
          </p>
        </div>
        {isLoading ? <p className="text-xs text-slate-500">Loading GIFs...</p> : null}
      </div>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      {results.length > 0 ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((gif) => (
            <GifCard
              key={`result-${gif.id}`}
              gif={gif}
              isActive={selectedGif?.id === gif.id}
              isFavorite={favoriteIds.has(gif.id)}
              isSending={isSending}
              toneStyles={toneStyles}
              onSend={handleSendGif}
              onShowRelated={setSelectedGif}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      ) : !isLoading && !error ? (
        <p className="mt-3 text-sm text-slate-400">No GIFs found. Try a different search term.</p>
      ) : null}
      </div>
    </div>
  );
}
