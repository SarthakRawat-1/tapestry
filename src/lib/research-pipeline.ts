/**
 * Research pipeline: Plan → Search → Synthesize
 *
 * Step 1 (Plan):  Gemini Pro generates targeted search queries for the location.
 * Step 2 (Search): Queries run in parallel via Tavily (text + images).
 * Step 3 (Synthesize): Gemini Pro + Google Search grounding produces structured JSON
 *                       using all gathered context.
 */

import { GoogleGenAI } from '@google/genai';
import { searchHistoricalContent, TavilySearchResult, TavilyImageResult } from './tavily-client';
import { ResearchOutput, researchJsonSchema } from './research-schema';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

function getClient() {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

// ============================================================================
// JSON Repair Helper
// ============================================================================

/**
 * Attempt to repair truncated JSON from Gemini by closing open structures.
 * This handles the common case where maxOutputTokens is hit mid-response.
 */
function repairTruncatedJson(raw: string): ResearchOutput {
  let s = raw.trim();

  // Strip trailing incomplete string/value: find last complete key-value or array element
  // Walk backwards to find the last structurally valid point
  // Remove any trailing incomplete string literal (unterminated quote)
  const lastQuote = s.lastIndexOf('"');
  if (lastQuote > 0) {
    // Check if this quote is an unterminated string by counting backslashes before it
    let bs = 0;
    for (let i = lastQuote - 1; i >= 0 && s[i] === '\\'; i--) bs++;
    // If the quote is escaped, it's not a real quote boundary — trim further
    if (bs % 2 === 1) {
      s = s.slice(0, lastQuote - 1);
    }
  }

  // Remove any trailing partial value after the last comma or colon
  // Find the last complete element boundary
  const lastComplete = Math.max(
    s.lastIndexOf('}'),
    s.lastIndexOf(']'),
    s.lastIndexOf('"'),
  );
  if (lastComplete > 0) {
    s = s.slice(0, lastComplete + 1);
  }

  // Remove trailing comma if present
  s = s.replace(/,\s*$/, '');

  // Close any open brackets/braces
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{' || ch === '[') stack.push(ch);
    else if (ch === '}' || ch === ']') stack.pop();
  }

  // Close unclosed structures in reverse order
  while (stack.length > 0) {
    const open = stack.pop();
    s += open === '{' ? '}' : ']';
  }

  try {
    return JSON.parse(s);
  } catch {
    console.error('[Synthesize] JSON repair also failed, returning minimal output');
    return {
      title: 'Research Output',
      subtitle: '',
      summary: 'The research output was too large to process completely. Please try again.',
      location: { name: '', lat: 0, lng: 0 },
      sections: [],
      timeline: [],
    } as ResearchOutput;
  }
}

// ============================================================================
// Step 1: Query Planning
// ============================================================================

interface PlannedQueries {
  queries: string[];
}

const queryPlanSchema = {
  type: 'object' as const,
  properties: {
    queries: {
      type: 'array' as const,
      items: { type: 'string' as const },
      description: 'Array of 10-12 targeted search queries covering different historical aspects of the location.',
    },
  },
  required: ['queries'] as const,
};

export async function planQueries(
  locationName: string,
  lat: number,
  lng: number,
  customInstructions?: string,
): Promise<string[]> {
  const ai = getClient();

  const hasFocus = !!customInstructions;

  const prompt = hasFocus
    ? `You are a research planner for a focused documentary about "${locationName}" (coordinates: ${lat}, ${lng}).

The user wants this specific angle: "${customInstructions}"

Generate 10-12 targeted web search queries. AT LEAST 8 queries must directly address the user's focus topic as it relates to "${locationName}". The remaining 2-4 queries can cover general context needed for a complete narrative (e.g. basic geography, timeline of the place).

Make queries specific and search-engine friendly. Include the location name in each query. Vary the phrasing to get diverse results.`
    : `You are a research planner for a historical documentary about "${locationName}" (coordinates: ${lat}, ${lng}).

Generate 10-12 targeted web search queries that will gather comprehensive historical information about this location. Cover these angles:
1. Ancient/earliest known history, archaeological discoveries, and founding
2. Key historical events, wars, conquests, and turning points
3. Cultural significance, traditions, festivals, and customs
4. Notable people — rulers, artists, scientists, revolutionaries associated with this place
5. Architecture, monuments, and landmark buildings with their history
6. Economic history — trade routes, industries, commerce
7. Modern-day significance, preservation efforts, and current relevance
8. Geographic features, natural history, and how geography shaped the settlement
9. Religious and spiritual significance
10. Lesser-known facts, myths, legends, and local folklore

Make queries specific and search-engine friendly. Include the location name in each query. Vary the phrasing to get diverse results.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: queryPlanSchema,
      temperature: 0.7,
    },
  });

  const parsed: PlannedQueries = JSON.parse(response.text ?? '{"queries":[]}');
  return parsed.queries.slice(0, 12);
}

// ============================================================================
// Step 2: Parallel Search (Tavily)
// ============================================================================

export interface SearchResults {
  textResults: Array<TavilySearchResult & { query: string }>;
  images: TavilyImageResult[];
}

export async function executeSearches(queries: string[], excludedSources?: string[]): Promise<SearchResults> {
  const allTextResults: Array<TavilySearchResult & { query: string }> = [];
  const allImages: TavilyImageResult[] = [];
  const seenUrls = new Set<string>();

  // Build a set of excluded domains for fast lookup
  const excludedDomains = new Set(
    (excludedSources || []).map((s) => s.toLowerCase()),
  );

  const isExcluded = (url: string): boolean => {
    if (excludedDomains.size === 0) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return [...excludedDomains].some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      );
    } catch {
      return false;
    }
  };

  const results = await Promise.allSettled(
    queries.map((query) =>
      searchHistoricalContent(query, { includeImages: true, maxResults: 5 }),
    ),
  );

  results.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value) {
      const { results: textResults, images } = result.value;

      // Deduplicate by URL and filter excluded sources
      for (const r of textResults) {
        if (!seenUrls.has(r.url) && !isExcluded(r.url)) {
          seenUrls.add(r.url);
          allTextResults.push({ ...r, query: queries[i] });
        }
      }

      for (const img of images) {
        if (!seenUrls.has(img.url) && !isExcluded(img.url)) {
          seenUrls.add(img.url);
          allImages.push(img);
        }
      }
    }
  });

  return { textResults: allTextResults, images: allImages };
}

// ============================================================================
// Step 3: Synthesis (Gemini Pro + Google Search grounding → structured JSON)
// ============================================================================

export async function synthesize(
  locationName: string,
  lat: number,
  lng: number,
  searchResults: SearchResults,
  customInstructions?: string,
): Promise<{ output: ResearchOutput; groundingChunks: Array<{ title?: string; url?: string }> }> {
  const ai = getClient();

  // Build context from search results
  const contextChunks = searchResults.textResults
    .slice(0, 30) // cap to avoid token overflow
    .map(
      (r, i) =>
        `[Source ${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}\n`,
    )
    .join('\n---\n');

  const hasFocus = !!customInstructions;

  const focusDirective = hasFocus
    ? `\n\nCRITICAL — USER-REQUESTED FOCUS: "${customInstructions}"
This documentary MUST center on the above topic. Every section should primarily address this focus as it relates to "${locationName}". General history should only appear as brief context to support the focused narrative. If the research context below lacks focus-specific material, rely on your own knowledge enhanced by Google Search to fill the gaps.`
    : '';

  const narrativePrompt = `You are a creative director AI producing an immersive, multimodal documentary experience about "${locationName}" (${lat}, ${lng}).${focusDirective}

RESEARCH CONTEXT (from web search):
${contextChunks}

TASK:
Using the research context above AND your own knowledge enhanced by Google Search, produce a rich, deeply-researched documentary narrative about this location.${hasFocus ? ` Remember: the entire documentary must be centered on "${customInstructions}".` : ''} Follow this story arc:
1. OPENING — Atmosphere and sensory arrival. Drop the audience into the place.${hasFocus ? ' Frame the opening through the lens of the focus topic.' : ' Set the scene vividly.'}
2. DISCOVERY — ${hasFocus ? 'The origins and earliest evidence of the focus topic at this location. How did it begin here?' : 'Earliest known history, archaeological findings, founding myths, or first contact. Go deep into origins.'}
3. KEY_EVENTS — ${hasFocus ? '3-5 pivotal moments related to the focus topic that shaped this place. Each should be a mini-story.' : '3-5 pivotal historical moments that shaped this place. Each event should be a mini-story with context, characters, causes, and consequences.'}
4. HUMAN_LAYER — ${hasFocus ? 'The people connected to the focus topic — researchers, practitioners, communities, notable figures. Bring their stories alive.' : 'Culture, traditions, daily life, notable figures, or a specific community. Bring the human element alive with anecdotes and details.'}
5. TODAY — ${hasFocus ? 'Current state of the focus topic at this location — ongoing research, preservation, modern relevance, challenges.' : 'Modern significance, ongoing challenges, preservation efforts, tourism, or current relevance. Connect past to present.'}
6. CLOSING — A reflective, poetic ending that ties the narrative together.

Write a comprehensive documentary narrative with clear section headings. Include specific names, dates, numbers, and facts. Quote historical figures when possible. This should feel like a 10-15 minute documentary script — thorough, authoritative, and engaging.`;

  // Step A: Generate grounded narrative with Google Search tool
  const groundedResponse = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: narrativePrompt,
    config: {
      temperature: 0.8,
      topP: 0.95,
      maxOutputTokens: 16384,
      tools: [{ googleSearch: {} }],
    },
  });

  const groundedNarrative = groundedResponse.text ?? '';

  // Extract grounding metadata
  const groundingMetadata = groundedResponse.candidates?.[0]?.groundingMetadata;
  const groundingChunks = groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title,
    url: chunk.web?.uri,
  })).filter((c: any) => c.url) || [];

  // Step B: Convert grounded narrative into structured JSON
  const structurePrompt = `Convert the following documentary narrative about "${locationName}" into the exact JSON structure specified.

DOCUMENTARY NARRATIVE:
${groundedNarrative.slice(0, 24000)}

STRUCTURING RULES:
- Each section must have 3-5 content blocks.
- Text narration blocks should be 80-150 words each. Be concise but preserve key facts, dates, and quotes.
- Never place two blocks of the same type consecutively within a section.
- Use at most ONE map block in the entire output.
- Text blocks: use "narration" for prose paragraphs, "headline" for section openers, "quote" for historical quotes with attribution, "caption" for image/map captions.
- Image blocks: one per section maximum. Write a concise prompt (max 40 words) mentioning "${locationName}", the era, and mood. No anachronisms.
- Diagram blocks: only include if the narrative contains specific numeric data worth visualizing.
- Timeline: include 6-8 key events in chronological order. Image prompts max 30 words each.
- The title should be compelling and documentary-style.
- The summary should be 2-3 sentences suitable for social sharing.
- Map blocks need lat, lng, zoom (1-18), label, and description.`;

  const structuredResponse = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: structurePrompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: researchJsonSchema,
      temperature: 0.3,
      maxOutputTokens: 65536,
    },
  });

  const rawJson = structuredResponse.text ?? '{}';
  let output: ResearchOutput;
  try {
    output = JSON.parse(rawJson);
  } catch (parseError) {
    // Gemini may return truncated JSON — attempt to repair it
    console.warn('[Synthesize] JSON parse failed, attempting repair...', (parseError as Error).message);
    output = repairTruncatedJson(rawJson);
  }

  // Ensure location is set correctly
  output.location = { name: locationName, lat, lng };

  return { output, groundingChunks };
}

// ============================================================================
// Step 4: Illustrate (Gemini Flash interleaved text+image output)
// ============================================================================

export interface InterleavedPart {
  type: 'text' | 'image';
  text?: string;
  imageBase64?: string;
  mimeType?: string;
}

/**
 * Generate interleaved text + image output using Gemini's native image generation.
 * This produces a visual narrative with inline illustrations — the "interleaved output"
 * that demonstrates Gemini's multimodal capabilities.
 */
export async function generateInterleavedNarrative(
  output: ResearchOutput,
): Promise<InterleavedPart[]> {
  const ai = getClient();

  // Build a condensed narrative from the research output for illustration
  const narrativeParts: string[] = [];
  for (const section of output.sections) {
    narrativeParts.push(`## ${section.title}`);
    for (const block of section.blocks) {
      if (block.type === 'text') {
        narrativeParts.push(block.content);
      } else if (block.type === 'image') {
        narrativeParts.push(`[Illustrate: ${block.prompt}]`);
      }
    }
  }

  const prompt = `You are a documentary illustrator. Below is a historical documentary about "${output.title}".

Your task: Re-narrate this documentary in a condensed form, generating INLINE IMAGES at key moments. Write 2-3 sentences of narration, then generate an image that captures that moment, then continue narrating. Alternate between text and images throughout.

Generate at least 4-6 images throughout the narrative. Each image should be:
- Historically themed and visually striking
- Cinematic composition with dramatic lighting
- Relevant to the text that precedes it

DOCUMENTARY CONTENT:
${narrativeParts.join('\n\n')}

Now re-narrate this with inline illustrations. Start with a dramatic opening image.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '16:9',
        },
      } as any,
    });

    const parts: InterleavedPart[] = [];
    const candidate = response.candidates?.[0];
    if (!candidate?.content?.parts) return parts;

    for (const part of candidate.content.parts) {
      if (part.text) {
        parts.push({ type: 'text', text: part.text });
      } else if (part.inlineData) {
        parts.push({
          type: 'image',
          imageBase64: part.inlineData.data as string,
          mimeType: part.inlineData.mimeType as string,
        });
      }
    }

    return parts;
  } catch (error) {
    console.error('[Interleaved] Generation failed:', error);
    return [];
  }
}

// ============================================================================
// Full pipeline orchestrator
// ============================================================================

export type PipelineProgress = {
  step: 'planning' | 'searching' | 'synthesizing' | 'illustrating' | 'complete' | 'error';
  message: string;
  data?: any;
};

export interface PipelineResult {
  output: ResearchOutput;
  images: TavilyImageResult[];
  sources: Array<TavilySearchResult & { query: string }>;
  interleaved: InterleavedPart[];
  groundingSources: Array<{ title?: string; url?: string }>;
}

export interface PipelineOptions {
  customInstructions?: string;
  excludedSources?: string[];
  /** Called after synthesis completes (before illustration) with the documentary output and search results */
  onSynthesisComplete?: (output: ResearchOutput, images: TavilyImageResult[], sources: Array<TavilySearchResult & { query: string }>, groundingSources: Array<{ title?: string; url?: string }>) => void;
}

export async function runResearchPipeline(
  locationName: string,
  lat: number,
  lng: number,
  onProgress: (progress: PipelineProgress) => void,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const { customInstructions, excludedSources, onSynthesisComplete } = options;

  // Step 1: Plan
  onProgress({ step: 'planning', message: 'Planning research queries...' });
  const queries = await planQueries(locationName, lat, lng, customInstructions);
  onProgress({
    step: 'planning',
    message: `Generated ${queries.length} search queries`,
    data: { queries },
  });

  // Step 2: Search
  onProgress({ step: 'searching', message: `Searching across ${queries.length} queries...` });
  const searchResults = await executeSearches(queries, excludedSources);
  onProgress({
    step: 'searching',
    message: `Found ${searchResults.textResults.length} sources and ${searchResults.images.length} images`,
    data: {
      sourceCount: searchResults.textResults.length,
      imageCount: searchResults.images.length,
      images: searchResults.images.slice(0, 10).map((img) => img.url),
    },
  });

  // Step 3: Synthesize
  onProgress({ step: 'synthesizing', message: 'Writing your documentary...' });
  const { output, groundingChunks } = await synthesize(locationName, lat, lng, searchResults, customInstructions);
  onProgress({
    step: 'synthesizing',
    message: `Documentary written — ${output.sections.length} sections, ${output.timeline.length} timeline events`,
    data: { sectionCount: output.sections.length, timelineCount: output.timeline.length },
  });

  // Step 4: Illustrate (interleaved text + image generation)
  // Send intermediate results to the client before illustration starts
  if (onSynthesisComplete) {
    onSynthesisComplete(output, searchResults.images, searchResults.textResults, groundingChunks);
  }

  onProgress({ step: 'illustrating', message: 'Generating inline illustrations...' });
  let interleaved: InterleavedPart[] = [];
  try {
    interleaved = await generateInterleavedNarrative(output);
    onProgress({
      step: 'illustrating',
      message: `Generated ${interleaved.filter(p => p.type === 'image').length} inline illustrations`,
      data: { partCount: interleaved.length },
    });
  } catch (err) {
    console.warn('[Research] Interleaved illustration failed, continuing without:', err);
    onProgress({
      step: 'illustrating',
      message: 'Illustration skipped (optional)',
    });
  }

  onProgress({
    step: 'complete',
    message: 'Research complete',
  });

  return {
    output,
    images: searchResults.images,
    sources: searchResults.textResults,
    interleaved,
    groundingSources: groundingChunks,
  };
}
