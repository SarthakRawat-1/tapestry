/**
 * Image generation using Gemini's native image output (gemini-2.5-flash-image).
 *
 * Uses responseModalities: ['TEXT', 'IMAGE'] to generate images,
 * the same approach that works for interleaved narrative.
 */

import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = () => process.env.GEMINI_API_KEY;

export interface GeneratedImageResult {
  imageBase64: string;
  mimeType: string;
  prompt: string;
}

/**
 * Generate a historical illustration using Gemini's native image generation.
 */
export async function generateHistoricalImage(
  prompt: string,
  locationName: string,
): Promise<GeneratedImageResult | null> {
  const key = GEMINI_API_KEY();
  if (!key) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: key });

    const enhancedPrompt = `Generate a single image: A historical, cinematic illustration of the following scene at ${locationName}. ${prompt}. Style: photorealistic, dramatic lighting, historically accurate, documentary photography. Do not include any text in the image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: enhancedPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '16:9',
        },
      } as any,
    });

    // Find the image part in the response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) return null;

    const imagePart = parts.find((p: any) => p.inlineData);
    if (!imagePart?.inlineData?.data) return null;

    return {
      imageBase64: imagePart.inlineData.data as string,
      mimeType: (imagePart.inlineData.mimeType as string) || 'image/png',
      prompt: enhancedPrompt,
    };
  } catch (error) {
    console.error('[Imagen] Generation failed:', error);
    return null;
  }
}

export function isImagenAvailable(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
