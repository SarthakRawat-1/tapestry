import { NextRequest } from 'next/server';
import { translateResearchOutput, translateInterleavedParts, isTranslateConfigured } from '@/lib/gcp/translate';

export const maxDuration = 30;

/**
 * POST /api/research/translate
 * Translate a ResearchOutput (and optionally interleavedParts) to a target language.
 *
 * Body: { researchOutput, targetLanguage, interleavedParts? }
 * Returns: { translatedOutput, translatedParts? }
 */
export async function POST(req: NextRequest) {
  try {
    const { researchOutput, targetLanguage, interleavedParts } = await req.json();

    if (!researchOutput) {
      return new Response(
        JSON.stringify({ error: 'researchOutput is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!targetLanguage) {
      return new Response(
        JSON.stringify({ error: 'targetLanguage is required (e.g. "es", "fr", "hi")' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!isTranslateConfigured()) {
      return new Response(
        JSON.stringify({ error: 'Google Cloud API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const [translatedOutput, translatedParts] = await Promise.all([
      translateResearchOutput(researchOutput, targetLanguage),
      interleavedParts?.length
        ? translateInterleavedParts(interleavedParts, targetLanguage)
        : Promise.resolve(undefined),
    ]);

    return new Response(
      JSON.stringify({ translatedOutput, translatedParts }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[Translate] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Translation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
