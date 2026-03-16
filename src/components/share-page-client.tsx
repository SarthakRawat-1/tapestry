'use client';

import { HistoryResearchInterface } from '@/components/history-research-interface';
import type { ResearchOutput } from '@/lib/research-schema';

interface SharePageClientProps {
  task: {
    locationName?: string;
    locationLat?: number;
    locationLng?: number;
    deepresearchId?: string;
    locationImages?: string[];
    researchOutput?: ResearchOutput | null;
    sources?: any[] | null;
    interleavedParts?: any[] | null;
    status?: string;
  };
}

export function SharePageClient({ task }: SharePageClientProps) {
  return (
    <div className="h-screen w-full bg-background">
      <HistoryResearchInterface
        location={{
          name: task.locationName || 'Unknown Location',
          lat: task.locationLat || 0,
          lng: task.locationLng || 0,
        }}
        onClose={() => window.location.href = '/'}
        initialTaskId={task.deepresearchId}
        initialImages={task.locationImages || []}
        initialResearchOutput={task.researchOutput || undefined}
        initialSources={task.sources || undefined}
        initialInterleavedParts={task.interleavedParts || undefined}
      />
    </div>
  );
}
