'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { MapPin, ShieldCheck, CalendarDays, Landmark } from 'lucide-react';
import type { DisplayModeProps } from './index';
import { Favicon } from '@/components/ui/favicon';

// ============================================================================
// Stone texture SVG filter — rough granite, matte, fractured
// ============================================================================
function StoneFilter() {
  return (
    <svg className="hidden absolute" aria-hidden="true">
      <filter id="stone-rough" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.04 0.06"
          numOctaves="6"
          seed="12"
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="4"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
      <filter id="chisel-shadow">
        <feDropShadow dx="1" dy="1" stdDeviation="0.5" floodColor="rgba(0,0,0,0.5)" />
      </filter>
    </svg>
  );
}

// ============================================================================
// Top / bottom stone edge — genuinely irregular, chipped, asymmetric
// ============================================================================
function StoneEdge({ position }: { position: 'top' | 'bottom' }) {
  const isTop = position === 'top';

  const outerTop = 'polygon(0% 100%, 0% 72%, 1.2% 45%, 2.1% 68%, 3.5% 30%, 4.8% 55%, 6% 18%, 7.3% 48%, 8.1% 25%, 9.6% 60%, 11% 35%, 12.4% 8%, 13.5% 42%, 15% 22%, 16.8% 52%, 18% 12%, 19.5% 38%, 21% 62%, 22.8% 28%, 24% 50%, 25.5% 5%, 27% 35%, 28.8% 58%, 30% 20%, 31.5% 45%, 33% 15%, 34.8% 40%, 36% 65%, 37.5% 30%, 39% 10%, 40.5% 48%, 42% 22%, 43.8% 55%, 45% 18%, 46.5% 42%, 48% 68%, 49.5% 32%, 51% 12%, 52.5% 50%, 54% 25%, 55.8% 58%, 57% 20%, 58.5% 44%, 60% 8%, 61.5% 38%, 63% 62%, 64.8% 28%, 66% 52%, 67.5% 15%, 69% 45%, 70.8% 70%, 72% 35%, 73.5% 18%, 75% 48%, 76.8% 25%, 78% 55%, 79.5% 30%, 81% 60%, 82.8% 22%, 84% 48%, 85.5% 12%, 87% 40%, 88.8% 65%, 90% 32%, 91.5% 55%, 93% 20%, 94.8% 45%, 96% 28%, 97.5% 58%, 98.8% 38%, 100% 50%, 100% 100%)';
  const outerBottom = 'polygon(0% 0%, 0% 28%, 1.2% 55%, 2.1% 32%, 3.5% 70%, 4.8% 45%, 6% 82%, 7.3% 52%, 8.1% 75%, 9.6% 40%, 11% 65%, 12.4% 92%, 13.5% 58%, 15% 78%, 16.8% 48%, 18% 88%, 19.5% 62%, 21% 38%, 22.8% 72%, 24% 50%, 25.5% 95%, 27% 65%, 28.8% 42%, 30% 80%, 31.5% 55%, 33% 85%, 34.8% 60%, 36% 35%, 37.5% 70%, 39% 90%, 40.5% 52%, 42% 78%, 43.8% 45%, 45% 82%, 46.5% 58%, 48% 32%, 49.5% 68%, 51% 88%, 52.5% 50%, 54% 75%, 55.8% 42%, 57% 80%, 58.5% 56%, 60% 92%, 61.5% 62%, 63% 38%, 64.8% 72%, 66% 48%, 67.5% 85%, 69% 55%, 70.8% 30%, 72% 65%, 73.5% 82%, 75% 52%, 76.8% 75%, 78% 45%, 79.5% 70%, 81% 40%, 82.8% 78%, 84% 52%, 85.5% 88%, 87% 60%, 88.8% 35%, 90% 68%, 91.5% 45%, 93% 80%, 94.8% 55%, 96% 72%, 97.5% 42%, 98.8% 62%, 100% 50%, 100% 0%)';

  const innerTop = 'polygon(0% 100%, 0% 80%, 3% 55%, 7% 75%, 11% 40%, 15% 65%, 19% 30%, 23% 58%, 27% 20%, 31% 50%, 35% 28%, 39% 55%, 43% 15%, 47% 45%, 51% 25%, 55% 60%, 59% 35%, 63% 18%, 67% 48%, 71% 30%, 75% 55%, 79% 22%, 83% 50%, 87% 32%, 91% 58%, 95% 38%, 100% 55%, 100% 100%)';
  const innerBottom = 'polygon(0% 0%, 0% 20%, 3% 45%, 7% 25%, 11% 60%, 15% 35%, 19% 70%, 23% 42%, 27% 80%, 31% 50%, 35% 72%, 39% 45%, 43% 85%, 47% 55%, 51% 75%, 55% 40%, 59% 65%, 63% 82%, 67% 52%, 71% 70%, 75% 45%, 79% 78%, 83% 50%, 87% 68%, 91% 42%, 95% 62%, 100% 45%, 100% 0%)';

  return (
    <div className={`relative w-full ${isTop ? 'h-10 sm:h-14' : 'h-10 sm:h-14'}`}
      style={{ filter: 'url(#stone-rough)' }}
    >
      <div className="absolute inset-0" style={{ background: '#2e2820' }} />

      {/* Outer chip face */}
      <div
        className="absolute inset-0"
        style={{
          background: isTop
            ? 'linear-gradient(to bottom, #4a4035 0%, #2e2820 100%)'
            : 'linear-gradient(to top, #4a4035 0%, #2e2820 100%)',
          clipPath: isTop ? outerTop : outerBottom,
        }}
      />

      {/* Inner fracture recess */}
      <div
        className="absolute inset-0"
        style={{
          background: isTop
            ? 'linear-gradient(to bottom, #1a1510 0%, #2a2218 100%)'
            : 'linear-gradient(to top, #1a1510 0%, #2a2218 100%)',
          clipPath: isTop ? innerTop : innerBottom,
          opacity: 0.7,
        }}
      />

      {/* Fracture highlight */}
      <div
        className="absolute inset-x-0"
        style={{
          [isTop ? 'bottom' : 'top']: 0,
          height: '1px',
          background: 'linear-gradient(to right, transparent, rgba(180,160,120,0.2) 20%, rgba(200,180,140,0.35) 50%, rgba(180,160,120,0.2) 80%, transparent)',
        }}
      />

      {/* Shadow onto slab */}
      <div
        className="absolute inset-x-0"
        style={{
          [isTop ? 'bottom' : 'top']: 0,
          height: '10px',
          background: isTop
            ? 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)'
            : 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
        }}
      />
    </div>
  );
}

// ============================================================================
// Carved Roman numeral chapter marker
// ============================================================================
function RomanNumeral({ n }: { n: number }) {
  const numerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X',
                    'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];
  return (
    <span
      className="text-[9px] font-mono font-bold tracking-[0.25em] text-stone-400/60 dark:text-stone-500/50 select-none"
      style={{ filter: 'url(#chisel-shadow)' }}
    >
      {numerals[n] || String(n + 1)}
    </span>
  );
}

// ============================================================================
// Decorative carved divider
// ============================================================================
function CarvedDivider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-400/30 dark:via-stone-500/25 to-transparent" />
      <div className="flex gap-1 items-center">
        <div className="w-1 h-1 rounded-full bg-stone-400/40 dark:bg-stone-500/30" />
        <div className="w-1.5 h-1.5 rounded-full bg-stone-400/50 dark:bg-stone-500/40" />
        <div className="w-1 h-1 rounded-full bg-stone-400/40 dark:bg-stone-500/30" />
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-400/30 dark:via-stone-500/25 to-transparent" />
    </div>
  );
}

// ============================================================================
// Individual timeline entry — carved into stone
// ============================================================================
function StoneEntry({
  entry,
  index,
  isLeft,
}: {
  entry: { year: string; title: string; description: string };
  index: number;
  isLeft: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.05 * (index % 5) }}
      className={`relative flex items-start gap-4 sm:gap-0 pb-10 sm:pb-14 ${
        isLeft ? 'sm:flex-row' : 'sm:flex-row-reverse'
      }`}
    >
      {/* Content */}
      <div className={`pl-10 sm:pl-0 w-full sm:w-[calc(50%-32px)] ${
        isLeft ? 'sm:pr-12 sm:text-right' : 'sm:pl-12'
      }`}>
        {/* Year — chiseled look */}
        <div className={`flex items-center gap-1.5 mb-2 ${isLeft ? 'sm:justify-end' : ''}`}>
          <RomanNumeral n={index} />
          <div className="h-px w-4 bg-stone-400/25 dark:bg-stone-500/20" />
          <span
            className="text-xs font-mono font-bold tracking-[0.2em] uppercase"
            style={{
              color: 'rgba(180,160,130,0.75)',
              textShadow: '0 1px 2px rgba(0,0,0,0.5), 0 -1px 0 rgba(255,255,255,0.06)',
              filter: 'url(#chisel-shadow)',
            }}
          >
            {entry.year}
          </span>
        </div>

        {/* Title — deeply carved */}
        <h3
          className="text-sm sm:text-base font-serif font-bold leading-snug mb-2"
          style={{
            color: 'rgba(220,205,180,0.88)',
            textShadow: '0 1px 3px rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.04)',
            letterSpacing: '0.02em',
          }}
        >
          {entry.title}
        </h3>

        {/* Description — shallower carving */}
        <p
          className="text-xs sm:text-sm leading-relaxed font-serif"
          style={{
            color: 'rgba(180,165,140,0.65)',
            textShadow: '0 1px 2px rgba(0,0,0,0.4)',
          }}
        >
          {entry.description}
        </p>

        {/* Subtle underline groove */}
        <div className={`mt-3 h-px bg-gradient-to-r ${
          isLeft
            ? 'from-transparent via-stone-400/20 to-stone-400/8 sm:from-stone-400/8 sm:via-stone-400/20 sm:to-transparent'
            : 'from-stone-400/8 via-stone-400/20 to-transparent'
        } dark:via-stone-500/15`} />
      </div>

      {/* Center spine dot — carved circle */}
      <div className="absolute left-2 sm:left-1/2 top-1 sm:-translate-x-1/2 z-10">
        <div
          className="w-4 h-4 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 35% 35%, rgba(180,160,130,0.5), rgba(80,70,60,0.8))',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.08), inset 0 -1px 2px rgba(0,0,0,0.5), 0 0 0 2px rgba(100,90,75,0.3)',
          }}
        />
      </div>

      {/* Spacer */}
      <div className="hidden sm:block sm:w-[calc(50%-32px)]" />
    </motion.div>
  );
}

// ============================================================================
// Main component
// ============================================================================
export function TimelineExplorer({ output, sources, locationName }: DisplayModeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const patternY = useTransform(scrollYProgress, [0, 1], ['0%', '8%']);

  const events = output.timeline;

  return (
    <>
      <StoneFilter />

      <div ref={containerRef} className="relative">
        <StoneEdge position="top" />

        {/* Stone slab body */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, #302820 0%, #2a2218 25%, #252018 50%, #2c2318 75%, #302820 100%)',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3)',
          }}
        >
          {/* Dark mode deepens it */}
          <div className="hidden dark:block absolute inset-0 bg-black/25" />

          {/* Rough left edge — chipped side */}
          <div
            className="absolute top-0 bottom-0 left-0 w-4 sm:w-6 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, #1a1208, #2a2018)',
              clipPath: 'polygon(0% 0%, 100% 2%, 85% 8%, 100% 15%, 80% 22%, 100% 30%, 88% 38%, 100% 45%, 82% 52%, 100% 60%, 86% 68%, 100% 75%, 84% 82%, 100% 90%, 90% 95%, 100% 100%, 0% 100%)',
            }}
          />
          {/* Rough right edge */}
          <div
            className="absolute top-0 bottom-0 right-0 w-4 sm:w-6 pointer-events-none"
            style={{
              background: 'linear-gradient(to left, #1a1208, #2a2018)',
              clipPath: 'polygon(100% 0%, 0% 3%, 18% 9%, 0% 16%, 20% 24%, 0% 31%, 15% 39%, 0% 47%, 18% 54%, 0% 62%, 16% 70%, 0% 77%, 20% 84%, 0% 91%, 12% 96%, 0% 100%, 100% 100%)',
            }}
          />

          {/* Stone grain — denser, more matte */}
          <motion.div
            className="absolute inset-0 pointer-events-none opacity-[0.12]"
            style={{
              y: patternY,
              backgroundImage: `repeating-linear-gradient(
                89deg,
                transparent,
                transparent 1px,
                rgba(255,255,255,0.04) 1px,
                rgba(255,255,255,0.04) 2px
              ), repeating-linear-gradient(
                179deg,
                transparent,
                transparent 3px,
                rgba(255,255,255,0.025) 3px,
                rgba(255,255,255,0.025) 4px
              ), repeating-linear-gradient(
                45deg,
                transparent,
                transparent 8px,
                rgba(0,0,0,0.04) 8px,
                rgba(0,0,0,0.04) 9px
              )`,
            }}
          />

          {/* Mineral veins — more visible */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.07]"
            style={{
              background: `
                linear-gradient(127deg, transparent 28%, rgba(180,155,110,0.8) 29%, rgba(160,135,90,0.4) 30.5%, transparent 31.5%),
                linear-gradient(43deg, transparent 52%, rgba(160,140,100,0.6) 53%, transparent 54.5%),
                linear-gradient(160deg, transparent 18%, rgba(140,120,85,0.5) 19%, transparent 20.5%),
                linear-gradient(78deg, transparent 65%, rgba(170,145,100,0.4) 66%, transparent 67%)
              `,
            }}
          />

          {/* Pitting / micro-roughness overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.15) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
              opacity: 0.25,
            }}
          />

          {/* Content */}
          <div className="relative z-10 px-6 sm:px-12 md:px-20 py-10 sm:py-14 max-w-4xl mx-auto">

            {/* Header — inscribed title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-12 sm:mb-16"
            >
              {/* Top inscription ornament */}
              <div
                className="flex items-center justify-center gap-2 mb-5 select-none"
                style={{ color: 'rgba(180,160,120,0.35)' }}
              >
                <div className="h-px w-8 bg-current" />
                <Landmark className="h-4 w-4" />
                <div className="h-px w-8 bg-current" />
              </div>

              <p
                className="text-[9px] font-mono tracking-[0.4em] uppercase mb-3 select-none"
                style={{ color: 'rgba(160,140,110,0.45)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                Chronologia · Historica
              </p>

              <h1
                className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold tracking-wide leading-tight"
                style={{
                  color: 'rgba(230,215,185,0.90)',
                  textShadow: '0 2px 4px rgba(0,0,0,0.7), 0 -1px 0 rgba(255,255,255,0.05)',
                  letterSpacing: '0.04em',
                }}
              >
                {output.title}
              </h1>

              <div
                className="flex items-center justify-center gap-1.5 mt-3 text-xs"
                style={{ color: 'rgba(160,140,110,0.45)' }}
              >
                <MapPin className="h-3 w-3" />
                <span className="tracking-[0.2em] uppercase font-mono text-[10px]">{locationName}</span>
              </div>

              {/* Carved horizontal rule */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="h-px w-16 sm:w-24" style={{ background: 'linear-gradient(to right, transparent, rgba(180,160,120,0.3), transparent)' }} />
                <div className="flex gap-1.5">
                  <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(180,160,120,0.4)' }} />
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgba(180,160,120,0.5)' }} />
                  <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(180,160,120,0.4)' }} />
                </div>
                <div className="h-px w-16 sm:w-24" style={{ background: 'linear-gradient(to right, transparent, rgba(180,160,120,0.3), transparent)' }} />
              </div>
            </motion.div>

            {/* Timeline entries */}
            {events.length > 0 ? (
              <div className="relative">
                {/* Carved vertical spine groove */}
                <div
                  className="absolute left-[9px] sm:left-1/2 top-0 bottom-0 w-px sm:-translate-x-px"
                  style={{
                    background: 'linear-gradient(to bottom, transparent, rgba(100,90,75,0.6) 10%, rgba(100,90,75,0.4) 90%, transparent)',
                    boxShadow: '1px 0 0 rgba(255,255,255,0.04), -1px 0 0 rgba(0,0,0,0.3)',
                  }}
                />

                <div className="space-y-0">
                  {events.map((entry, idx) => (
                    <StoneEntry
                      key={idx}
                      entry={entry}
                      index={idx}
                      isLeft={idx % 2 === 0}
                    />
                  ))}
                </div>

                {/* Spine end cap */}
                <div className="absolute left-[9px] sm:left-1/2 bottom-0 sm:-translate-x-1/2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, rgba(160,140,110,0.4), rgba(60,55,45,0.8))',
                      boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.06), inset 0 -1px 2px rgba(0,0,0,0.5)',
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-center text-sm italic py-8" style={{ color: 'rgba(160,140,110,0.4)' }}>
                No timeline events available.
              </p>
            )}

            {/* Bottom inscription */}
            <div className="text-center mt-10 pt-6" style={{ borderTop: '1px solid rgba(100,90,75,0.25)' }}>
              <p
                className="text-[9px] font-mono tracking-[0.35em] uppercase select-none"
                style={{ color: 'rgba(140,120,90,0.35)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                — Finis —
              </p>
            </div>
          </div>
        </div>

        <StoneEdge position="bottom" />
      </div>

      {/* Sources — back to parchment tone outside the stone */}
      {sources && sources.length > 0 && (
        <div className="mt-4 px-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-medium tracking-[0.2em] uppercase text-stone-500/50 dark:text-stone-400/35">
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
            {sources.slice(0, 12).map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
                  source.grounded
                    ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-800/10 dark:border-emerald-400/8 hover:border-emerald-700/25'
                    : 'bg-stone-100/40 dark:bg-stone-800/20 border-stone-400/15 dark:border-stone-500/12 hover:border-stone-500/30'
                }`}
                title={source.title}
              >
                {source.url && <Favicon url={source.url} className="w-2.5 h-2.5 opacity-50" />}
                <span className="text-stone-700/60 dark:text-stone-300/45 max-w-[120px] truncate">
                  {source.title || 'Source'}
                </span>
                {source.grounded && <ShieldCheck className="h-2 w-2 text-emerald-700/40 dark:text-emerald-400/30" />}
              </a>
            ))}
            {sources.length > 12 && (
              <span className="inline-flex items-center px-2 py-1 text-[10px] text-stone-500/40 dark:text-stone-400/30">
                +{sources.length - 12} more
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
