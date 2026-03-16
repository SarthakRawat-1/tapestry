/**
 * Gemini AI client for content generation (diagrams, enhancements)
 * Uses the new @google/genai SDK.
 */

import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function getClient() {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

export interface GeneratedImage {
  url: string;
  alt: string;
  prompt: string;
}

export interface GeneratedDiagram {
  type: 'chart' | 'timeline' | 'map' | 'infographic';
  data: any;
  config: any;
  description: string;
}

/**
 * Generate image — delegates to Tavily/Picsum (no Gemini image gen needed)
 */
export async function generateImage(prompt: string, locationName?: string): Promise<GeneratedImage | null> {
  // Use Picsum as a reliable placeholder
  const seed = locationName ? locationName.replace(/\s/g, '-').toLowerCase() : 'random';
  return {
    url: `https://picsum.photos/seed/${seed}/800/600`,
    alt: prompt,
    prompt,
  };
}

/**
 * Generate diagram data using Gemini
 */
export async function generateDiagram(prompt: string): Promise<GeneratedDiagram | null> {
  try {
    const ai = getClient();

    const diagramPrompt = `Create a simple timeline or infographic based on this description:
"${prompt}"

Return ONLY a valid JSON object with this structure:
{
  "type": "timeline",
  "data": [
    {"year": "3000 BCE", "event": "Bronze Age settlements", "importance": "high"},
    {"year": "500 CE", "event": "Classical period", "importance": "medium"}
  ],
  "config": {"orientation": "horizontal", "theme": "historical"},
  "description": "Historical timeline"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: diagramPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text ?? '';
    return JSON.parse(text);
  } catch (error) {
    console.error('[Gemini] Error generating diagram:', error);
    return {
      type: 'infographic',
      data: [{ label: 'Visualization', value: 'Historical data' }],
      config: { theme: 'minimal' },
      description: prompt.substring(0, 100),
    };
  }
}

/**
 * Generate enhanced storytelling content using Gemini
 */
export async function enhanceStorytellingContent(
  originalContent: string,
  locationName: string,
): Promise<{
  images: GeneratedImage[];
  diagrams: GeneratedDiagram[];
} | null> {
  try {
    const ai = getClient();

    const enhancementPrompt = `Analyze this storytelling content about ${locationName} and suggest visual and audio enhancements:

CONTENT:
${originalContent}

Return as JSON:
{
  "images": [{"prompt": "detailed image description", "alt": "alt text", "context": "where it fits"}],
  "diagrams": [{"type": "timeline", "description": "what to visualize", "context": "story context"}],
  "audioScripts": [{"text": "narration script", "voice": "female", "context": "dramatic moment"}]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: enhancementPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const suggestions = JSON.parse(response.text ?? '{}');

    const images: GeneratedImage[] = (suggestions.images || []).map((img: any, idx: number) => ({
      url: `https://picsum.photos/seed/${locationName.replace(/\s/g, '-')}-${idx}/800/600`,
      alt: img.alt || img.prompt,
      prompt: img.prompt,
    }));

    const diagrams: GeneratedDiagram[] = [];
    for (const d of suggestions.diagrams || []) {
      const diagram = await generateDiagram(d.description);
      if (diagram) diagrams.push(diagram);
    }

    return { images, diagrams };
  } catch (error) {
    console.error('[Gemini] Error enhancing content:', error);
    return null;
  }
}
