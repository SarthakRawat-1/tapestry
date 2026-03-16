'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Loader2, MapPin, ExternalLink, Clock, Share2, Check, Download, ChevronLeft, ChevronRight, ShieldCheck, Volume2, VolumeX, Pause } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PhotoGallery } from '@/components/ui/gallery';
import { motion, AnimatePresence } from 'framer-motion';
import { Favicon } from '@/components/ui/favicon';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { Globe } from '@/components/globe';
import type { ResearchOutput } from '@/lib/research-schema';
import { DisplayModeSelector, DocumentaryScroll, FlipbookView, TimelineExplorer, InterleavedNarrative } from '@/components/display-modes';
import type { DisplayMode } from '@/components/display-modes';

interface Source {
  title: string;
  url: string;
  snippet?: string;
  grounded?: boolean;
  doi?: string;
}

interface HistoryResearchInterfaceProps {
  location: { name: string; lat: number; lng: number } | null;
  onClose: () => void;
  onTaskCreated?: (taskId: string) => void;
  initialTaskId?: string;
  customInstructions?: string;
  excludedSources?: string[];
  targetLanguage?: string;
  initialImages?: string[];
  initialResearchOutput?: ResearchOutput;
  initialSources?: any[];
  initialInterleavedParts?: any[];
}

const AnimatedDots = ({ isActive }: { isActive: boolean }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isActive) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isActive]);

  return <span className="inline-block w-6 text-left">{dots}</span>;
};

/** Convert structured ResearchOutput to markdown for PDF/fallback rendering */
function buildMarkdownFromOutput(output: ResearchOutput): string {
  const lines: string[] = [];
  lines.push(`# ${output.title}`);
  lines.push(`*${output.subtitle}*\n`);
  lines.push(output.summary + '\n');

  for (const section of output.sections) {
    lines.push(`## ${section.title}\n`);
    for (const block of section.blocks) {
      if (block.type === 'text') {
        lines.push(block.content + '\n');
      }
    }
  }

  if (output.timeline.length > 0) {
    lines.push('## Timeline\n');
    for (const entry of output.timeline) {
      lines.push(`- **${entry.year}** — ${entry.title}: ${entry.description}`);
    }
  }

  return lines.join('\n');
}

export function HistoryResearchInterface({ location, onClose, onTaskCreated, initialTaskId, customInstructions, excludedSources, targetLanguage, initialImages, initialResearchOutput, initialSources, initialInterleavedParts }: HistoryResearchInterfaceProps) {
  const { user } = useAuthStore();
  const [status, setStatus] = useState<'idle' | 'queued' | 'running' | 'completed' | 'error'>('idle');
  const [showMiniGlobe, setShowMiniGlobe] = useState(true);
  const [content, setContent] = useState<string>('');
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 10 });
  const [taskId, setTaskId] = useState<string | null>(null);
  const [displayLocation, setDisplayLocation] = useState(location);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [heroImages, setHeroImages] = useState<string[]>(initialImages || []);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = useReactToPrint({
    contentRef,
    documentTitle: `history-${displayLocation?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'report'}`,
    pageStyle: `
      @page { size: A4; margin: 20mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        img { max-width: 100%; page-break-inside: avoid; }
        h1, h2, h3 { page-break-after: avoid; }
        p { orphans: 3; widows: 3; }
      }
    `,
    onBeforePrint: () => {
      setDownloadingPdf(true);
      return Promise.resolve();
    },
    onAfterPrint: () => setDownloadingPdf(false),
    onPrintError: (errorLocation, error) => {
      console.error(`[PDF] Print error at ${errorLocation}:`, error);
      setDownloadingPdf(false);
    },
  });
  const [researchOutput, setResearchOutput] = useState<ResearchOutput | null>(null);
  const [pipelineStep, setPipelineStep] = useState<string>('');
  const [pipelineMessage, setPipelineMessage] = useState<string>('');
  const [interleavedParts, setInterleavedParts] = useState<Array<{ type: string; text?: string; imageUrl?: string }>>([]);
  const [audioState, setAudioState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const audioIndexRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('scroll');
  const [translating, setTranslating] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<string | undefined>(targetLanguage);
  const globeInitialCenter = useMemo<[number, number] | undefined>(() => {
    if (displayLocation && displayLocation.lat !== 0 && displayLocation.lng !== 0) {
      return [displayLocation.lng, displayLocation.lat];
    }
    return undefined;
  }, [displayLocation]);

  const globeMarker = useMemo<{ lat: number; lng: number } | undefined>(() => {
    if (displayLocation && displayLocation.lat !== 0 && displayLocation.lng !== 0) {
      return { lat: displayLocation.lat, lng: displayLocation.lng };
    }
    return undefined;
  }, [displayLocation]);

  const handleGlobeLocationClick = useCallback(() => {
  }, []);

  const handleShare = async () => {
    if (!user || !taskId) return;

    setSharing(true);
    try {
      // Get the actual task ID from the database
      const tasksResponse = await fetch('/api/research/tasks');
      const { tasks } = await tasksResponse.json();
      const task = tasks.find((t: any) => t.deepresearchId === taskId);

      if (!task) {
        throw new Error('Task not found');
      }

      const response = await fetch('/api/research/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          images: heroImages.length > 0 ? heroImages : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to share');

      const data = await response.json();
      setShareUrl(data.shareUrl);

      // Copy to clipboard
      await navigator.clipboard.writeText(data.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fail silently - non-critical operation
    } finally {
      setSharing(false);
    }
  };


  // handleDownloadPdf is now managed via useReactToPrint hook above

  // Use a ref so the function is always current inside async closures
  const playNextChunkRef = useRef<() => void>(() => {});

  const playNextChunk = useCallback(() => {
    playNextChunkRef.current();
  }, []);

  useEffect(() => {
    playNextChunkRef.current = () => {
      const queue = audioQueueRef.current;
      const idx = audioIndexRef.current;

      // If we've exhausted the queue but are still streaming, wait — the stream
      // will call playNextChunk again when the next chunk arrives
      if (idx >= queue.length) {
        if (abortControllerRef.current) return; // still streaming, wait
        // Truly done
        setAudioState('idle');
        audioRef.current = null;
        audioIndexRef.current = 0;
        return;
      }

      // Stop any currently playing audio before starting the next
      if (audioRef.current) {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
      }

      const audio = new Audio(`data:audio/mpeg;base64,${queue[idx]}`);
      audioRef.current = audio;

      audio.onended = () => {
        audioIndexRef.current = idx + 1;
        playNextChunkRef.current();
      };
      audio.onerror = () => {
        audioIndexRef.current = idx + 1;
        playNextChunkRef.current();
      };

      // play() requires a user gesture context — it should have one since
      // this is triggered from a button click chain
      audio.play()
        .then(() => setAudioState('playing'))
        .catch((err) => {
          console.error('[TTS] play() failed:', err);
          // Try next chunk rather than giving up entirely
          audioIndexRef.current = idx + 1;
          if (audioIndexRef.current < audioQueueRef.current.length) {
            playNextChunkRef.current();
          } else {
            setAudioState('idle');
          }
        });
    };
  });

  const handleListen = useCallback(async () => {
    // If playing, pause
    if (audioState === 'playing' && audioRef.current) {
      audioRef.current.pause();
      setAudioState('paused');
      return;
    }

    // If paused, resume
    if (audioState === 'paused' && audioRef.current) {
      audioRef.current.play();
      setAudioState('playing');
      return;
    }

    // If loading, cancel
    if (audioState === 'loading') {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      audioQueueRef.current = [];
      audioIndexRef.current = 0;
      setAudioState('idle');
      return;
    }

    if (!researchOutput) return;

    // Fresh start
    setAudioState('loading');
    audioQueueRef.current = [];
    audioIndexRef.current = 0;
    let playbackStarted = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const langCode = activeLanguage || 'en';
      // Map language to BCP-47 and a suitable voice
      const ttsLangMap: Record<string, { languageCode: string; voiceName: string }> = {
        en: { languageCode: 'en-US', voiceName: 'en-US-Journey-D' },
        es: { languageCode: 'es-ES', voiceName: 'es-ES-Standard-B' },
        fr: { languageCode: 'fr-FR', voiceName: 'fr-FR-Standard-B' },
        de: { languageCode: 'de-DE', voiceName: 'de-DE-Standard-B' },
        hi: { languageCode: 'hi-IN', voiceName: 'hi-IN-Standard-B' },
        zh: { languageCode: 'cmn-CN', voiceName: 'cmn-CN-Standard-B' },
        ja: { languageCode: 'ja-JP', voiceName: 'ja-JP-Standard-B' },
        ko: { languageCode: 'ko-KR', voiceName: 'ko-KR-Standard-B' },
        ar: { languageCode: 'ar-XA', voiceName: 'ar-XA-Standard-B' },
        pt: { languageCode: 'pt-BR', voiceName: 'pt-BR-Standard-B' },
        ru: { languageCode: 'ru-RU', voiceName: 'ru-RU-Standard-B' },
        it: { languageCode: 'it-IT', voiceName: 'it-IT-Standard-B' },
        tr: { languageCode: 'tr-TR', voiceName: 'tr-TR-Standard-B' },
        nl: { languageCode: 'nl-NL', voiceName: 'nl-NL-Standard-B' },
        pl: { languageCode: 'pl-PL', voiceName: 'pl-PL-Standard-B' },
      };
      const ttsConfig = ttsLangMap[langCode] || ttsLangMap.en;

      const response = await fetch('/api/research/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: researchOutput.sections,
          languageCode: ttsConfig.languageCode,
          voiceName: ttsConfig.voiceName,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('TTS failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response body');

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk' && data.audioBase64) {
                audioQueueRef.current.push(data.audioBase64);
                // Start playback on first chunk
                if (!playbackStarted) {
                  playbackStarted = true;
                  playNextChunkRef.current();
                } else if (audioRef.current === null) {
                  // Player finished its last chunk and is waiting for more — kick it
                  playNextChunkRef.current();
                }
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== 'TTS failed') {
                // Parse error, skip
              } else throw e;
            }
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('[TTS] Error:', error);
        if (!playbackStarted) setAudioState('idle');
      }
    } finally {
      abortControllerRef.current = null;
      // If playback hasn't started yet but queue has items, kick it off
      if (!playbackStarted && audioQueueRef.current.length > 0) {
        playNextChunkRef.current();
      } else if (playbackStarted && audioRef.current === null && audioQueueRef.current.length > 0) {
        // Player was waiting for more chunks — kick it now that stream is done
        playNextChunkRef.current();
      }
    }
  }, [audioState, researchOutput, activeLanguage]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      audioQueueRef.current = [];
      audioIndexRef.current = 0;
    };
  }, []);

  useEffect(() => {
    if (initialTaskId && !taskId) {
      setTaskId(initialTaskId);
    }
  }, [initialTaskId, taskId]);

  // Load saved research data when opening from history or share link
  const savedDataLoadedRef = useRef(false);
  useEffect(() => {
    // Reset when task changes so we reload fresh data
    savedDataLoadedRef.current = false;
  }, [initialTaskId]);

  useEffect(() => {
    if (!initialTaskId || savedDataLoadedRef.current) return;

    // If we already have research output passed as props (share page), use it directly
    if (initialResearchOutput) {
      savedDataLoadedRef.current = true;
      setResearchOutput(initialResearchOutput);
      setContent(buildMarkdownFromOutput(initialResearchOutput));
      if (initialSources) setSources(initialSources);
      if (initialImages && initialImages.length > 0) setHeroImages(initialImages);
      if (initialInterleavedParts && initialInterleavedParts.length > 0) setInterleavedParts(initialInterleavedParts);
      setStatus('completed');
      return;
    }

    // Otherwise fetch from API (history sidebar click)
    const loadSavedTask = async () => {
      savedDataLoadedRef.current = true;
      try {
        const response = await fetch(`/api/research/tasks?deepresearchId=${initialTaskId}`);
        if (!response.ok) return;
        const { task } = await response.json();
        if (!task) return;

        if (task.researchOutput) {
          setResearchOutput(task.researchOutput);
          setContent(buildMarkdownFromOutput(task.researchOutput));
        }
        if (task.sources) setSources(task.sources);
        if (task.images && task.images.length > 0) setHeroImages(task.images);
        if (task.interleavedParts && task.interleavedParts.length > 0) setInterleavedParts(task.interleavedParts);
        if (task.language) setActiveLanguage(task.language);
        if (task.status === 'completed') {
          setStatus('completed');
        } else if (task.status === 'failed') {
          setStatus('error');
          setError('This research previously failed.');
        }
      } catch (err) {
        console.error('[Research] Failed to load saved task:', err);
      }
    };

    loadSavedTask();
  }, [initialTaskId, initialResearchOutput, initialSources, initialImages]);

  const researchInitiatedRef = useRef(false);
  const previousLocationRef = useRef<string | null>(null);
  const translationDoneRef = useRef(false);

  // Reset translation flag when switching history items so re-translation is triggered
  useEffect(() => {
    translationDoneRef.current = false;
  }, [initialTaskId]);

  useEffect(() => {
    if (!location || initialTaskId) return;
    const locationKey = `${location.name}_${location.lat}_${location.lng}`;
    if (previousLocationRef.current !== locationKey) {
      previousLocationRef.current = locationKey;
      researchInitiatedRef.current = false;
      translationDoneRef.current = false;
    }

    if (researchInitiatedRef.current) {
      return;
    }

    const runResearch = async () => {
      researchInitiatedRef.current = true;

      setStatus('queued');
      setContent('');
      setSources([]);
      setError(null);
      setTaskId(null);
      setResearchOutput(null);
      setPipelineStep('');
      setPipelineMessage('');

      try {
        console.log('[Research] Starting research pipeline for:', location.name);

        const response = await fetch('/api/storytelling/research', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location,
            customInstructions,
            excludedSources,
            language: activeLanguage,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to start research');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        setStatus('running');

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (data.type) {
                  case 'taskCreated':
                    setTaskId(data.deepresearchId);
                    if (onTaskCreated) onTaskCreated(data.deepresearchId);
                    break;

                  case 'progress':
                    console.log(`[Research] [${data.step}] ${data.message}`);
                    setPipelineStep(data.step);
                    setPipelineMessage(data.message);
                    // Pick up images early from search step
                    if (data.data?.images && data.data.images.length > 0) {
                      setHeroImages(data.data.images);
                    }
                    break;

                  case 'result':
                    console.log('[Research] ✓ Got structured output');
                    setResearchOutput(data.output);
                    // Set hero images from Tavily search results
                    if (data.images && data.images.length > 0) {
                      setHeroImages(data.images);
                    }
                    // Set sources
                    if (data.sources) {
                      setSources(data.sources);
                    }
                    // Build markdown for PDF/fallback
                    const md = buildMarkdownFromOutput(data.output);
                    setContent(md);
                    break;

                  case 'interleaved':
                    console.log('[Research] ✓ Got interleaved narrative:', data.parts?.length, 'parts');
                    if (data.parts) {
                      setInterleavedParts(data.parts);
                    }
                    break;

                  case 'error':
                    setError(data.error || 'Unknown error');
                    setStatus('error');
                    break;

                  case 'done':
                    console.log('[Research] ✓ Complete');
                    setStatus('completed');
                    break;
                }
              } catch (e) {
                console.error('[Research] Parse error:', e);
              }
            }
          }
        }
      } catch (err) {
        console.error('[Research] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    };

    runResearch();
  }, [location, initialTaskId]);

  // Refs for translation effect to avoid re-triggering when output changes
  const researchOutputRef = useRef(researchOutput);
  researchOutputRef.current = researchOutput;
  const interleavedPartsRef = useRef(interleavedParts);
  interleavedPartsRef.current = interleavedParts;

  // Translate research output when completed and a non-English language is selected
  useEffect(() => {
    const currentOutput = researchOutputRef.current;
    const currentParts = interleavedPartsRef.current;
    if (!activeLanguage || !currentOutput || status !== 'completed') return;
    // Prevent re-translating after we already replaced researchOutput with the translated version
    if (translationDoneRef.current) return;

    let cancelled = false;
    setTranslating(true);
    translationDoneRef.current = true;
    setPipelineStep('translating');
    setPipelineMessage(`Translating to ${activeLanguage}...`);

    (async () => {
      try {
        const res = await fetch('/api/research/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ researchOutput: currentOutput, targetLanguage: activeLanguage, interleavedParts: currentParts.length > 0 ? currentParts : undefined }),
        });
        if (res.ok && !cancelled) {
          const { translatedOutput, translatedParts } = await res.json();
          if (translatedOutput) {
            setResearchOutput(translatedOutput);
            setContent(buildMarkdownFromOutput(translatedOutput));
          }
          if (translatedParts) {
            setInterleavedParts(translatedParts);
          }
        }
      } catch (err) {
        console.error('[Translate] Error:', err);
      } finally {
        if (!cancelled) {
          setTranslating(false);
          setPipelineStep('');
          setPipelineMessage('');
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeLanguage]);


  if (!displayLocation) return null;

  return (
    <div className="fixed inset-0 bg-background/70 backdrop-blur-md z-50 flex flex-col lg:flex-row overflow-hidden">
      {/* Mini Globe - Desktop Left Side Collapsible */}
      <AnimatePresence>
        {showMiniGlobe && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 384 }}
            exit={{ width: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="hidden lg:block h-full border-r border-border/30 bg-background/20 backdrop-blur-sm overflow-hidden relative"
          >
            <div className="h-full p-4 flex flex-col">
              <div className="flex items-center mb-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</div>
              </div>
              <div className="flex-1 rounded-lg overflow-hidden border border-border/50 shadow-xl">
                <Globe
                  onLocationClick={handleGlobeLocationClick}
                  theme="hybrid"
                  initialCenter={globeInitialCenter}
                  initialZoom={globeInitialCenter ? 4 : undefined}
                  marker={globeMarker}
                  disableInteraction={false}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Globe Toggle Button - Middle Left */}
      <div className="hidden lg:flex absolute left-0 top-1/2 -translate-y-1/2 z-20" style={{ left: showMiniGlobe ? '384px' : '0px', transition: 'left 0.3s ease-in-out' }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowMiniGlobe(!showMiniGlobe)}
          className="rounded-l-none rounded-r-lg h-16 w-6 px-0 border-l-0 shadow-md"
          title={showMiniGlobe ? "Hide map" : "Show map"}
        >
          {showMiniGlobe ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 sm:h-16 border-b border-border/30 bg-background/30 backdrop-blur-xl flex items-center justify-between px-3 sm:px-6 z-10 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1 flex items-center">
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-semibold truncate">{displayLocation.name}</h2>
              {displayLocation.lat !== 0 && displayLocation.lng !== 0 && (
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {displayLocation.lat.toFixed(4)}, {displayLocation.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {status === 'completed' && researchOutput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleListen}
              className="gap-1.5 sm:gap-2 min-h-11 px-2 sm:px-3"
            >
              {audioState === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : audioState === 'playing' ? (
                <Pause className="h-4 w-4" />
              ) : audioState === 'paused' ? (
                <Volume2 className="h-4 w-4 text-primary" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {audioState === 'loading' ? 'Generating...' : audioState === 'playing' ? 'Pause' : audioState === 'paused' ? 'Resume' : 'Listen'}
              </span>
            </Button>
          )}
          {status === 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="gap-1.5 sm:gap-2 min-h-11 px-2 sm:px-3"
            >
              {downloadingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </Button>
          )}
          {user && status === 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              disabled={sharing}
              className="gap-1.5 sm:gap-2 min-h-11 px-2 sm:px-3"
            >
              {sharing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="min-h-11 min-w-11">
            <X className="h-5 w-5" />
          </Button>
        </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full will-change-scroll" style={{ WebkitOverflowScrolling: 'touch' } as any}>
          <div className="max-w-4xl mx-auto p-3 sm:p-6 pb-safe space-y-4 sm:space-y-6 overflow-x-hidden transform-gpu">
            {/* Status */}
            {status === 'queued' && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-4" />
                  </motion.div>
                  <p className="text-sm font-medium mb-1">Research Queued</p>
                  <p className="text-xs text-muted-foreground">Your request will begin shortly...</p>
                </div>
              </div>
            )}

            {(status === 'running' || status === 'completed') && (
              <div className="space-y-4">
                {/* Location Title */}
                <div className="text-center py-3 sm:py-6">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight font-serif italic text-foreground/95 px-2">
                    {displayLocation.name}<AnimatedDots isActive={status === 'running'} />
                  </h1>
                  {displayLocation.lat !== 0 && displayLocation.lng !== 0 && (
                    <p className="text-xs sm:text-sm text-muted-foreground/70 mt-1 sm:mt-2 font-light tracking-wide">
                      {displayLocation.lat.toFixed(4)}, {displayLocation.lng.toFixed(4)}
                    </p>
                  )}
                </div>

                {/* Hero Images Gallery */}
                <PhotoGallery images={heroImages} />

                {/* Pipeline progress while researching */}
                {status === 'running' && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 sm:p-6 border shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <div>
                          <p className="text-sm font-medium">{pipelineMessage || 'Starting research...'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pipelineStep === 'planning' && 'Generating targeted search queries...'}
                            {pipelineStep === 'searching' && 'Searching the web for historical sources...'}
                            {pipelineStep === 'synthesizing' && 'Writing your documentary with AI...'}
                            {pipelineStep === 'illustrating' && 'Generating inline illustrations with Gemini...'}
                            {!pipelineStep && 'Initializing research pipeline...'}
                          </p>
                        </div>
                      </div>
                      {/* Step indicators */}
                      <div className="flex gap-2">
                        {['planning', 'searching', 'synthesizing', 'illustrating'].map((step) => {
                          const stepOrder = ['planning', 'searching', 'synthesizing', 'illustrating'];
                          const currentIdx = stepOrder.indexOf(pipelineStep);
                          const stepIdx = stepOrder.indexOf(step);
                          const isActive = step === pipelineStep;
                          const isDone = stepIdx < currentIdx;
                          return (
                            <div key={step} className="flex-1">
                              <div className={`h-1.5 rounded-full transition-colors duration-500 ${
                                isDone ? 'bg-green-500' : isActive ? 'bg-primary animate-pulse' : 'bg-muted'
                              }`} />
                              <p className={`text-[10px] mt-1 capitalize ${
                                isActive ? 'text-primary font-medium' : isDone ? 'text-green-600' : 'text-muted-foreground'
                              }`}>{step === 'planning' ? 'Plan' : step === 'searching' ? 'Search' : step === 'synthesizing' ? 'Write' : 'Illustrate'}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <Skeleton className="h-6 sm:h-8 w-3/4" />
                      <Skeleton className="h-3 sm:h-4 w-full" />
                      <Skeleton className="h-3 sm:h-4 w-full" />
                      <Skeleton className="h-3 sm:h-4 w-5/6" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {status === 'error' && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-destructive mb-2">Research Failed</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            )}

            {/* Research Content - show when we have content AND status is completed */}
            {status === 'completed' && translating && (
              <div className="bg-background/60 backdrop-blur-sm rounded-lg p-4 sm:p-6 border shadow-sm">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium">Translating content...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">This may take a moment</p>
                  </div>
                </div>
              </div>
            )}
            {status === 'completed' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-3 sm:space-y-4"
              >
                <>
                  {researchOutput && (
                    <div className="flex justify-center">
                      <DisplayModeSelector
                        activeMode={displayMode}
                        onChange={setDisplayMode}
                        hasInterleaved={interleavedParts.length > 0}
                      />
                    </div>
                  )}

                  {/* Display mode rendering */}
                  {researchOutput && displayMode === 'scroll' ? (
                    <DocumentaryScroll
                      output={researchOutput}
                      sources={sources}
                      heroImages={heroImages}
                      interleavedParts={interleavedParts}
                      locationName={displayLocation?.name || ''}
                      taskId={taskId}
                    />
                  ) : researchOutput && displayMode === 'flipbook' ? (
                    <FlipbookView
                      output={researchOutput}
                      sources={sources}
                      heroImages={heroImages}
                      interleavedParts={interleavedParts}
                      locationName={displayLocation?.name || ''}
                      taskId={taskId}
                    />
                  ) : researchOutput && displayMode === 'timeline' ? (
                    <TimelineExplorer
                      output={researchOutput}
                      sources={sources}
                      heroImages={heroImages}
                      interleavedParts={interleavedParts}
                      locationName={displayLocation?.name || ''}
                      taskId={taskId}
                    />
                  ) : researchOutput && displayMode === 'interleaved' ? (
                    <InterleavedNarrative
                      output={researchOutput}
                      sources={sources}
                      heroImages={heroImages}
                      interleavedParts={interleavedParts}
                      locationName={displayLocation?.name || ''}
                      taskId={taskId}
                    />
                  ) : content ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none bg-background/60 backdrop-blur-sm rounded-lg p-3 sm:p-6 border shadow-sm prose-headings:font-semibold prose-headings:break-words prose-h1:text-xl sm:prose-h1:text-2xl prose-h2:text-lg sm:prose-h2:text-xl prose-h3:text-base sm:prose-h3:text-lg prose-p:text-sm sm:prose-p:text-base prose-p:leading-relaxed prose-p:break-words prose-a:text-primary prose-a:no-underline prose-a:break-words hover:prose-a:underline prose-code:text-xs sm:prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:break-all prose-pre:bg-muted prose-pre:border prose-pre:text-xs sm:prose-pre:text-sm prose-pre:overflow-x-auto prose-li:break-words prose-td:break-words prose-th:break-words">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" />
                          )
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  ) : null}
                </>
              </motion.div>
            )}

            {/* Sources Summary — only show when no structured display mode is active */}
            {sources.length > 0 && status === 'completed' && !(['scroll', 'flipbook', 'timeline', 'interleaved'].includes(displayMode) && researchOutput) && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-semibold">All Sources</h3>
                    {sources.filter(s => s.grounded).length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-full font-medium">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        {sources.filter(s => s.grounded).length} grounded
                      </span>
                    )}
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground">{sources.length} total</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                  {sources.map((source, index) => {
                    return (
                      <a
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group flex items-start gap-2 p-2.5 rounded-lg border transition-colors ${
                          source.grounded
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-900/40 hover:border-emerald-500'
                            : 'bg-muted/30 hover:border-primary'
                        }`}
                      >
                        {source.url && (
                          <Favicon url={source.url} className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <div className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                              {source.title}
                            </div>
                            {source.grounded && (
                              <span className="inline-flex items-center gap-0.5 flex-shrink-0 text-[9px] px-1 py-px bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded font-medium" title="Verified via Google Search grounding">
                                <ShieldCheck className="h-2.5 w-2.5" />
                              </span>
                            )}
                          </div>
                          {source.snippet && (
                            <div className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                              {source.snippet}
                            </div>
                          )}
                          {source.doi && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-medium">
                                DOI
                              </span>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {source.doi}
                              </span>
                            </div>
                          )}
                        </div>
                        <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Research Stats */}
            {status === 'completed' && sources.length > 0 && (() => {
              const totalWords = sources.reduce((acc, s) => acc + (s.snippet?.split(/\s+/).length || 0), 0);
              const readingMinutes = Math.ceil(totalWords / 250);
              const researchMinutes = sources.length * 2;
              const hoursSaved = (readingMinutes + researchMinutes) / 60;
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-5 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20 shadow-sm"
                >
                  <div className="text-center">
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                      className="text-xl sm:text-3xl font-bold text-primary mb-0.5 sm:mb-1"
                    >
                      {totalWords.toLocaleString()}
                    </motion.p>
                    <p className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Words Read</p>
                  </div>
                  <div className="text-center">
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                      className="text-xl sm:text-3xl font-bold text-primary mb-0.5 sm:mb-1"
                    >
                      {sources.length}
                    </motion.p>
                    <p className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Sources</p>
                  </div>
                  <div className="text-center">
                    <motion.p
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                      className="text-xl sm:text-3xl font-bold text-primary mb-0.5 sm:mb-1"
                    >
                      {hoursSaved.toFixed(1)}h
                    </motion.p>
                    <p className="text-[9px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Time Saved</p>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        </ScrollArea>
        </div>

        {/* Mini Globe - Mobile Bottom */}
        <div className="lg:hidden h-48 border-t border-border/30 bg-background/20 backdrop-blur-sm flex-shrink-0">
          <div className="h-full p-2">
            <div className="h-full rounded-lg overflow-hidden border border-border/50 shadow-xl">
              <Globe
                onLocationClick={handleGlobeLocationClick}
                theme="hybrid"
                initialCenter={globeInitialCenter}
                initialZoom={globeInitialCenter ? 3 : undefined}
                marker={globeMarker}
                disableInteraction={false}
              />
            </div>
          </div>
        </div>
        </div>

      {/* Hidden Print Target for useReactToPrint */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '210mm' }}>
        <div ref={contentRef} style={{ padding: '10mm', fontFamily: 'Georgia, serif', color: '#000', background: '#fff' }}>
          {/* Header */}
          <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0 }}>{displayLocation?.name || 'Research Report'}</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0' }}>Historical Research Report</p>
          </div>

          {/* Hero Images */}
          {heroImages.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
              {heroImages.slice(0, 3).map((imgUrl, idx) => (
                <img key={`print-hero-${idx}`} src={imgUrl} style={{ flex: 1, height: '180px', objectFit: 'cover', borderRadius: '8px' }} alt="" />
              ))}
            </div>
          )}

          {/* Structured sections if available */}
          {researchOutput ? (
            <div>
              <p style={{ fontSize: '16px', fontStyle: 'italic', color: '#475569', marginBottom: '16px' }}>{researchOutput.subtitle}</p>
              <p style={{ fontSize: '14px', lineHeight: 1.7, marginBottom: '20px' }}>{researchOutput.summary}</p>
              {researchOutput.sections.map((section, sIdx) => (
                <div key={`print-sec-${sIdx}`} style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{section.title}</h2>
                  {section.blocks.map((block, bIdx) => (
                    <div key={`print-block-${sIdx}-${bIdx}`} style={{ marginBottom: '8px' }}>
                      {block.type === 'text' && (
                        <p style={{ fontSize: '13px', lineHeight: 1.7, margin: '0 0 8px', fontStyle: block.style === 'quote' ? 'italic' : 'normal', fontWeight: block.style === 'headline' ? 600 : 400 }}>{block.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              {researchOutput.timeline.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Timeline</h2>
                  {researchOutput.timeline.map((entry, tIdx) => (
                    <p key={`print-tl-${tIdx}`} style={{ fontSize: '13px', lineHeight: 1.6, margin: '0 0 4px' }}>
                      <strong>{entry.year}</strong> — {entry.title}: {entry.description}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ) : content ? (
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : null}

          {/* Sources */}
          {sources.length > 0 && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '24px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Sources ({sources.length})</h2>
              {sources.map((source, sIdx) => (
                <p key={`print-src-${sIdx}`} style={{ fontSize: '11px', lineHeight: 1.5, margin: '0 0 4px', color: '#334155' }}>
                  [{sIdx + 1}] {source.title} — {source.url}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
