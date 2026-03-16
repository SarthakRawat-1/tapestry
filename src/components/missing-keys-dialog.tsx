"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function MissingKeysDialog() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{
    geminiKeyPresent: boolean;
    googleMapsKeyPresent: boolean;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const envRes = await fetch("/api/env-status", { cache: "no-store" });
        if (!envRes.ok) throw new Error("Failed to fetch env status");
        const envData = await envRes.json();

        if (!cancelled) {
          setStatus(envData);
          const missing = !envData.geminiKeyPresent || !envData.googleMapsKeyPresent;
          if (missing) setOpen(true);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status) return null;

  const missingGemini = !status.geminiKeyPresent;
  const missingGoogleMaps = !status.googleMapsKeyPresent;

  if (!missingGemini && !missingGoogleMaps) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Setup Required</DialogTitle>
          <DialogDescription>
            This app requires API keys for full functionality. Some features are disabled until keys are added.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {missingGemini && (
            <div className="rounded-md border p-3">
              <div className="font-medium">Missing Gemini API Key</div>
              <div className="text-muted-foreground">
                Add GEMINI_API_KEY to your environment to enable AI research.
              </div>
            </div>
          )}
          {missingGoogleMaps && (
            <div className="rounded-md border p-3">
              <div className="font-medium">Missing Google Maps API Key</div>
              <div className="text-muted-foreground">
                Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the interactive 3D globe.
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
