'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, ChevronDown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { Favicon } from '@/components/ui/favicon';

interface ResearchConfirmationDialogProps {
  location: { name: string; lat: number; lng: number } | null;
  onConfirm: (customInstructions?: string, excludedSources?: string[], language?: string) => void;
  onCancel: () => void;
  onSignUp?: () => void;
}

const PRESETS = [
  { id: 'general', label: 'General', prompt: '' },
  { id: 'wars', label: 'Wars & Conflicts', prompt: 'Focus on wars, battles, military conflicts, opposing forces, strategies, outcomes, and their historical impact.' },
  { id: 'nature', label: 'Nature & Geography', prompt: 'Focus on natural history, geological formations, climate, ecosystems, and environmental changes over time.' },
  { id: 'people', label: 'Notable People', prompt: 'Focus on notable historical figures, leaders, artists, scientists, revolutionaries, and their contributions.' },
  { id: 'architecture', label: 'Architecture', prompt: 'Focus on architectural history, significant buildings, construction techniques, and cultural importance of structures.' },
  { id: 'culture', label: 'Culture & Arts', prompt: 'Focus on cultural heritage, traditions, customs, art movements, literature, music, and festivals.' },
  { id: 'economy', label: 'Trade & Economy', prompt: 'Focus on economic history, trade routes, major industries, commerce, and economic developments.' },
  { id: 'news', label: 'Recent Events', prompt: 'Focus on current and recent events, political developments, social movements, and noteworthy incidents.' },
  { id: 'geology', label: 'Geology', prompt: 'Focus on geological history, rock formations, tectonic activity, volcanic history, mineral deposits, and landscape formation.' },
  { id: 'culinary', label: 'Food & Cuisine', prompt: 'Focus on culinary history, traditional dishes, cooking techniques, local ingredients, and food culture.' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'hi', label: 'Hindi' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'ar', label: 'Arabic' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'it', label: 'Italian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
];

export function ResearchConfirmationDialog({
  location,
  onConfirm,
  onCancel,
  onSignUp,
}: ResearchConfirmationDialogProps) {
  const { user } = useAuthStore();
  const [selectedPreset, setSelectedPreset] = useState<string>('general');
  const [customInstructions, setCustomInstructions] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [wikipediaDisabled, setWikipediaDisabled] = useState(false);
  const [customExcludedUrls, setCustomExcludedUrls] = useState<string[]>([]);
  const [excludeUrlInput, setExcludeUrlInput] = useState('');

  if (!location) return null;

  const handleConfirm = () => {
    const allExcluded = [
      ...(wikipediaDisabled ? ['wikipedia.org'] : []),
      ...customExcludedUrls,
    ];
    const excludedSources = allExcluded.length > 0 ? allExcluded : undefined;

    // Use custom text if provided, otherwise use preset prompt
    const instructions = customInstructions.trim()
      || PRESETS.find((p) => p.id === selectedPreset)?.prompt
      || undefined;

    onConfirm(instructions || undefined, excludedSources, selectedLanguage !== 'en' ? selectedLanguage : undefined);
  };

  const handleAddExcludeUrl = () => {
    const url = excludeUrlInput.trim().toLowerCase();
    if (url && !customExcludedUrls.includes(url)) {
      let domain = url;
      try {
        if (url.includes('://')) domain = new URL(url).hostname;
        else if (url.includes('/')) domain = url.split('/')[0];
      } catch { /* keep as-is */ }
      setCustomExcludedUrls([...customExcludedUrls, domain]);
      setExcludeUrlInput('');
    }
  };

  const handleRemoveExcludeUrl = (url: string) => {
    setCustomExcludedUrls(customExcludedUrls.filter((u) => u !== url));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-background rounded-xl shadow-2xl max-w-md w-full border"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold truncate">
                Research {location.name}
              </h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                Choose a focus or leave blank for general history
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1.5 sm:p-2 hover:bg-accent rounded-lg transition-colors flex-shrink-0 min-h-11 min-w-11 flex items-center justify-center"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
            {/* Preset Pills */}
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">
                Research focus
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset.id);
                      setCustomInstructions('');
                    }}
                    className={`px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all border min-h-8 ${
                      selectedPreset === preset.id && !customInstructions
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">
                Output language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-9 appearance-none cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Instructions */}
            <div>
              <button
                onClick={() => setShowCustom(!showCustom)}
                className="w-full flex items-center justify-between text-[10px] sm:text-xs font-medium text-muted-foreground hover:text-foreground transition-colors min-h-9"
              >
                <span>Custom instructions (optional)</span>
                <ChevronDown className={`h-3 w-3 transition-transform flex-shrink-0 ${showCustom ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {showCustom && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <Textarea
                      value={customInstructions}
                      onChange={(e) => {
                        setCustomInstructions(e.target.value);
                        if (e.target.value) setSelectedPreset('');
                      }}
                      placeholder="e.g., Focus on indigenous peoples before colonization..."
                      className="min-h-[70px] sm:min-h-[80px] text-xs sm:text-sm resize-none mt-1.5 sm:mt-2"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Source Exclusions */}
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-muted-foreground mb-1.5 sm:mb-2">
                Exclude sources (optional)
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
                <button
                  onClick={() => setWikipediaDisabled(!wikipediaDisabled)}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all border min-h-8 ${
                    wikipediaDisabled
                      ? 'bg-destructive/10 text-destructive border-destructive/30 line-through'
                      : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Favicon url="https://wikipedia.org" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Wikipedia</span>
                </button>
                {customExcludedUrls.map((url) => (
                  <button
                    key={url}
                    onClick={() => handleRemoveExcludeUrl(url)}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-lg transition-all border min-h-8 bg-destructive/10 text-destructive border-destructive/30 line-through"
                  >
                    <Favicon url={`https://${url}`} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{url}</span>
                    <X className="w-3 h-3 ml-0.5" />
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={excludeUrlInput}
                  onChange={(e) => setExcludeUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddExcludeUrl())}
                  placeholder="Enter domain to exclude... e.g., reddit.com"
                  className="flex-1 px-2.5 py-1.5 text-[10px] sm:text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-8"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddExcludeUrl}
                  className="min-h-8 px-2.5 text-[10px] sm:text-xs"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t">
            {!user ? (
              <div className="space-y-2">
                <Button onClick={handleConfirm} size="default" variant="outline" className="w-full font-semibold min-h-11 text-xs sm:text-sm">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="truncate">Continue Without Signup</span>
                </Button>
                {onSignUp && (
                  <Button onClick={onSignUp} size="default" className="w-full font-semibold min-h-11 text-xs sm:text-sm">
                    <span className="truncate">Sign Up to Save Research</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex gap-2 justify-between items-center">
                <Button variant="ghost" onClick={onCancel} size="sm" className="min-h-11 text-xs sm:text-sm">
                  Cancel
                </Button>
                <Button onClick={handleConfirm} size="default" className="px-4 sm:px-6 font-semibold min-h-11 text-xs sm:text-sm">
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  <span className="truncate">Start Research</span>
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
