import { NextRequest } from 'next/server';
import { translateResearchOutput, isTranslateConfigured } from '@/lib/gcp/translate';

export const maxDuration = 30;

/**
 * POST /api/research/translate
 * Translate a ResearchOutput to a target language.
 *
 * Body: { researchOutput, targetLanguage }
 * Returns: { translatedOutput }
 */
export async function POST(req: NextRequest) {
  try {
    const { researchOutput, targetLanguage } = await req.json();

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

    const translatedOutput = await translateResearchOutput(researchOutput, targetLanguage);

    return new Response(
      JSON.stringify({ translatedOutput }),
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
