'use client';

import { motion } from 'framer-motion';
import { Scroll, Clock, BookOpen, Layers } from 'lucide-react';
import type { DisplayMode } from './index';

interface DisplayModeSelectorProps {
  activeMode: DisplayMode;
  onChange: (mode: DisplayMode) => void;
  hasInterleaved?: boolean;
}

const modes: { id: DisplayMode; label: string; icon: typeof Scroll; description: string }[] = [
  { id: 'scroll', label: 'Ancient Scroll', icon: Scroll, description: 'Parchment documentary' },
  { id: 'timeline', label: 'Timeline', icon: Clock, description: 'Chronological explorer' },
  { id: 'flipbook', label: 'Flipbook', icon: BookOpen, description: 'Page-by-page story' },
  { id: 'interleaved', label: 'Visual Story', icon: Layers, description: 'AI-illustrated narrative' },
];

export function DisplayModeSelector({ activeMode, onChange, hasInterleaved = false }: DisplayModeSelectorProps) {
  const availableModes = modes;

  return (
    <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-lg border border-border/50 backdrop-blur-sm">
      {availableModes.map((mode) => {
        const Icon = mode.icon;
        const isActive = activeMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => onChange(mode.id)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/70'
            }`}
            title={mode.description}
          >
            {isActive && (
              <motion.div
                layoutId="active-display-mode"
                className="absolute inset-0 bg-background rounded-md shadow-sm border border-border/50"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{mode.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
