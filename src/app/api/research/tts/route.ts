import { NextRequest } from 'next/server';
import { synthesizeSpeech, buildNarrationScript } from '@/lib/gcp/tts';

export const maxDuration = 120;

/**
 * POST /api/research/tts
 * Stream narration audio chunks as SSE.
 * Each chunk is synthesized and sent immediately so the client can start playing
 * while remaining chunks are still being generated.
 *
 * Body: { sections, languageCode?, voiceName? }
 * SSE events: { type: 'chunk', index, total, audioBase64 } | { type: 'done' } | { type: 'error' }
 */
export async function POST(req: NextRequest) {
  try {
    const { sections, languageCode, voiceName } = await req.json();

    if (!sections || !Array.isArray(sections)) {
      return new Response(
        JSON.stringify({ error: 'sections array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!process.env.GOOGLE_CLOUD_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Google Cloud API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const script = buildNarrationScript(sections);

    if (!script.trim()) {
      return new Response(
        JSON.stringify({ error: 'No text content to narrate' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const chunks = splitTextByWords(script, 50);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, any>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          for (let i = 0; i < chunks.length; i++) {
            const result = await synthesizeSpeech(chunks[i], {
              languageCode,
              voiceName,
            });

            send({
              type: 'chunk',
              index: i,
              total: chunks.length,
              audioBase64: result.audioBase64,
            });
          }

          send({ type: 'done' });
        } catch (error) {
          send({
            type: 'error',
            error: error instanceof Error ? error.message : 'TTS failed',
          });
        } finally {
          controller.close();
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
    console.error('[TTS] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'TTS failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

/**
 * Split text into chunks of roughly `maxWords` words each,
 * breaking at sentence boundaries when possible.
 */
function splitTextByWords(text: string, maxWords: number): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/).length;

    if (currentWordCount + sentenceWords > maxWords && current) {
      chunks.push(current.trim());
      current = sentence;
      currentWordCount = sentenceWords;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
      currentWordCount += sentenceWords;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}
