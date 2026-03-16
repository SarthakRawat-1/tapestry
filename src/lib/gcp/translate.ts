/**
 * Google Cloud Translation API client.
 * Translates research output text blocks to the user's language.
 *
 * Uses the REST API v2 — no heavy SDK needed.
 * Requires: GOOGLE_CLOUD_API_KEY env var.
 */

const API_KEY = () => process.env.GOOGLE_CLOUD_API_KEY;
const TRANSLATE_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
const DETECT_ENDPOINT = 'https://translation.googleapis.com/language/translate/v2/detect';

export interface TranslationResult {
  translatedText: string;
  detectedSourceLanguage?: string;
}

/**
 * Translate a single string.
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string,
): Promise<TranslationResult> {
  const key = API_KEY();
  if (!key) throw new Error('GOOGLE_CLOUD_API_KEY is not configured');

  const body: Record<string, any> = {
    q: text,
    target: targetLanguage,
    format: 'text',
  };
  if (sourceLanguage) body.source = sourceLanguage;

  const response = await fetch(`${TRANSLATE_ENDPOINT}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Translate API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const translation = data.data.translations[0];

  return {
    translatedText: translation.translatedText,
    detectedSourceLanguage: translation.detectedSourceLanguage,
  };
}

/**
 * Translate multiple strings in a single API call (batched).
 */
export async function translateBatch(
  texts: string[],
  targetLanguage: string,
): Promise<TranslationResult[]> {
  const key = API_KEY();
  if (!key) throw new Error('GOOGLE_CLOUD_API_KEY is not configured');

  if (texts.length === 0) return [];

  const response = await fetch(`${TRANSLATE_ENDPOINT}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: texts,
      target: targetLanguage,
      format: 'text',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Translate API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.data.translations.map((t: any) => ({
    translatedText: t.translatedText,
    detectedSourceLanguage: t.detectedSourceLanguage,
  }));
}

/**
 * Detect the language of a text string.
 */
export async function detectLanguage(
  text: string,
): Promise<{ language: string; confidence: number }> {
  const key = API_KEY();
  if (!key) throw new Error('GOOGLE_CLOUD_API_KEY is not configured');

  const response = await fetch(`${DETECT_ENDPOINT}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Detect API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const detection = data.data.detections[0][0];

  return {
    language: detection.language,
    confidence: detection.confidence,
  };
}

/**
 * Translate an entire ResearchOutput's text content.
 * Returns a new object with translated text blocks, title, subtitle, summary.
 * Non-text fields (images, maps, diagrams) are left untouched.
 */
export async function translateResearchOutput(
  output: any,
  targetLanguage: string,
): Promise<any> {
  // Collect all translatable strings
  const textsToTranslate: string[] = [
    output.title,
    output.subtitle,
    output.summary,
  ];

  // Collect text block contents and section titles
  const blockIndices: Array<{ sectionIdx: number; blockIdx: number }> = [];
  const sectionTitleIndices: number[] = [];

  for (let si = 0; si < output.sections.length; si++) {
    textsToTranslate.push(output.sections[si].title);
    sectionTitleIndices.push(textsToTranslate.length - 1);

    for (let bi = 0; bi < output.sections[si].blocks.length; bi++) {
      const block = output.sections[si].blocks[bi];
      if (block.type === 'text' && block.content) {
        textsToTranslate.push(block.content);
        blockIndices.push({ sectionIdx: si, blockIdx: bi });
      }
    }
  }

  // Timeline entries
  const timelineStartIdx = textsToTranslate.length;
  for (const entry of output.timeline || []) {
    textsToTranslate.push(entry.title);
    textsToTranslate.push(entry.description);
  }

  // Batch translate
  const translated = await translateBatch(textsToTranslate, targetLanguage);

  // Rebuild output with translations
  const result = JSON.parse(JSON.stringify(output));
  result.title = translated[0].translatedText;
  result.subtitle = translated[1].translatedText;
  result.summary = translated[2].translatedText;

  // Section titles
  for (let i = 0; i < sectionTitleIndices.length; i++) {
    result.sections[i].title = translated[sectionTitleIndices[i]].translatedText;
  }

  // Text blocks — blockIndices were pushed in the same interleaved order as
  // section titles, so their positions in textsToTranslate follow directly
  // after the preceding section title + earlier text blocks. We stored the
  // section/block coordinates but not the array index, so recompute it by
  // walking the same push order.
  let walkIdx = 3; // skip title, subtitle, summary
  for (let si = 0; si < output.sections.length; si++) {
    walkIdx++; // section title
    for (let bi = 0; bi < output.sections[si].blocks.length; bi++) {
      const block = output.sections[si].blocks[bi];
      if (block.type === 'text' && block.content) {
        result.sections[si].blocks[bi].content = translated[walkIdx].translatedText;
        walkIdx++;
      }
    }
  }

  // Timeline
  let tlIdx = timelineStartIdx;
  for (let i = 0; i < (result.timeline || []).length; i++) {
    result.timeline[i].title = translated[tlIdx].translatedText;
    result.timeline[i].description = translated[tlIdx + 1].translatedText;
    tlIdx += 2;
  }

  return result;
}

/**
 * Translate interleaved narrative parts (text parts only; image parts are left untouched).
 */
export async function translateInterleavedParts(
  parts: Array<{ type: string; text?: string; imageUrl?: string }>,
  targetLanguage: string,
): Promise<Array<{ type: string; text?: string; imageUrl?: string }>> {
  const textIndices: number[] = [];
  const texts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i].type === 'text' && parts[i].text) {
      textIndices.push(i);
      texts.push(parts[i].text!);
    }
  }

  if (texts.length === 0) return parts;

  const translated = await translateBatch(texts, targetLanguage);
  const result = parts.map(p => ({ ...p }));
  for (let i = 0; i < textIndices.length; i++) {
    result[textIndices[i]].text = translated[i].translatedText;
  }
  return result;
}

/**
 * Check if Translation API is configured.
 */
export function isTranslateConfigured(): boolean {
  return !!process.env.GOOGLE_CLOUD_API_KEY;
}
