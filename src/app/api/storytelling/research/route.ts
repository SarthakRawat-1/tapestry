import { NextRequest } from 'next/server';
import {
  runResearchPipeline,
  PipelineProgress,
} from '@/lib/research-pipeline';
import * as db from '@/lib/db';
import { isGCSConfigured, persistImageFromUrl, uploadImage } from '@/lib/gcp/storage';

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    const { location, customInstructions, excludedSources, language } = await req.json();

    if (!location || !location.name) {
      return new Response(
        JSON.stringify({ error: 'Location is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Gemini API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Get current user (optional — anonymous users can still research)
    const { data: { user } } = await db.getUser();

    // Create a task ID and deepresearch ID
    const taskId = crypto.randomUUID();
    const deepresearchId = crypto.randomUUID();

    // Create the task in MongoDB with status 'running'
    if (user) {
      await db.createResearchTask({
        id: taskId,
        user_id: user.id,
        deepresearch_id: deepresearchId,
        location_name: location.name,
        location_lat: location.lat || 0,
        location_lng: location.lng || 0,
        status: 'running',
      });
    }

    console.log('[Research] Starting pipeline for:', location.name, '| taskId:', taskId);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, any>) => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
            );
          } catch (err: any) {
            // If the client disconnects, the controller closes and enqueueing throws.
            // We ignore this so the background research can finish and save to MongoDB.
            if (!err.message?.includes('Controller is already closed')) {
              console.warn('[Research] Stream send warning:', err.message);
            }
          }
        };

        try {
          // Send taskId to client so it can track this research
          send({ type: 'taskCreated', taskId, deepresearchId });

          const result = await runResearchPipeline(
            location.name,
            location.lat,
            location.lng,
            (progress: PipelineProgress) => {
              console.log(`[Research] [${progress.step}] ${progress.message}`);
              send({
                type: 'progress',
                step: progress.step,
                message: progress.message,
                data: progress.data,
              });
            },
            { customInstructions, excludedSources },
          );

          const images = result.images.slice(0, 10).map((img) => img.url);
          const sources = result.sources.slice(0, 20).map((s) => ({
            title: s.title,
            url: s.url,
            snippet: s.content?.substring(0, 200),
          }));

          // Merge Tavily sources with Google Search grounding sources
          const groundingUrls = new Set(
            (result.groundingSources || []).map((gs) => gs.url).filter(Boolean),
          );

          // Tag Tavily sources that were also verified by Google Search grounding
          const taggedSources = sources.map((s) => ({
            ...s,
            grounded: groundingUrls.has(s.url),
          }));

          // Add grounding-only sources not already in Tavily results
          const groundingOnlySources = (result.groundingSources || [])
            .filter((gs) => gs.url && !sources.some((s) => s.url === gs.url))
            .map((gs) => ({
              title: gs.title || '',
              url: gs.url || '',
              snippet: 'Verified via Google Search',
              grounded: true,
            }));

          const allSources = [...taggedSources, ...groundingOnlySources];

          // Send the full structured output with images and merged sources
          send({
            type: 'result',
            output: result.output,
            images,
            sources: allSources,
          });

          // Send interleaved narrative (text + inline-generated images)
          let interleavedForClient: Array<{ type: string; text?: string; imageUrl?: string }> = [];
          if (result.interleaved.length > 0) {
            // Persist interleaved images to GCS and convert to URLs
            let imgIdx = 0;

            for (const part of result.interleaved) {
              if (part.type === 'text' && part.text) {
                interleavedForClient.push({ type: 'text', text: part.text });
              } else if (part.type === 'image' && part.imageBase64) {
                let imageUrl: string | undefined;
                if (isGCSConfigured()) {
                  try {
                    const buf = Buffer.from(part.imageBase64, 'base64');
                    imageUrl = await uploadImage(buf, taskId, `interleaved-${imgIdx}.png`);
                  } catch { /* fallback to inline */ }
                }
                if (!imageUrl) {
                  imageUrl = `data:${part.mimeType || 'image/png'};base64,${part.imageBase64}`;
                }
                interleavedForClient.push({ type: 'image', imageUrl });
                imgIdx++;
              }
            }

            send({
              type: 'interleaved',
              parts: interleavedForClient,
            });
          }

          // Persist images to GCS so they don't break later (runs in background)
          let persistedImages = images;
          if (isGCSConfigured() && user) {
            try {
              persistedImages = await Promise.all(
                images.map((url, i) => persistImageFromUrl(url, taskId, i)),
              );
              console.log('[Research] ✓ Images persisted to GCS');
            } catch (err) {
              console.warn('[Research] GCS image persistence failed, using original URLs');
            }
          }

          // Save the completed research to MongoDB
          if (user) {
            await db.updateResearchTask(taskId, {
              status: 'completed',
              completed_at: new Date(),
              research_output: result.output,
              sources: allSources,
              location_images: persistedImages,
              interleaved_parts: result.interleaved.length > 0 ? interleavedForClient : undefined,
              language: language || undefined,
            });
          }

          // Send done signal
          send({ type: 'done' });

          console.log('[Research] ✓ Pipeline complete, saved to DB');
        } catch (error) {
          console.error('[Research] Pipeline error:', error);

          // Mark task as failed
          if (user) {
            await db.updateResearchTask(taskId, { status: 'failed' });
          }

          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        } finally {
          try {
            controller.close();
          } catch (e) {
            // Ignore if already closed
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[Research] Request error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
