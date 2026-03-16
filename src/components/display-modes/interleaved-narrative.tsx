'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { Sparkles, ImageIcon, ShieldCheck, MapPin, Film } from 'lucide-react';
import type { DisplayModeProps } from './index';
import { Favicon } from '@/components/ui/favicon';

// ============================================================================
// Film grain SVG filter
// ============================================================================
function FilmFilter() {
  return (
    <svg className="hidden absolute" aria-hidden="true">
      <filter id="film-grain" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.75"
          numOctaves="4"
          seed="15"
          result="noise"
        />
        <feColorMatrix
          in="noise"
          type="saturate"
          values="0"
          result="grayNoise"
        />
        <feBlend in="SourceGraphic" in2="grayNoise" mode="overlay" result="blended" />
        <feComposite in="blended" in2="SourceGraphic" operator="in" />
      </filter>
    </svg>
  );
}

// ============================================================================
// Sprocket holes — the film strip detail running down each side
// ============================================================================
function SprocketStrip({ side }: { side: 'left' | 'right' }) {
  const holes = Array.from({ length: 28 });
  return (
    <div
      className={`absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'} w-7 sm:w-9 flex flex-col items-center py-4 gap-[18px] overflow-hidden`}
      style={{ background: 'linear-gradient(to right, #1a1005, #221508, #1a1005)' }}
    >
      {/* Edge line */}
      <div
        className={`absolute top-0 bottom-0 ${side === 'left' ? 'right-0' : 'left-0'} w-px`}
        style={{ background: 'rgba(180,120,40,0.15)' }}
      />
      {holes.map((_, i) => (
        <div
          key={i}
          className="w-3 h-4 sm:w-3.5 sm:h-5 rounded-sm flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(160,100,30,0.55), rgba(120,70,15,0.4))',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6), inset 0 -1px 1px rgba(200,140,50,0.12), 0 0 3px rgba(0,0,0,0.5)',
            border: '1px solid rgba(100,60,10,0.4)',
          }}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Individual text passage — screenplay style
// ============================================================================
function FilmTextPart({ text, index }: { text: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-xl mx-auto px-8 sm:px-12 py-2"
    >
      {/* Scene number */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1" style={{ background: 'rgba(180,120,40,0.15)' }} />
        <span
          className="text-[9px] font-mono tracking-[0.3em] uppercase"
          style={{ color: 'rgba(180,120,40,0.35)' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="h-px flex-1" style={{ background: 'rgba(180,120,40,0.15)' }} />
      </div>
      <p
        className="text-sm sm:text-base leading-relaxed sm:leading-loose font-serif text-center"
        style={{ color: 'rgba(225,205,165,0.82)', textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
      >
        {text}
      </p>
    </motion.div>
  );
}

// ============================================================================
// Individual image — projected slide with light leak edges
// ============================================================================
function FilmImagePart({ imageUrl, index }: { imageUrl: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="relative my-2 mx-6 sm:mx-10"
    >
      {/* Slide frame */}
      <div
        className="relative overflow-hidden"
        style={{
          boxShadow: '0 0 0 2px rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.7), 0 0 60px rgba(0,0,0,0.4)',
        }}
      >
        {/* Light leak — top */}
        <div
          className="absolute top-0 inset-x-0 h-12 z-10 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(255,220,150,0.06), transparent)' }}
        />
        {/* Light leak — corner */}
        <div
          className="absolute top-0 left-0 w-32 h-32 z-10 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 0% 0%, rgba(255,200,100,0.08), transparent 70%)' }}
        />

        <img
          src={imageUrl}
          alt={`Visual story illustration ${index + 1}`}
          className="w-full aspect-video object-cover block"
          style={{ filter: 'contrast(1.04) saturate(0.88) brightness(0.92)' }}
        />

        {/* Vignette overlay */}
        <div
          className="absolute inset-0 z-10 pointer-events-none"
          style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3)' }}
        />

        {/* AI badge */}
        <div
          className="absolute bottom-3 right-3 z-20 flex items-center gap-1 px-2 py-0.5 rounded-sm text-[9px]"
          style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            color: 'rgba(255,255,255,0.45)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Sparkles className="h-2.5 w-2.5" />
          AI Generated
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Fallback — no interleaved parts
// ============================================================================
function FallbackView({ output }: { output: DisplayModeProps['output'] }) {
  const narrationBlocks = output.sections.flatMap((section) =>
    section.blocks
      .filter((b): b is import('@/lib/research-schema').TextBlock => b.type === 'text' && b.style === 'narration')
      .map((b) => b.content),
  );

  return (
    <div className="py-10 px-8 sm:px-12 text-center space-y-6">
      <div>
        <Film className="h-8 w-8 mx-auto mb-3" style={{ color: 'rgba(180,120,40,0.3)' }} />
        <p className="text-xs italic" style={{ color: 'rgba(180,120,40,0.4)' }}>
          AI-illustrated narrative unavailable. Showing condensed story.
        </p>
      </div>
      {narrationBlocks.slice(0, 6).map((text, idx) => (
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: idx * 0.04 }}
          className="text-sm leading-relaxed font-serif max-w-xl mx-auto"
          style={{ color: 'rgba(215,190,145,0.7)' }}
        >
          {text}
        </motion.p>
      ))}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================
export function InterleavedNarrative({ output, sources, interleavedParts, locationName }: DisplayModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const grainY = useTransform(scrollYProgress, [0, 1], ['0%', '12%']);

  const hasParts = interleavedParts && interleavedParts.length > 0;
  const imageCount = interleavedParts?.filter((p) => p.type === 'image').length || 0;
  const textCount = interleavedParts?.filter((p) => p.type === 'text').length || 0;

  // Track text index separately for scene numbering
  let textIdx = -1;

  return (
    <>
      <FilmFilter />

      <div ref={containerRef} className="relative">
        {/* Film strip container */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            background: 'linear-gradient(175deg, #2a1f0e 0%, #231a0a 30%, #1e1608 60%, #261c0c 100%)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.6), inset 0 0 80px rgba(0,0,0,0.3)',
          }}
        >
          {/* Sprocket strips */}
          <SprocketStrip side="left" />
          <SprocketStrip side="right" />

          {/* Subtle grain overlay */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-[0.035]"
            style={{
              y: grainY,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
              backgroundSize: '256px 256px',
            }}
          />

          {/* Horizontal scan line — warm amber tint */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.018]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(200,140,60,0.5) 2px, rgba(200,140,60,0.5) 3px)',
              backgroundSize: '100% 3px',
            }}
          />

          {/* Content — inset from sprocket strips */}
          <div className="relative z-10 py-10 sm:py-14" style={{ marginLeft: '28px', marginRight: '28px' }}>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-10 sm:mb-14 px-4"
            >
              {/* Film badge */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm mb-4"
                style={{
                  background: 'rgba(180,120,40,0.1)',
                  border: '1px solid rgba(180,120,40,0.18)',
                }}
              >
                <Film className="h-3 w-3" style={{ color: 'rgba(200,150,70,0.55)' }} />
                <span
                  className="text-[10px] font-mono tracking-[0.25em] uppercase"
                  style={{ color: 'rgba(200,150,70,0.55)' }}
                >
                  Visual Story
                </span>
              </div>

              <h1
                className="text-2xl sm:text-3xl font-serif font-light tracking-wide mb-2"
                style={{ color: 'rgba(235,215,175,0.90)', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
              >
                {output.title}
              </h1>

              <div
                className="flex items-center justify-center gap-1.5 text-xs mb-4"
                style={{ color: 'rgba(180,130,60,0.4)' }}
              >
                <MapPin className="h-3 w-3" />
                <span className="tracking-[0.2em] uppercase font-mono text-[10px]">{locationName}</span>
              </div>

              {hasParts && (
                <div
                  className="flex items-center justify-center gap-3 text-[10px] font-mono"
                  style={{ color: 'rgba(180,130,60,0.3)' }}
                >
                  <span>{textCount} passages</span>
                  <span style={{ color: 'rgba(180,130,60,0.15)' }}>·</span>
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-2.5 w-2.5" />
                    {imageCount} frames
                  </span>
                </div>
              )}

              {/* Divider */}
              <div className="mt-5 flex items-center justify-center gap-3">
                <div className="h-px w-12" style={{ background: 'rgba(180,120,40,0.18)' }} />
                <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(180,120,40,0.3)' }} />
                <div className="h-px w-12" style={{ background: 'rgba(180,120,40,0.18)' }} />
              </div>
            </motion.div>

            {/* Parts */}
            {hasParts ? (
              <div className="space-y-6 sm:space-y-8 pb-10">
                {interleavedParts.map((part, idx) => {
                  if (part.type === 'text' && part.text) {
                    textIdx++;
                    return <FilmTextPart key={idx} text={part.text} index={textIdx} />;
                  }
                  if (part.type === 'image' && part.imageUrl) {
                    return <FilmImagePart key={idx} imageUrl={part.imageUrl} index={idx} />;
                  }
                  return null;
                })}
              </div>
            ) : (
              <FallbackView output={output} />
            )}

            {/* End frame */}
            <div className="text-center pt-6 pb-2">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-sm"
                style={{
                  border: '1px solid rgba(180,120,40,0.15)',
                  background: 'rgba(180,120,40,0.05)',
                }}
              >
                <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(180,120,40,0.35)' }} />
                <span
                  className="text-[9px] font-mono tracking-[0.35em] uppercase"
                  style={{ color: 'rgba(180,120,40,0.35)' }}
                >
                  End of Story
                </span>
                <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(180,120,40,0.35)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sources */}
      {sources && sources.length > 0 && (
        <div className="mt-4 px-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-foreground/30">
              Sources
            </span>
            {sources.filter(s => s.grounded).length > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-px bg-emerald-100/50 dark:bg-emerald-950/20 text-emerald-700/60 dark:text-emerald-400/40 rounded font-medium">
                <ShieldCheck className="h-2 w-2" />
                {sources.filter(s => s.grounded).length} grounded
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {sources.slice(0, 10).map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
                  source.grounded
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-800/10 dark:border-emerald-400/8 hover:border-emerald-700/25'
                    : 'bg-muted/30 border-border/30 hover:border-border/60'
                }`}
                title={source.title}
              >
                {source.url && <Favicon url={source.url} className="w-2.5 h-2.5 opacity-50" />}
                <span className="text-foreground/50 max-w-[120px] truncate">
                  {source.title || 'Source'}
                </span>
                {source.grounded && <ShieldCheck className="h-2 w-2 text-emerald-700/40 dark:text-emerald-400/30" />}
              </a>
            ))}
            {sources.length > 10 && (
              <span className="inline-flex items-center px-2 py-1 text-[10px] text-foreground/30">
                +{sources.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
