/**
 * Google Cloud Text-to-Speech client.
 * Converts text narration blocks into audio for documentary playback.
 *
 * Uses the REST API directly — no heavy SDK needed.
 * Requires: GOOGLE_CLOUD_API_KEY env var (same key can work for TTS, Translate, etc.)
 */

const API_KEY = () => process.env.GOOGLE_CLOUD_API_KEY;
const TTS_ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

export interface TTSOptions {
  /** BCP-47 language code, e.g. 'en-US' */
  languageCode?: string;
  /** Voice name — see https://cloud.google.com/text-to-speech/docs/voices */
  voiceName?: string;
  /** Speaking rate 0.25–4.0 (1.0 = normal) */
  speakingRate?: number;
  /** Pitch -20.0–20.0 semitones */
  pitch?: number;
}

export interface TTSResult {
  /** Base64-encoded MP3 audio */
  audioBase64: string;
  /** Audio as a Buffer */
  audioBuffer: Buffer;
}

/**
 * Synthesize speech from text.
 * Returns base64 MP3 audio content.
 */
export async function synthesizeSpeech(
  text: string,
  options: TTSOptions = {},
): Promise<TTSResult> {
  const key = API_KEY();
  if (!key) throw new Error('GOOGLE_CLOUD_API_KEY is not configured');

  const {
    languageCode = 'en-US',
    voiceName = 'en-US-Journey-D', // Natural, documentary-style voice
    speakingRate = 0.95,
    pitch = -1.0, // Slightly deeper for documentary feel
  } = options;

  // Journey voices don't support pitch or speakingRate parameters
  const isJourneyVoice = voiceName.includes('Journey');

  const body = {
    input: { text },
    voice: {
      languageCode,
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3' as const,
      ...(!isJourneyVoice && { speakingRate }),
      ...(!isJourneyVoice && { pitch }),
      effectsProfileId: ['large-home-entertainment-class-device'],
    },
  };

  const response = await fetch(`${TTS_ENDPOINT}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error(`[TTS] API error ${response.status} for voice ${voiceName}:`, err);
    throw new Error(`TTS API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const audioBase64: string = data.audioContent;

  if (!audioBase64) {
    console.error('[TTS] No audioContent in response:', JSON.stringify(data).slice(0, 200));
    throw new Error('TTS API returned no audio content');
  }

  const audioBuffer = Buffer.from(audioBase64, 'base64');

  return { audioBase64, audioBuffer };
}

/**
 * Build a single narration script from a ResearchOutput by
 * concatenating all text blocks (narration style) in section order.
 */
export function buildNarrationScript(
  sections: Array<{ title: string; blocks: Array<{ type: string; style?: string; content?: string }> }>,
): string {
  const parts: string[] = [];

  for (const section of sections) {
    parts.push(section.title + '.');

    for (const block of section.blocks) {
      if (block.type === 'text' && block.content) {
        parts.push(block.content);
      }
    }
  }

  return parts.join('\n\n');
}
