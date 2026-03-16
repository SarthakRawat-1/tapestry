'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { MapPin, Quote, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
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
// Parchment SVG filter — gives the wavy, aged-paper edge effect
// ============================================================================
function ParchmentFilter() {
  return (
    <svg className="hidden absolute" aria-hidden="true">
      <filter id="parchment-rough">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.04"
          numOctaves="5"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="3"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
      <filter id="parchment-stain">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.02"
          numOctaves="3"
          seed="2"
          result="stain"
        />
        <feColorMatrix
          in="stain"
          type="matrix"
          values="0 0 0 0 0.55
                  0 0 0 0 0.35
                  0 0 0 0 0.15
                  0 0 0 0.08 0"
          result="colored"
        />
        <feComposite in="colored" in2="SourceGraphic" operator="atop" />
        <feBlend in2="SourceGraphic" mode="multiply" />
      </filter>
    </svg>
  );
}

// ============================================================================
// Decorative scroll roller (top/bottom)
// ============================================================================
function ScrollRoller({ position }: { position: 'top' | 'bottom' }) {
  return (
    <div
      className={`relative w-full h-8 sm:h-10 flex items-center justify-center ${
        position === 'top' ? 'mb-0' : 'mt-0'
      }`}
    >
      {/* Wooden rod */}
      <div className="absolute inset-x-4 sm:inset-x-8 h-3 sm:h-4 rounded-full bg-gradient-to-b from-amber-700 via-amber-800 to-amber-900 dark:from-amber-800 dark:via-amber-900 dark:to-amber-950 shadow-md" />
      {/* Rod highlights */}
      <div className="absolute inset-x-4 sm:inset-x-8 h-1 top-1 rounded-full bg-amber-600/40 dark:bg-amber-700/30" />
      {/* End caps */}
      <div className="absolute left-1 sm:left-4 w-5 sm:w-7 h-5 sm:h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-900 dark:from-amber-700 dark:to-amber-950 border-2 border-amber-950/30 shadow-lg" />
      <div className="absolute right-1 sm:right-4 w-5 sm:w-7 h-5 sm:h-7 rounded-full bg-gradient-to-br from-amber-600 to-amber-900 dark:from-amber-700 dark:to-amber-950 border-2 border-amber-950/30 shadow-lg" />
      {/* Shadow under roller */}
      {position === 'top' && (
        <div className="absolute -bottom-3 inset-x-6 h-3 bg-gradient-to-b from-black/10 to-transparent rounded-full blur-sm" />
      )}
      {position === 'bottom' && (
        <div className="absolute -top-3 inset-x-6 h-3 bg-gradient-to-t from-black/10 to-transparent rounded-full blur-sm" />
      )}
    </div>
  );
}

// ============================================================================
// Drop cap for opening paragraphs
// ============================================================================
function DropCap({ letter }: { letter: string }) {
  return (
    <span
      className="float-left text-5xl sm:text-6xl leading-[0.8] font-serif font-bold mr-2 mt-1 text-amber-900/80 dark:text-amber-200/70"
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
    >
      {letter}
    </span>
  );
}

// ============================================================================
// Section divider — ornamental flourish
// ============================================================================
function SectionDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-6 sm:py-8">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-800/30 to-transparent dark:via-amber-400/20" />
      <div className="text-amber-800/40 dark:text-amber-400/30 text-lg select-none">❧</div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-amber-800/30 to-transparent dark:via-amber-400/20" />
    </div>
  );
}

// ============================================================================
// Stage label — maps section stages to display labels
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
// Content block renderers
// ============================================================================

function TextBlockRenderer({ block, isFirst }: { block: TextBlock; isFirst: boolean }) {
  const content = block.content || '';

  if (block.style === 'headline') {
    return (
      <h3
        className="text-xl sm:text-2xl font-serif font-semibold text-amber-950/90 dark:text-amber-100/90 tracking-wide mb-4"
        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
      >
        {content}
      </h3>
    );
  }

  if (block.style === 'quote') {
    return (
      <blockquote className="relative my-6 sm:my-8 pl-6 sm:pl-8 border-l-2 border-amber-800/30 dark:border-amber-400/20">
        <Quote className="absolute -left-3 -top-2 h-6 w-6 text-amber-800/20 dark:text-amber-400/15" />
        <p
          className="text-base sm:text-lg italic text-amber-950/75 dark:text-amber-100/70 leading-relaxed font-serif"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          &ldquo;{content}&rdquo;
        </p>
      </blockquote>
    );
  }

  if (block.style === 'caption') {
    return (
      <p className="text-xs sm:text-sm italic text-amber-900/50 dark:text-amber-200/40 text-center my-2">
        {content}
      </p>
    );
  }

  // narration (default)
  const showDropCap = isFirst && content.length > 50;

  return (
    <p
      className="text-sm sm:text-base leading-relaxed sm:leading-loose text-amber-950/80 dark:text-amber-100/75 mb-4 sm:mb-5 font-serif"
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
    >
      {showDropCap && <DropCap letter={content[0]} />}
      {showDropCap ? content.slice(1) : content}
    </p>
  );
}

function ImageBlockRenderer({ block, locationName, taskId }: { block: ImageBlock; locationName: string; taskId?: string | null }) {
  return (
    <SmartImage
      prompt={block.prompt}
      alt={block.alt}
      locationName={locationName}
      taskId={taskId}
      layout={block.layout}
      className="my-6 sm:my-8"
    />
  );
}

function MapBlockRenderer({ block }: { block: MapBlock }) {
  const googleMapsApiKey = typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '')
    : '';

  return (
    <figure className="my-6 sm:my-8">
      <div className="relative overflow-hidden rounded-sm border border-amber-900/20 dark:border-amber-400/15 shadow-md">
        <div className="absolute inset-0 border-4 border-amber-900/10 dark:border-amber-400/5 rounded-sm z-10 pointer-events-none" />
        <div className="aspect-video">
          {googleMapsApiKey ? (
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0, filter: 'sepia(0.2) saturate(0.9)' }}
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${googleMapsApiKey}&q=${block.lat},${block.lng}&zoom=${block.zoom || 12}&maptype=satellite`}
              allowFullScreen
              title={block.label}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-950/40 dark:to-amber-900/30 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-amber-800/30" />
            </div>
          )}
        </div>
      </div>
      {block.label && (
        <figcaption className="text-xs italic text-amber-900/50 dark:text-amber-200/40 text-center mt-2 flex items-center justify-center gap-1">
          <MapPin className="h-3 w-3" />
          {block.label}{block.description ? ` — ${block.description}` : ''}
        </figcaption>
      )}
    </figure>
  );
}

function DiagramBlockRenderer({ block }: { block: DiagramBlock }) {
  return (
    <div className="my-6 sm:my-8 p-4 sm:p-6 bg-amber-50/50 dark:bg-amber-950/20 rounded-sm border border-amber-900/15 dark:border-amber-400/10">
      <p className="text-xs font-medium uppercase tracking-wider text-amber-800/50 dark:text-amber-300/40 mb-2">
        {block.diagramType}
      </p>
      <p className="text-sm text-amber-950/70 dark:text-amber-100/60 italic">
        {block.prompt}
      </p>
    </div>
  );
}

function BlockRenderer({ block, isFirst, locationName, taskId }: { block: ContentBlock; isFirst: boolean; locationName: string; taskId?: string | null }) {
  switch (block.type) {
    case 'text':
      return <TextBlockRenderer block={block} isFirst={isFirst} />;
    case 'image':
      return <ImageBlockRenderer block={block} locationName={locationName} taskId={taskId} />;
    case 'map':
      return <MapBlockRenderer block={block} />;
    case 'diagram':
      return <DiagramBlockRenderer block={block} />;
    default:
      return null;
  }
}

// ============================================================================
// Section renderer — each section unrolls into view
// ============================================================================

function ScrollSection({ section, index, locationName, taskId }: { section: ResearchSection; index: number; locationName: string; taskId?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
    >
      {index > 0 && <SectionDivider />}

      {/* Section header */}
      <div className="text-center mb-6 sm:mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <span className="text-xs sm:text-sm font-medium tracking-[0.3em] uppercase text-amber-800/40 dark:text-amber-400/30">
            Chapter {stageNumerals[section.stage] || (index + 1)}
          </span>
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-serif font-light text-amber-950/90 dark:text-amber-100/85 mt-2 tracking-wide"
            style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
          >
            {section.title || stageLabels[section.stage] || section.stage}
          </h2>
          <div className="mt-3 mx-auto w-16 h-px bg-amber-800/30 dark:bg-amber-400/20" />
        </motion.div>
      </div>

      {/* Section content blocks */}
      <div className="space-y-1">
        {section.blocks.map((block, blockIdx) => (
          <motion.div
            key={blockIdx}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
              delay: Math.min(blockIdx * 0.05, 0.3),
            }}
          >
            <BlockRenderer
              block={block}
              isFirst={blockIdx === 0}
              locationName={locationName}
              taskId={taskId}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Timeline section — rendered at the bottom of the scroll
// ============================================================================

function ScrollTimeline({ timeline }: { timeline: TimelineEntry[] }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="mt-8 sm:mt-12">
      <SectionDivider />
      <div className="text-center mb-6 sm:mb-8">
        <span className="text-xs sm:text-sm font-medium tracking-[0.3em] uppercase text-amber-800/40 dark:text-amber-400/30">
          Chronology
        </span>
        <h2
          className="text-2xl sm:text-3xl font-serif font-light text-amber-950/90 dark:text-amber-100/85 mt-2 tracking-wide"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          Through the Ages
        </h2>
        <div className="mt-3 mx-auto w-16 h-px bg-amber-800/30 dark:bg-amber-400/20" />
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-px bg-gradient-to-b from-amber-800/30 via-amber-800/20 to-transparent dark:from-amber-400/20 dark:via-amber-400/10" />

        <div className="space-y-6 sm:space-y-8">
          {timeline.map((entry, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: Math.min(idx * 0.08, 0.4) }}
              className="relative pl-10 sm:pl-16"
            >
              {/* Dot on timeline */}
              <div className="absolute left-2.5 sm:left-4.5 top-1 w-3 h-3 rounded-full bg-amber-700/60 dark:bg-amber-400/50 border-2 border-amber-100 dark:border-amber-950 shadow-sm" />

              {/* Year */}
              <div className="text-xs sm:text-sm font-mono font-bold text-amber-800/70 dark:text-amber-300/60 mb-1">
                {entry.year}
              </div>

              {/* Title & description */}
              <h4
                className="text-sm sm:text-base font-serif font-semibold text-amber-950/85 dark:text-amber-100/80 mb-1"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                {entry.title}
              </h4>
              <p className="text-xs sm:text-sm text-amber-900/60 dark:text-amber-200/50 leading-relaxed">
                {entry.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sources footer
// ============================================================================

function ScrollSources({ sources }: { sources: DisplayModeProps['sources'] }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-8 sm:mt-12">
      <SectionDivider />
      <div className="text-center mb-4 sm:mb-6">
        <span className="text-xs font-medium tracking-[0.3em] uppercase text-amber-800/40 dark:text-amber-400/30">
          Sources & References
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sources.map((source, idx) => (
          <a
            key={idx}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-start gap-2 p-2.5 rounded-sm border transition-colors text-left ${
              source.grounded
                ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-800/15 dark:border-emerald-400/10 hover:border-emerald-700/30'
                : 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-800/15 dark:border-amber-400/10 hover:border-amber-700/30'
            }`}
          >
            {source.url && (
              <Favicon url={source.url} className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-60" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-medium line-clamp-1 text-amber-950/70 dark:text-amber-100/60 group-hover:text-amber-800 dark:group-hover:text-amber-200 transition-colors">
                  {source.title || 'Untitled'}
                </span>
                {source.grounded && (
                  <ShieldCheck className="h-2.5 w-2.5 flex-shrink-0 text-emerald-700/60 dark:text-emerald-400/50" />
                )}
              </div>
              {source.snippet && (
                <p className="text-[10px] text-amber-900/40 dark:text-amber-200/30 line-clamp-1 mt-0.5">
                  {source.snippet}
                </p>
              )}
            </div>
            <ExternalLink className="h-2.5 w-2.5 text-amber-800/20 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main component — the ancient scroll
// ============================================================================

export function DocumentaryScroll({ output, sources, heroImages, locationName, taskId }: DisplayModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Subtle parallax for the parchment stain overlay
  const stainY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);

  return (
    <>
      <ParchmentFilter />

      <div ref={containerRef} className="relative">
        {/* ── Top scroll roller ── */}
        <ScrollRoller position="top" />

        {/* ── Parchment body ── */}
        <div
          className="relative mx-auto overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #faf6e9 0%, #f5edd6 20%, #f0e6c8 50%, #f5edd6 80%, #faf6e9 100%)',
            boxShadow: '2px 3px 20px rgba(0,0,0,0.15), 0 0 60px rgba(138,77,15,0.08) inset',
            filter: 'url(#parchment-rough)',
          }}
        >
          {/* Dark mode override */}
          <div className="hidden dark:block absolute inset-0 bg-gradient-to-b from-amber-950/95 via-stone-950/95 to-amber-950/95" />

          {/* Stain overlay — moves slightly with scroll for depth */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-30 dark:opacity-15"
            style={{
              y: stainY,
              filter: 'url(#parchment-stain)',
              background: 'radial-gradient(ellipse at 30% 20%, rgba(139,90,43,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 60%, rgba(139,90,43,0.1) 0%, transparent 40%), radial-gradient(ellipse at 50% 90%, rgba(139,90,43,0.12) 0%, transparent 45%)',
            }}
          />

          {/* Aged edge vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 80px rgba(120,70,20,0.12), inset 0 0 30px rgba(120,70,20,0.06)',
            }}
          />

          {/* Crumbled/torn edge effect — left and right */}
          <div className="absolute top-0 bottom-0 left-0 w-3 sm:w-5 bg-gradient-to-r from-amber-900/8 to-transparent dark:from-amber-400/5 pointer-events-none" />
          <div className="absolute top-0 bottom-0 right-0 w-3 sm:w-5 bg-gradient-to-l from-amber-900/8 to-transparent dark:from-amber-400/5 pointer-events-none" />

          {/* ── Content ── */}
          <div className="relative z-10 px-6 sm:px-10 md:px-16 lg:px-20 py-8 sm:py-12 max-w-4xl mx-auto">

            {/* Title block */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-8 sm:mb-12"
            >
              {/* Decorative top ornament */}
              <div className="text-amber-800/25 dark:text-amber-400/15 text-2xl mb-4 select-none">
                ✦ ✦ ✦
              </div>

              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-serif font-light text-amber-950/90 dark:text-amber-100/85 tracking-wide leading-tight"
                style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
              >
                {output.title}
              </h1>

              {output.subtitle && (
                <p
                  className="text-sm sm:text-base text-amber-900/50 dark:text-amber-200/40 mt-3 italic font-serif"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                >
                  {output.subtitle}
                </p>
              )}

              {/* Location badge */}
              <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-amber-800/40 dark:text-amber-300/30">
                <MapPin className="h-3 w-3" />
                <span className="tracking-wider uppercase">{locationName}</span>
                <span className="mx-1">·</span>
                <span>{output.location?.lat?.toFixed(2)}°, {output.location?.lng?.toFixed(2)}°</span>
              </div>

              {/* Decorative line */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <div className="h-px w-12 bg-amber-800/20 dark:bg-amber-400/15" />
                <div className="h-1.5 w-1.5 rounded-full bg-amber-800/30 dark:bg-amber-400/20" />
                <div className="h-px w-12 bg-amber-800/20 dark:bg-amber-400/15" />
              </div>
            </motion.div>

            {/* Summary */}
            {output.summary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-center mb-8 sm:mb-12 max-w-2xl mx-auto"
              >
                <p
                  className="text-sm sm:text-base italic text-amber-900/60 dark:text-amber-200/50 leading-relaxed font-serif"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                >
                  {output.summary}
                </p>
              </motion.div>
            )}

            {/* Hero image */}
            {heroImages && heroImages.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mb-8 sm:mb-12"
              >
                <div className="relative overflow-hidden rounded-sm border border-amber-900/20 dark:border-amber-400/15 shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-transparent to-amber-800/10 z-10 pointer-events-none" />
                  <img
                    src={heroImages[0]}
                    alt={output.title}
                    className="w-full aspect-video object-cover"
                    style={{ filter: 'sepia(0.15) saturate(0.9)' }}
                  />
                </div>
              </motion.div>
            )}

            {/* Sections */}
            {output.sections.map((section, idx) => (
              <ScrollSection
                key={idx}
                section={section}
                index={idx}
                locationName={locationName}
                taskId={taskId}
              />
            ))}

            {/* Timeline */}
            <ScrollTimeline timeline={output.timeline} />

            {/* Sources */}
            <ScrollSources sources={sources} />

            {/* End ornament */}
            <div className="text-center mt-8 sm:mt-12 pb-4">
              <div className="text-amber-800/25 dark:text-amber-400/15 text-lg select-none">
                — ✦ —
              </div>
              <p className="text-[10px] text-amber-800/30 dark:text-amber-400/20 mt-2 tracking-widest uppercase">
                Finis
              </p>
            </div>
          </div>
        </div>

        {/* ── Bottom scroll roller ── */}
        <ScrollRoller position="bottom" />
      </div>
    </>
  );
}
