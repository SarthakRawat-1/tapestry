/**
 * Research output schema — the structured JSON format that Gemini returns.
 * All display modes (flipbook, timeline, scroll, etc.) consume this same shape.
 */

// ============================================================================
// TypeScript types
// ============================================================================

export interface ResearchOutput {
  title: string;
  subtitle: string;
  summary: string;
  location: {
    name: string;
    lat: number;
    lng: number;
  };
  sections: ResearchSection[];
  timeline: TimelineEntry[];
}

export interface ResearchSection {
  stage: 'opening' | 'discovery' | 'key_events' | 'human_layer' | 'today' | 'closing';
  title: string;
  blocks: ContentBlock[];
}

export type ContentBlock =
  | TextBlock
  | ImageBlock
  | DiagramBlock
  | MapBlock;

export interface TextBlock {
  type: 'text';
  style: 'narration' | 'headline' | 'quote' | 'caption';
  content: string;
}

export interface ImageBlock {
  type: 'image';
  prompt: string;
  alt: string;
  layout: 'full_bleed' | 'inline' | 'background';
}

export interface DiagramBlock {
  type: 'diagram';
  prompt: string;
  diagramType: 'comparison' | 'flowchart' | 'infographic' | 'timeline_chart';
}

export interface MapBlock {
  type: 'map';
  lat: number;
  lng: number;
  zoom: number;
  label: string;
  description: string;
}

export interface TimelineEntry {
  year: string;
  title: string;
  description: string;
  imagePrompt: string;
}

// ============================================================================
// JSON Schema for Gemini structured output (JSON Schema draft compatible)
// ============================================================================

export const researchJsonSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'A compelling documentary-style title for the research.',
    },
    subtitle: {
      type: 'string',
      description: 'A short tagline or subtitle.',
    },
    summary: {
      type: 'string',
      description: 'A 2-3 sentence overview suitable for sharing and previews.',
    },
    location: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        lat: { type: 'number' },
        lng: { type: 'number' },
      },
      required: ['name', 'lat', 'lng'],
    },
    sections: {
      type: 'array',
      description: 'Ordered story sections following the documentary arc.',
      items: {
        type: 'object',
        properties: {
          stage: {
            type: 'string',
            description: 'Story arc stage: opening, discovery, key_events, human_layer, today, or closing.',
          },
          title: {
            type: 'string',
            description: 'Section heading.',
          },
          blocks: {
            type: 'array',
            description: 'Content blocks within this section.',
            items: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Block type: text, image, diagram, or map.',
                },
                // text block fields
                style: {
                  type: 'string',
                  description: 'Text style: narration, headline, quote, or caption. Only for text blocks.',
                },
                content: {
                  type: 'string',
                  description: 'Text content. Only for text blocks.',
                },
                // image block fields
                prompt: {
                  type: 'string',
                  description: 'Detailed visual prompt for image generation or diagram description.',
                },
                alt: {
                  type: 'string',
                  description: 'Accessibility description for images.',
                },
                layout: {
                  type: 'string',
                  description: 'Image layout: full_bleed, inline, or background. Only for image blocks.',
                },
                // diagram block fields
                diagramType: {
                  type: 'string',
                  description: 'Diagram type: comparison, flowchart, infographic, or timeline_chart. Only for diagram blocks.',
                },
                // map block fields
                lat: { type: 'number', description: 'Latitude for map blocks.' },
                lng: { type: 'number', description: 'Longitude for map blocks.' },
                zoom: { type: 'number', description: 'Map zoom level (1-18).' },
                label: { type: 'string', description: 'Map marker label.' },
                description: {
                  type: 'string',
                  description: 'Map location description.',
                },
              },
              required: ['type'],
            },
          },
        },
        required: ['stage', 'title', 'blocks'],
      },
    },
    timeline: {
      type: 'array',
      description: 'Key historical events in chronological order.',
      items: {
        type: 'object',
        properties: {
          year: { type: 'string', description: 'Year or date string (e.g. "1506", "3000 BCE").' },
          title: { type: 'string', description: 'Short event title.' },
          description: { type: 'string', description: '1-2 sentence description of the event.' },
          imagePrompt: { type: 'string', description: 'Image prompt to visualize this event.' },
        },
        required: ['year', 'title', 'description', 'imagePrompt'],
      },
    },
  },
  required: ['title', 'subtitle', 'summary', 'location', 'sections', 'timeline'],
};
