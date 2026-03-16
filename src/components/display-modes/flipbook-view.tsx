'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Quote,
  ShieldCheck,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { DisplayModeProps } from './index';
import type {
  ResearchSection,
  ContentBlock,
  TextBlock,
  ImageBlock,
  MapBlock,
  DiagramBlock,
  TimelineEntry,
} from '@/lib/research-schema';
import { Favicon } from '@/components/ui/favicon';
import { SmartImage } from './smart-image';

// ============================================================================
// Page types
// ============================================================================

type Page =
  | { kind: 'title'; title: string; subtitle: string; summary: string; locationName: string; heroImage?: string }
  | { kind: 'section'; section: ResearchSection; index: number; blockStart: number; blockEnd: number; totalPages: number; pageInSection: number }
  | { kind: 'timeline'; timeline: TimelineEntry[]; start: number; end: number }
  | { kind: 'sources'; sources: DisplayModeProps['sources'] };

// Max blocks per section page — keeps content from overflowing the fixed page height
const BLOCKS_PER_PAGE = 4;
// Max timeline entries per page
const TIMELINE_PER_PAGE = 5;

function buildPages(
  output: DisplayModeProps['output'],
  sources: DisplayModeProps['sources'],
  heroImages: string[],
): Page[] {
  const pages: Page[] = [];
  pages.push({
    kind: 'title',
    title: output.title,
    subtitle: output.subtitle,
    summary: output.summary,
    locationName: output.location?.name || '',
    heroImage: heroImages[0],
  });

  output.sections.forEach((section, idx) => {
    const blocks = section.blocks;
    const numPages = Math.ceil(blocks.length / BLOCKS_PER_PAGE) || 1;
    for (let p = 0; p < numPages; p++) {
      pages.push({
        kind: 'section',
        section,
        index: idx,
        blockStart: p * BLOCKS_PER_PAGE,
        blockEnd: Math.min((p + 1) * BLOCKS_PER_PAGE, blocks.length),
        totalPages: numPages,
        pageInSection: p,
      });
    }
  });

  if (output.timeline && output.timeline.length > 0) {
    const tl = output.timeline;
    for (let start = 0; start < tl.length; start += TIMELINE_PER_PAGE) {
      pages.push({
        kind: 'timeline',
        timeline: tl,
        start,
        end: Math.min(start + TIMELINE_PER_PAGE, tl.length),
      });
    }
  }

  if (sources && sources.length > 0) {
    pages.push({ kind: 'sources', sources });
  }
  return pages;
}

// ============================================================================
// Stage metadata
// ============================================================================

const stageLabels: Record<string, string> = {
  opening: 'Prologue',
  discovery: 'Origins & Discovery',
  key_events: 'Pivotal Moments',
  human_layer: 'The Human Story',
  today: 'The Present Day',
  closing: 'Epilogue',
};

const stageNumerals: Record<string, string> = {
  opening: 'I',
  discovery: 'II',
  key_events: 'III',
  human_layer: 'IV',
  today: 'V',
  closing: 'VI',
};

// ============================================================================
// Block renderers
// ============================================================================

function FlipTextBlock({ block, isFirst }: { block: TextBlock; isFirst: boolean }) {
  const content = block.content || '';
  if (block.style === 'headline') {
    return (
      <h3 className="text-sm sm:text-base font-serif font-bold text-stone-800 dark:text-stone-200 mb-2 mt-3 tracking-wide border-b border-stone-300/60 dark:border-stone-600/40 pb-1">
        {content}
      </h3>
    );
  }
  if (block.style === 'quote') {
    return (
      <blockquote className="relative my-3 mx-1 pl-4 border-l-[3px] border-amber-700/40 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 py-2 pr-2 rounded-r-sm">
        <Quote className="absolute -left-2 top-1 h-3.5 w-3.5 text-amber-700/30" />
        <p className="text-xs italic text-stone-700/80 dark:text-stone-300/70 leading-relaxed font-serif">
          &ldquo;{content}&rdquo;
        </p>
      </blockquote>
    );
  }
  if (block.style === 'caption') {
    return (
      <p className="text-[10px] italic text-stone-500/70 dark:text-stone-400/60 text-center my-1">
        {content}
      </p>
    );
  }
  const showDropCap = isFirst && content.length > 80;
  return (
    <p className="text-xs sm:text-sm leading-relaxed text-stone-800/85 dark:text-stone-200/80 mb-2.5 font-serif text-justify hyphens-auto">
      {showDropCap && (
        <span className="float-left text-4xl leading-[0.85] font-serif font-bold mr-1.5 mt-0.5 text-amber-800/80 dark:text-amber-400/70">
          {content[0]}
        </span>
      )}
      {showDropCap ? content.slice(1) : content}
    </p>
  );
}

function FlipImageBlock({ block, locationName, taskId }: { block: ImageBlock; locationName: string; taskId?: string | null }) {
  return (
    <SmartImage
      prompt={block.prompt} alt={block.alt}
      locationName={locationName} taskId={taskId}
      layout={block.layout} className="my-2.5"
    />
  );
}

function FlipMapBlock({ block }: { block: MapBlock }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  return (
    <figure className="my-2.5">
      <div className="relative overflow-hidden rounded-sm border border-stone-300/50 dark:border-stone-600/30 shadow-sm">
        <div className="aspect-video">
          {apiKey ? (
            <iframe width="100%" height="100%" frameBorder="0"
              style={{ border: 0, filter: 'sepia(0.1) saturate(0.95)' }}
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${block.lat},${block.lng}&zoom=${block.zoom || 12}&maptype=satellite`}
              allowFullScreen title={block.label}
            />
          ) : (
            <div className="w-full h-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-stone-400" />
            </div>
          )}
        </div>
      </div>
      {block.label && (
        <figcaption className="text-[9px] italic text-stone-500/60 text-center mt-1 flex items-center justify-center gap-1">
          <MapPin className="h-2 w-2" /> {block.label}
        </figcaption>
      )}
    </figure>
  );
}

function FlipDiagramBlock({ block }: { block: DiagramBlock }) {
  return (
    <div className="my-2.5 p-2.5 bg-stone-100/60 dark:bg-stone-800/40 rounded-sm border border-stone-300/40 dark:border-stone-600/30">
      <p className="text-[9px] font-medium uppercase tracking-wider text-stone-500/70 mb-1">{block.diagramType}</p>
      <p className="text-[10px] text-stone-600/70 dark:text-stone-400/60 italic">{block.prompt}</p>
    </div>
  );
}

function FlipBlock({ block, isFirst, locationName, taskId }: {
  block: ContentBlock; isFirst: boolean; locationName: string; taskId?: string | null;
}) {
  switch (block.type) {
    case 'text': return <FlipTextBlock block={block} isFirst={isFirst} />;
    case 'image': return <FlipImageBlock block={block} locationName={locationName} taskId={taskId} />;
    case 'map': return <FlipMapBlock block={block} />;
    case 'diagram': return <FlipDiagramBlock block={block} />;
    default: return null;
  }
}

// ============================================================================
// Page content renderers
// ============================================================================

function TitlePageContent({ page }: { page: Extract<Page, { kind: 'title' }> }) {
  return (
    <div className="flex flex-col items-center text-center px-5 sm:px-8 py-5 sm:py-8 h-full">
      {page.heroImage && (
        <div className="relative w-full max-w-[220px] mb-4 overflow-hidden rounded-sm border border-stone-300/50 dark:border-stone-600/30 shadow-md flex-shrink-0">
          <img src={page.heroImage} alt={page.title}
            className="w-full aspect-[4/3] object-cover"
            style={{ filter: 'sepia(0.08) saturate(0.92)' }}
          />
        </div>
      )}
      <div className="flex items-center gap-2 mb-3 w-full max-w-[220px]">
        <div className="h-px flex-1 bg-stone-400/40 dark:bg-stone-500/30" />
        <span className="text-amber-700/50 dark:text-amber-500/40 text-xs select-none">✦</span>
        <div className="h-px flex-1 bg-stone-400/40 dark:bg-stone-500/30" />
      </div>
      <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-800 dark:text-stone-100 tracking-wide leading-tight mb-1.5">
        {page.title}
      </h1>
      {page.subtitle && (
        <p className="text-xs text-stone-600/70 dark:text-stone-400/60 italic font-serif mb-2">{page.subtitle}</p>
      )}
      <div className="flex items-center justify-center gap-1 text-[9px] text-stone-500/60 dark:text-stone-400/50 mb-3">
        <MapPin className="h-2.5 w-2.5" />
        <span className="tracking-widest uppercase">{page.locationName}</span>
      </div>
      {page.summary && (
        <p className="text-[11px] italic text-stone-600/65 dark:text-stone-400/55 leading-relaxed font-serif max-w-[220px] text-justify hyphens-auto">
          {page.summary}
        </p>
      )}
      <div className="mt-auto pt-4 text-[8px] tracking-[0.2em] uppercase text-stone-400/50 dark:text-stone-500/40 font-sans">
        Tapestry · Historical Research
      </div>
    </div>
  );
}

function SectionPageContent({ page, locationName, taskId }: {
  page: Extract<Page, { kind: 'section' }>; locationName: string; taskId?: string | null;
}) {
  const { section, index, blockStart, blockEnd, totalPages, pageInSection } = page;
  const visibleBlocks = section.blocks.slice(blockStart, blockEnd);
  return (
    <div className="flex flex-col px-5 sm:px-7 py-4 sm:py-5">
      <div className="text-center mb-3 pb-2.5 border-b border-stone-300/50 dark:border-stone-600/30">
        <span className="text-[9px] font-sans font-semibold tracking-[0.3em] uppercase text-stone-400/70 dark:text-stone-500/60">
          Chapter {stageNumerals[section.stage] || (index + 1)}{totalPages > 1 ? ` · ${pageInSection + 1}/${totalPages}` : ''}
        </span>
        <h2 className="text-base sm:text-lg font-serif font-bold text-stone-800 dark:text-stone-100 mt-0.5 tracking-wide leading-tight">
          {section.title || stageLabels[section.stage] || section.stage}
        </h2>
        <div className="flex items-center justify-center gap-1 mt-1.5">
          <div className="h-px w-6 bg-amber-700/30 dark:bg-amber-500/25" />
          <div className="h-0.5 w-0.5 rounded-full bg-amber-700/40" />
          <div className="h-px w-6 bg-amber-700/30 dark:bg-amber-500/25" />
        </div>
      </div>
      <div>
        {visibleBlocks.map((block, blockIdx) => (
          <FlipBlock key={blockStart + blockIdx} block={block} isFirst={blockIdx === 0 && pageInSection === 0} locationName={locationName} taskId={taskId} />
        ))}
      </div>
    </div>
  );
}

function TimelinePageContent({ page }: { page: Extract<Page, { kind: 'timeline' }> }) {
  const entries = page.timeline.slice(page.start, page.end);
  const isFirst = page.start === 0;
  return (
    <div className="flex flex-col px-5 sm:px-7 py-4 sm:py-5">
      <div className="text-center mb-3 pb-2.5 border-b border-stone-300/50 dark:border-stone-600/30">
        <span className="text-[9px] font-sans font-semibold tracking-[0.3em] uppercase text-stone-400/70 dark:text-stone-500/60">Chronology</span>
        <h2 className="text-base sm:text-lg font-serif font-bold text-stone-800 dark:text-stone-100 mt-0.5">
          {isFirst ? 'Through the Ages' : `Through the Ages (cont.)`}
        </h2>
      </div>
      <div className="relative">
        <div className="absolute left-2.5 top-0 bottom-0 w-px bg-gradient-to-b from-amber-700/40 via-amber-700/20 to-transparent dark:from-amber-500/30" />
        <div className="space-y-3.5">
          {entries.map((entry, idx) => (
            <div key={page.start + idx} className="relative pl-7">
              <div className="absolute left-1 top-1.5 w-2.5 h-2.5 rounded-full bg-amber-700/60 dark:bg-amber-500/50 border-2 border-stone-100 dark:border-stone-800 shadow-sm" />
              <div className="text-[9px] font-mono font-bold text-amber-700/70 dark:text-amber-500/60 mb-0.5">{entry.year}</div>
              <h4 className="text-xs font-serif font-semibold text-stone-800/85 dark:text-stone-200/80 mb-0.5">{entry.title}</h4>
              <p className="text-[10px] text-stone-600/65 dark:text-stone-400/55 leading-relaxed">{entry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SourcesPageContent({ page }: { page: Extract<Page, { kind: 'sources' }> }) {
  return (
    <div className="flex flex-col px-5 sm:px-7 py-4 sm:py-5">
      <div className="text-center mb-3 pb-2.5 border-b border-stone-300/50 dark:border-stone-600/30">
        <span className="text-[9px] font-sans font-semibold tracking-[0.3em] uppercase text-stone-400/70 dark:text-stone-500/60">Bibliography</span>
        <h2 className="text-base sm:text-lg font-serif font-bold text-stone-800 dark:text-stone-100 mt-0.5">Sources</h2>
      </div>
      <div className="space-y-1.5">
        {page.sources.map((source, idx) => (
          <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer"
            className="group flex items-start gap-1.5 p-1.5 rounded-sm border border-stone-300/30 dark:border-stone-600/20 hover:border-stone-400/50 bg-stone-50/50 dark:bg-stone-800/30 transition-colors"
          >
            {source.url && <Favicon url={source.url} className="w-2.5 h-2.5 flex-shrink-0 mt-0.5 opacity-50" />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-medium line-clamp-1 text-stone-700/80 dark:text-stone-300/70">
                  {source.title || 'Untitled'}
                </span>
                {source.grounded && <ShieldCheck className="h-2 w-2 flex-shrink-0 text-emerald-600/50" />}
              </div>
              {source.snippet && <p className="text-[9px] text-stone-500/50 line-clamp-1 mt-0.5">{source.snippet}</p>}
            </div>
            <ExternalLink className="h-2 w-2 text-stone-400/30 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  );
}

function PageContent({ page, locationName, taskId }: { page: Page; locationName: string; taskId?: string | null }) {
  switch (page.kind) {
    case 'title': return <TitlePageContent page={page} />;
    case 'section': return <SectionPageContent page={page} locationName={locationName} taskId={taskId} />;
    case 'timeline': return <TimelinePageContent page={page} />;
    case 'sources': return <SourcesPageContent page={page} />;
  }
}

// ============================================================================
// Book Spine
// ============================================================================

function BookSpine({ title }: { title: string }) {
  return (
    <div
      className="hidden sm:flex flex-col items-center justify-between py-5 px-1.5 flex-shrink-0 select-none"
      style={{
        width: '32px',
        background: 'linear-gradient(90deg, #3d2b1a 0%, #5c3d22 30%, #7a5230 55%, #5c3d22 80%, #3d2b1a 100%)',
        boxShadow: 'inset -4px 0 10px rgba(0,0,0,0.4), inset 2px 0 4px rgba(255,200,100,0.08)',
        borderRadius: '3px 0 0 3px',
      }}
    >
      <span style={{ color: 'rgba(251,191,36,0.6)', fontSize: '10px' }}>✦</span>
      <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          fontSize: '8px', fontFamily: 'Georgia, serif', letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'rgba(251,191,36,0.45)',
          maxHeight: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </span>
      </div>
      <span style={{ color: 'rgba(251,191,36,0.6)', fontSize: '10px' }}>✦</span>
    </div>
  );
}

// ============================================================================
// Page paper background helper
// ============================================================================

function pageBg(dark: boolean) {
  return dark
    ? 'linear-gradient(160deg, #1e1c18 0%, #252219 50%, #1e1c18 100%)'
    : 'linear-gradient(160deg, #fdfaf3 0%, #f8f2e4 30%, #f3ead6 60%, #f8f2e4 100%)';
}

// ============================================================================
// Single page layer — used for both "under" and "over" layers
// ============================================================================

function PageLayer({
  page, locationName, taskId, pageNumber, isDark,
}: {
  page: Page; locationName: string; taskId?: string | null; pageNumber: number; isDark: boolean;
}) {
  const runningHeader = page.kind === 'title'
    ? 'Tapestry'
    : page.kind === 'section'
    ? stageLabels[(page as Extract<Page, { kind: 'section' }>).section.stage] || ''
    : page.kind === 'timeline' ? 'Chronology' : 'Bibliography';

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: pageBg(isDark) }}>
      {/* Paper grain */}
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: 0.04,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23g)'/%3E%3C/svg%3E")`,
        backgroundSize: '200px 200px',
      }} />
      {/* Spine shadow */}
      <div className="absolute top-0 left-0 bottom-0 w-5 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.10) 0%, transparent 100%)' }} />
      {/* Right edge shadow */}
      <div className="absolute top-0 right-0 bottom-0 w-6 pointer-events-none"
        style={{ background: 'linear-gradient(270deg, rgba(0,0,0,0.10) 0%, transparent 100%)' }} />
      {/* Running header */}
      <div className="absolute top-2.5 left-0 right-0 flex justify-center pointer-events-none">
        <span style={{ fontSize: '8px', letterSpacing: '0.25em', textTransform: 'uppercase', fontFamily: 'sans-serif', color: isDark ? 'rgba(200,190,170,0.30)' : 'rgba(100,80,50,0.35)' }}>
          {runningHeader}
        </span>
      </div>
      {/* Page number */}
      <div className="absolute top-2.5 right-4 pointer-events-none">
        <span style={{ fontSize: '9px', fontFamily: 'Georgia, serif', color: isDark ? 'rgba(200,190,170,0.30)' : 'rgba(100,80,50,0.35)' }}>
          {pageNumber + 1}
        </span>
      </div>
      {/* Content */}
      <div className="absolute inset-0 pt-6 overflow-y-auto overflow-x-hidden scrollbar-hide">
        <PageContent page={page} locationName={locationName} taskId={taskId} />
      </div>
    </div>
  );
}

// ============================================================================
// Main FlipbookView — two-layer page fold animation
// ============================================================================

export function FlipbookView({ output, sources, heroImages, locationName, taskId }: DisplayModeProps) {
  const pages = useMemo(() => buildPages(output, sources, heroImages), [output, sources, heroImages]);
  const [currentPage, setCurrentPage] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<1 | -1>(1);
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const paginate = useCallback((dir: 1 | -1) => {
    if (flipping) return;
    const next = currentPage + dir;
    if (next < 0 || next >= pages.length) return;
    setFlipDir(dir);
    setFlipping(true);
  }, [flipping, currentPage, pages.length]);

  // When flip animation completes, advance the page
  const onFlipComplete = useCallback(() => {
    setCurrentPage(p => p + flipDir);
    setFlipping(false);
  }, [flipDir]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); paginate(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); paginate(-1); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paginate]);

  const nextPage = currentPage + flipDir;
  const underPage = flipping ? (flipDir === 1 ? nextPage : currentPage) : currentPage;
  const overPage  = flipping ? (flipDir === 1 ? currentPage : nextPage) : currentPage;

  // Forward flip: fold from right edge (transformOrigin right center), rotateY 0→-180
  // Backward flip: fold from left edge (transformOrigin left center), rotateY 0→180
  const foldOrigin = flipDir === 1 ? 'right center' : 'left center';
  const foldTarget = flipDir === 1 ? -180 : 180;

  return (
    <div className="relative w-full" style={{ filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.25)) drop-shadow(0 2px 6px rgba(0,0,0,0.15))' }}>
      {/* Book body */}
      <div className="flex" style={{ borderRadius: '4px', overflow: 'hidden' }}>
        <BookSpine title={output.title} />

        {/* Page viewport */}
        <div
          className="relative flex-1 cursor-pointer"
          style={{ minHeight: '520px', height: '520px', perspective: '1400px' }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('a, button, iframe, input, textarea, select')) return;
            const rect = e.currentTarget.getBoundingClientRect();
            paginate(e.clientX - rect.left < rect.width / 2 ? -1 : 1);
          }}
        >
          {/* Layer 1: the page that will be revealed (sits underneath) */}
          {pages[underPage] && (
            <PageLayer
              page={pages[underPage]}
              locationName={locationName}
              taskId={taskId}
              pageNumber={underPage}
              isDark={isDark}
            />
          )}

          {/* Layer 2: the page that folds away (sits on top, animates) */}
          {pages[overPage] && (
            <motion.div
              key={`flip-${overPage}-${flipping}`}
              className="absolute inset-0"
              style={{
                transformOrigin: foldOrigin,
                transformStyle: 'preserve-3d',
                zIndex: 10,
              }}
              animate={flipping ? { rotateY: foldTarget } : { rotateY: 0 }}
              transition={flipping ? {
                duration: 0.65,
                ease: [0.4, 0, 0.2, 1],
              } : { duration: 0 }}
              onAnimationComplete={flipping ? onFlipComplete : undefined}
            >
              {/* Front face */}
              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
                <PageLayer
                  page={pages[overPage]}
                  locationName={locationName}
                  taskId={taskId}
                  pageNumber={overPage}
                  isDark={isDark}
                />
                {/* Shadow that grows as page folds */}
                {flipping && (
                  <div className="absolute inset-0 pointer-events-none" style={{
                    background: flipDir === 1
                      ? 'linear-gradient(270deg, rgba(0,0,0,0.18) 0%, transparent 60%)'
                      : 'linear-gradient(90deg, rgba(0,0,0,0.18) 0%, transparent 60%)',
                  }} />
                )}
              </div>
              {/* Back face — shows the reverse side of the folding page (slightly darker paper) */}
              <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
                <div className="absolute inset-0" style={{
                  background: isDark
                    ? 'linear-gradient(160deg, #181510 0%, #1c1a14 100%)'
                    : 'linear-gradient(160deg, #ede5cc 0%, #e8ddc0 100%)',
                }} />
              </div>
            </motion.div>
          )}

          {/* Corner peel hint */}
          {!flipping && currentPage < pages.length - 1 && (
            <div className="absolute bottom-0 right-0 pointer-events-none z-20 group-hover:opacity-100">
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 0, height: 0,
                  borderStyle: 'solid',
                  borderWidth: '0 0 22px 22px',
                  borderColor: `transparent transparent ${isDark ? 'rgba(180,140,60,0.4)' : 'rgba(160,120,50,0.35)'} transparent`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-3 px-1">
        <button onClick={() => paginate(-1)} disabled={currentPage === 0 || flipping} aria-label="Previous page"
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-serif italic text-stone-500/60 dark:text-stone-400/50 hover:text-stone-700 dark:hover:text-stone-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors rounded">
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">prev</span>
        </button>

        <div className="flex items-center gap-1.5">
          {pages.map((_, idx) => (
            <button key={idx}
              onClick={() => { if (!flipping) { setFlipDir(idx > currentPage ? 1 : -1); setCurrentPage(idx); } }}
              aria-label={`Go to page ${idx + 1}`}
              className={`rounded-full transition-all duration-300 ${
                idx === currentPage
                  ? 'w-5 h-1.5 bg-amber-700/60 dark:bg-amber-500/50'
                  : 'w-1.5 h-1.5 bg-stone-400/30 dark:bg-stone-500/25 hover:bg-stone-400/50'
              }`}
            />
          ))}
          <span className="ml-2 text-[10px] text-stone-400/50 dark:text-stone-500/40 tabular-nums font-serif">
            {currentPage + 1} / {pages.length}
          </span>
        </div>

        <button onClick={() => paginate(1)} disabled={currentPage === pages.length - 1 || flipping} aria-label="Next page"
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-serif italic text-stone-500/60 dark:text-stone-400/50 hover:text-stone-700 dark:hover:text-stone-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors rounded">
          <span className="hidden sm:inline">next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
