'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, ImageIcon, Loader2, RefreshCw } from 'lucide-react';

export interface SmartImageProps {
  prompt: string;
  alt?: string;
  locationName: string;
  taskId?: string | null;
  layout?: 'full_bleed' | 'inline' | 'background';
  className?: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 4000;

/**
 * Validate that an image URL actually loads before committing to it.
 * Returns true if the image loads, false if it errors.
 */
function probeImage(url: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    // data URIs are always valid
    if (url.startsWith('data:')) { resolve(true); return; }
    const img = new Image();
    const timer = setTimeout(() => { img.src = ''; resolve(false); }, timeoutMs);
    img.onload = () => { clearTimeout(timer); resolve(true); };
    img.onerror = () => { clearTimeout(timer); resolve(false); };
    img.src = url;
  });
}

/**
 * SmartImage — resolves an image prompt into an actual image.
 * 1. Checks MongoDB cache
 * 2. Tries Tavily image search (real photos) — validates URL before using
 * 3. Falls back to Gemini image generation (AI-generated)
 * 4. Falls back to picsum placeholder
 * 5. Auto-retries on failure, with manual retry button as last resort
 */
export function SmartImage({ prompt, alt, locationName, taskId, layout, className }: SmartImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [source, setSource] = useState<'imagen' | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const resolvedRef = useRef(false);
  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;
  const cancelledRef = useRef(false);

  const resolve = useCallback(async (attempt: number) => {
    cancelledRef.current = false;
    resolvedRef.current = false;
    setLoading(true);
    setFailed(false);

    if (!prompt) {
      setLoading(false);
      setFailed(true);
      return;
    }

    const promptKey = prompt.slice(0, 100).replace(/[^a-zA-Z0-9]/g, '_');
    const currentTaskId = taskIdRef.current;

    // Helper to commit a successful image
    const commit = (url: string, src: 'imagen' | null) => {
      resolvedRef.current = true;
      setImageUrl(url);
      setSource(src);
      setLoading(false);
    };

    // Helper to cache in background
    const cacheInBackground = (url: string, src: string) => {
      const tid = taskIdRef.current;
      if (tid) {
        fetch('/api/research/imagen', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: tid, key: promptKey, imageUrl: url, source: src }),
        }).catch(() => {});
      }
    };

    // ── Step 0: Check MongoDB cache ──────────────────────────────────────
    if (currentTaskId) {
      try {
        const cacheRes = await fetch(`/api/research/imagen?taskId=${currentTaskId}&key=${encodeURIComponent(promptKey)}`);
        if (cacheRes.ok && !cancelledRef.current) {
          const cached = await cacheRes.json();
          if (cached.imageUrl) {
            const valid = await probeImage(cached.imageUrl);
            if (valid && !cancelledRef.current) {
              commit(cached.imageUrl, cached.source === 'imagen' || cached.source === 'tavily' ? 'imagen' : null);
              return;
            }
            // Cached URL is broken — fall through to regenerate
          }
        }
      } catch { /* cache miss, continue */ }
    }

    if (cancelledRef.current) return;

    // ── Step 1: Try Gemini image generation ──────────────────────────────
    // On retries, simplify the prompt to avoid safety filter rejections
    const geminiPrompt = attempt > 0
      ? `A scenic photograph of ${locationName}. Beautiful landscape, natural lighting.`
      : prompt;
    try {
      const tid = taskIdRef.current;
      const res = await fetch('/api/research/imagen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: geminiPrompt, locationName, taskId: tid, cacheKey: promptKey }),
      });
      if (res.ok && !cancelledRef.current) {
        const data = await res.json();
        if (data.imageUrl) {
          const valid = await probeImage(data.imageUrl);
          if (valid && !cancelledRef.current) {
            commit(data.imageUrl, 'imagen');
            return;
          }
        }
        if (data.imageBase64) {
          const dataUri = `data:${data.mimeType || 'image/png'};base64,${data.imageBase64}`;
          commit(dataUri, 'imagen');
          cacheInBackground(dataUri, 'imagen');
          return;
        }
      }
    } catch { /* fall through */ }

    if (cancelledRef.current) return;

    // ── Step 2: Picsum placeholder (always works) ────────────────────────
    const seed = encodeURIComponent(`${locationName}-${promptKey}`.slice(0, 60));
    const picsum = `https://picsum.photos/seed/${seed}/800/450`;
    const picsumValid = await probeImage(picsum);
    if (picsumValid && !cancelledRef.current) {
      commit(picsum, null);
      cacheInBackground(picsum, 'picsum');
      return;
    }

    if (cancelledRef.current) return;

    // ── All steps failed — auto-retry or give up ─────────────────────────
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, RETRY_DELAY));
      if (!cancelledRef.current) {
        setRetryCount(attempt + 1);
        return resolve(attempt + 1);
      }
    } else {
      setLoading(false);
      setFailed(true);
    }
  }, [prompt, locationName]);

  useEffect(() => {
    cancelledRef.current = false;
    setRetryCount(0);
    resolve(0);
    return () => { cancelledRef.current = true; };
  }, [prompt, locationName, resolve]);

  const handleManualRetry = () => {
    cancelledRef.current = false;
    setRetryCount(0);
    setFailed(false);
    setImageUrl(null);
    resolve(0);
  };

  // Failed state — show prompt as placeholder with retry button
  if (failed && !imageUrl) {
    return (
      <figure className={className}>
        <div className={`relative overflow-hidden rounded-sm border border-amber-900/20 dark:border-amber-400/15 shadow-md ${
          layout === 'full_bleed' ? 'mx-0 sm:-mx-4' : ''
        }`}>
          <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-amber-800/10 z-10 pointer-events-none" />
          <div className="aspect-video bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950/40 dark:to-amber-900/30 flex items-center justify-center">
            <div className="text-center px-4">
              <ImageIcon className="h-5 w-5 text-amber-800/30 dark:text-amber-300/20 mx-auto mb-1.5" />
              <p className="text-xs text-amber-800/50 dark:text-amber-300/40 italic line-clamp-2 mb-2">{prompt}</p>
              <button
                onClick={handleManualRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
                  bg-amber-800/10 hover:bg-amber-800/20 dark:bg-amber-300/10 dark:hover:bg-amber-300/20
                  text-amber-800/70 dark:text-amber-300/60 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </button>
            </div>
          </div>
        </div>
        {alt && <figcaption className="text-xs italic text-amber-900/50 dark:text-amber-200/40 text-center mt-2">{alt}</figcaption>}
      </figure>
    );
  }

  // Loading state
  if (loading && !imageUrl) {
    return (
      <figure className={className}>
        <div className={`relative overflow-hidden rounded-sm border border-amber-900/20 dark:border-amber-400/15 shadow-md ${
          layout === 'full_bleed' ? 'mx-0 sm:-mx-4' : ''
        }`}>
          <div className="aspect-video bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950/40 dark:to-amber-900/30 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-5 w-5 text-amber-800/40 dark:text-amber-300/30 animate-spin mx-auto mb-1.5" />
              <p className="text-[10px] text-amber-800/40 dark:text-amber-300/30">
                {retryCount > 0 ? `Retrying (${retryCount}/${MAX_RETRIES})...` : 'Generating image...'}
              </p>
            </div>
          </div>
        </div>
      </figure>
    );
  }

  // Image loaded
  return (
    <figure className={className}>
      <div className={`relative overflow-hidden rounded-sm border border-amber-900/20 dark:border-amber-400/15 shadow-md ${
        layout === 'full_bleed' ? 'mx-0 sm:-mx-4' : ''
      }`}>
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/8 via-transparent to-amber-800/8 z-10 pointer-events-none" />
        <img
          src={imageUrl!}
          alt={alt || prompt}
          className="w-full aspect-video object-cover"
          style={{ filter: 'sepia(0.05) saturate(0.95)' }}
          onError={() => { setImageUrl(null); setFailed(true); }}
        />
        {source && (
          <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded text-[9px] text-white/70">
            {source === 'imagen' && <Sparkles className="h-2.5 w-2.5" />}
            {source === 'imagen' ? 'AI Generated' : 'Photo'}
          </div>
        )}
      </div>
      {alt && <figcaption className="text-xs italic text-amber-900/50 dark:text-amber-200/40 text-center mt-2">{alt}</figcaption>}
    </figure>
  );
}
