/**
 * Display modes — different visual formats for rendering the same ResearchOutput.
 * Generate once, display in any format.
 */

export type DisplayMode = 'scroll' | 'timeline' | 'flipbook' | 'interleaved';

export interface DisplayModeProps {
  output: import('@/lib/research-schema').ResearchOutput;
  sources: Array<{
    title: string;
    url: string;
    snippet?: string;
    grounded?: boolean;
  }>;
  heroImages: string[];
  interleavedParts: Array<{ type: string; text?: string; imageUrl?: string }>;
  locationName: string;
  taskId?: string | null;
}

export { DisplayModeSelector } from './display-mode-selector';
export { DocumentaryScroll } from './documentary-scroll';
export { FlipbookView } from './flipbook-view';
export { TimelineExplorer } from './timeline-explorer';
export { InterleavedNarrative } from './interleaved-narrative';
