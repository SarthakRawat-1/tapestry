'use client';

import { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle, AlertCircle, Sparkles, Shuffle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Globe, GlobeTheme } from '@/components/globe';
import { HistoryResearchInterface } from '@/components/history-research-interface';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuthStore } from '@/lib/stores/use-auth-store';
import { Sidebar } from '@/components/sidebar';
import BottomBar from '@/components/bottom-bar';
import { ResearchConfirmationDialog } from '@/components/research-confirmation-dialog';
import { SettingsModal } from '@/components/user/settings-modal';

function HomeContent() {
  const { user, loading } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmLocation, setConfirmLocation] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [customInstructions, setCustomInstructions] = useState<string | undefined>(undefined);
  const [excludedSources, setExcludedSources] = useState<string[] | undefined>(undefined);
  const [selectedLanguage, setSelectedLanguage] = useState<string | undefined>(undefined);
  const [activeResearchTaskId, setActiveResearchTaskId] = useState<string | undefined>(undefined);
  const [globeTheme, setGlobeTheme] = useState<GlobeTheme>('hybrid');
  const globeRef = useRef<any>(null);
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  const isSignedIn = !!user;

  // Handle URL messages from auth callbacks
  useEffect(() => {
    const error = searchParams.get('error');

    if (error === 'auth_failed') {
      setNotification({ type: 'error', message: 'Authentication failed. Please try again.' });
      router.replace('/');
    }

    // Handle checkout success
    const checkoutSuccess = searchParams.get('checkout');
    if (checkoutSuccess === 'success') {
      setNotification({ type: 'success', message: 'Payment setup successful!' });
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      router.replace('/');
    }
  }, [searchParams, router, queryClient]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleLocationClick = useCallback(async (location: { name: string; lat: number; lng: number }, taskId?: string) => {
    // If this is loading existing research (has taskId), allow it
    if (taskId) {
      setSelectedLocation(location);
      setActiveResearchTaskId(taskId);
      const params = new URLSearchParams(window.location.search);
      params.set('research', taskId);
      window.history.pushState({}, '', `?${params.toString()}`);
      return;
    }

    // Require sign-in
    if (!isSignedIn) {
      setShowAuthModal(true);
      return;
    }

    // Show confirmation dialog
    setConfirmLocation(location);
    setShowConfirmDialog(true);
  }, [isSignedIn]);

  const handleConfirmResearch = useCallback((instructions?: string, sources?: string[], language?: string) => {
    if (confirmLocation) {
      if (!isSignedIn) {
        setShowConfirmDialog(false);
        setShowAuthModal(true);
        return;
      }

      setCustomInstructions(instructions);
      setExcludedSources(sources);
      setSelectedLanguage(language);
      setSelectedLocation(confirmLocation);
      setActiveResearchTaskId(undefined);
      setShowConfirmDialog(false);
      setConfirmLocation(null);

      // Clear any existing research ID from URL so the interface runs fresh research
      const params = new URLSearchParams(window.location.search);
      params.delete('research');
      const newUrl = params.toString() ? `?${params.toString()}` : '/';
      window.history.replaceState({}, '', newUrl);
    }
  }, [confirmLocation, isSignedIn]);

  const handleCancelResearch = useCallback(() => {
    setShowConfirmDialog(false);
    setConfirmLocation(null);
  }, []);

  const handleCloseResearch = useCallback(() => {
    setSelectedLocation(null);
    setActiveResearchTaskId(undefined);

    // Remove research ID from URL
    const params = new URLSearchParams(window.location.search);
    params.delete('research');
    const newUrl = params.toString() ? `?${params.toString()}` : '/';
    window.history.pushState({}, '', newUrl);

    // Trigger popstate to update searchParams
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  // Handle URL-based research loading
  useEffect(() => {
    const researchId = searchParams.get('research');
    if (researchId && !selectedLocation) {
      // Fetch task data to get the actual location
      const fetchTaskData = async () => {
        try {
          const response = await fetch('/api/research/tasks');
          const data = await response.json();
          const tasks = data?.tasks || [];
          const task = tasks.find((t: any) => t.deepresearchId === researchId);

          if (task) {
            setSelectedLocation({
              name: task.locationName,
              lat: task.locationLat,
              lng: task.locationLng,
            });
            setActiveResearchTaskId(researchId);
          } else {
            // Fallback if task not found
            setSelectedLocation({
              name: 'Loading research...',
              lat: 0,
              lng: 0,
            });
          }
        } catch (error) {
          // Fallback on error
          setSelectedLocation({
            name: 'Loading research...',
            lat: 0,
            lng: 0,
          });
        }
      };

      fetchTaskData();
    }
  }, [searchParams]); // Remove selectedLocation from deps to prevent re-opening

  // Handle show-auth-modal event from sidebar
  useEffect(() => {
    const handleShowAuthModal = () => {
      setShowAuthModal(true);
    };

    window.addEventListener('show-auth-modal', handleShowAuthModal);
    return () => window.removeEventListener('show-auth-modal', handleShowAuthModal);
  }, []);

  const handleFeelingLucky = useCallback(() => {
    if (!isSignedIn) {
      setShowAuthModal(true);
      return;
    }

    if (globeRef.current) {
      globeRef.current.selectRandomLocation();
    }
  }, [isSignedIn]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar globeTheme={globeTheme} onGlobeThemeChange={(theme) => setGlobeTheme(theme as GlobeTheme)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Clean Layout */}
        <header className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
          {/* Title Section - Top Left */}
          <motion.div
            initial={{ opacity: 0, x: -20, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-4 sm:top-6 md:top-8 left-4 sm:left-6 md:left-8 pointer-events-auto flex items-center gap-3"
          >
            {/* Tapestry Logo */}
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 flex items-center justify-center">
               <Image src="/TapestryLogo.png" alt="Tapestry Logo" fill className="object-contain" />
            </div>
            
            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light tracking-tight transition-transform duration-300 ease-out group-hover:-rotate-[2deg] cursor-pointer">
              <span className="font-serif italic bg-gradient-to-br from-primary-foreground via-primary-foreground/95 to-primary-foreground/90 bg-clip-text text-transparent drop-shadow-md">
                Tapestry
              </span>
            </h1>
          </motion.div>

          {/* I'm Feeling Lucky - Top Right */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="absolute top-4 sm:top-6 md:top-8 right-4 sm:right-6 md:right-8 pointer-events-auto"
          >
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleFeelingLucky}
              className="group relative px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground border border-primary/50 shadow-lg hover:shadow-xl hover:bg-primary/90 hover:border-primary/80 rounded-full transition-all flex items-center gap-1.5 sm:gap-2 md:gap-2.5 min-h-11"
            >
              <Shuffle className="h-3.5 w-3.5 sm:h-4 sm:w-4 group-hover:rotate-180 transition-transform duration-500" />
              <span className="hidden sm:inline">Random Location</span>
              <span className="sm:hidden">Random</span>
            </motion.button>
          </motion.div>
        </header>

        {/* Globe container */}
        <div className="flex-1 overflow-hidden relative">
          <Globe ref={globeRef} onLocationClick={handleLocationClick} theme={globeTheme} />
        </div>

        {/* Bottom bar */}
        <BottomBar
          onShowAuth={() => setShowAuthModal(true)}
          onShowSettings={() => setShowMobileSettings(true)}
          onShowHistory={() => {
            // Dispatch event for sidebar to open history panel on mobile
            window.dispatchEvent(new CustomEvent('show-mobile-history'));
          }}
        />
      </div>

      {/* Research interface overlay */}
      <AnimatePresence>
        {selectedLocation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HistoryResearchInterface
              location={selectedLocation}
              onClose={handleCloseResearch}
              onTaskCreated={(taskId) => {
                // Update URL with research ID
                setActiveResearchTaskId(taskId);
                const params = new URLSearchParams(window.location.search);
                params.set('research', taskId);
                window.history.pushState({}, '', `?${params.toString()}`);
              }}
              initialTaskId={activeResearchTaskId}
              customInstructions={customInstructions}
              excludedSources={excludedSources}
              targetLanguage={selectedLanguage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals and dialogs */}
      {showConfirmDialog && (
        <ResearchConfirmationDialog
          location={confirmLocation}
          onConfirm={handleConfirmResearch}
          onCancel={handleCancelResearch}
          onSignUp={() => {
            setShowConfirmDialog(false);
            setShowAuthModal(true);
          }}
        />
      )}

      <AuthModal
        open={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignUpSuccess={(message) => {
          // Don't close modal - let user see success message and click "Got it"
          // Just show notification as well
          setNotification({ type: 'success', message });
        }}
      />

      <SettingsModal
        open={showMobileSettings}
        onClose={() => setShowMobileSettings(false)}
      />

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50"
          >
            <div
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
                notification.type === 'success'
                  ? 'bg-green-500/10 border-green-500/20'
                  : notification.type === 'info'
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : notification.type === 'info' ? (
                <Sparkles className="h-5 w-5 text-blue-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
