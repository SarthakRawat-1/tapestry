import { NextRequest } from 'next/server';
import { generateHistoricalImage } from '@/lib/gcp/imagen';
import { uploadImage, isGCSConfigured } from '@/lib/gcp/storage';
import { getDb } from '@/lib/mongodb';

export const maxDuration = 60;

/**
 * GET /api/research/imagen?taskId=xxx&key=yyy
 * Check the image cache for a previously generated/resolved image.
 */
export async function GET(req: NextRequest) {
  try {
    const taskId = req.nextUrl.searchParams.get('taskId');
    const key = req.nextUrl.searchParams.get('key');

    if (!taskId || !key) {
      return new Response(JSON.stringify({ imageUrl: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = await getDb();
    let cache = await db.collection('imageCache').findOne({ taskId, key });

    // Fallback: If not found under this specific run, see if we've generated it for any past run
    if (!cache) {
      cache = await db.collection('imageCache').findOne({ key });
    }

    if (cache?.imageUrl) {
      return new Response(
        JSON.stringify({ imageUrl: cache.imageUrl, source: cache.source || 'imagen' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ imageUrl: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ imageUrl: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * PUT /api/research/imagen
 * Store a resolved image URL in the cache (e.g. Tavily result).
 */
export async function PUT(req: NextRequest) {
  try {
    const { taskId, key, imageUrl, source } = await req.json();
    if (!taskId || !key || !imageUrl) {
      return new Response(JSON.stringify({ ok: false }), { status: 400 });
    }

    const db = await getDb();
    await db.collection('imageCache').updateOne(
      { taskId, key },
      { $set: { taskId, key, imageUrl, source: source || 'tavily', updatedAt: new Date() } },
      { upsert: true },
    );

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
}

/**
 * POST /api/research/imagen
 * Generate a historical illustration using Gemini.
 * Persists to GCS + cache if taskId is provided.
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt, locationName, taskId, cacheKey } = await req.json();

    if (!prompt || !locationName) {
      return new Response(
        JSON.stringify({ error: 'prompt and locationName are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const result = await generateHistoricalImage(prompt, locationName);

    if (!result) {
      return new Response(
        JSON.stringify({ error: 'Image generation failed or unavailable' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Try to upload to GCS if configured
    let persistedUrl: string | null = null;

    if (isGCSConfigured() && taskId) {
      try {
        const filename = `imagen-${Date.now()}.png`;
        const imageBuffer = Buffer.from(result.imageBase64, 'base64');
        persistedUrl = await uploadImage(imageBuffer, taskId, filename);
        console.log('[Imagen] GCS upload succeeded:', persistedUrl);
      } catch (err) {
        console.warn('[Imagen] GCS upload failed:', err);
      }
    }

    // Always cache the result in MongoDB when we have taskId + cacheKey,
    // even if GCS upload failed (fall back to caching a data URI).
    const imageUrl = persistedUrl
      || `data:${result.mimeType || 'image/png'};base64,${result.imageBase64}`;

    if (taskId && cacheKey) {
      try {
        const db = await getDb();
        await db.collection('imageCache').updateOne(
          { taskId, key: cacheKey },
          { $set: { taskId, key: cacheKey, imageUrl, source: 'imagen', updatedAt: new Date() } },
          { upsert: true },
        );
        console.log('[Imagen] Cached in MongoDB:', { taskId, key: cacheKey, hasGcsUrl: !!persistedUrl });
      } catch (dbErr) {
        console.warn('[Imagen] MongoDB cache write failed:', dbErr);
      }
    }

    return new Response(
      JSON.stringify(persistedUrl ? { imageUrl: persistedUrl } : {
        imageBase64: result.imageBase64,
        mimeType: result.mimeType,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[Imagen] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Image generation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
