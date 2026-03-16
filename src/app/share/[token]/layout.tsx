import { Metadata } from 'next';
import * as db from '@/lib/db';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;

  try {
    const { data: task } = await db.getPublicResearchTask(token);

    if (!task) {
      return {
        title: 'Research Not Found | History',
        description: 'This research is no longer available or was not shared.',
      };
    }

    const locationName = task.locationName || 'Unknown Location';

    return {
      title: `${locationName} - Historical Research | History`,
      description: `Explore the fascinating history of ${locationName}. Deep research powered by AI, sourced from historical databases, academic archives, and verified sources.`,
      openGraph: {
        title: `${locationName} - Historical Research`,
        description: `Explore the fascinating history of ${locationName}. Deep research powered by AI, sourced from historical databases, academic archives, and verified sources.`,
        images: [
          {
            url: `/api/og/share/${token}`,
            width: 1200,
            height: 630,
            alt: `${locationName} - Historical Research`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: `${locationName} - Historical Research`,
        description: `Explore the fascinating history of ${locationName}. Deep research powered by AI.`,
        images: [`/api/og/share/${token}`],
      },
    };
  } catch (error) {
    return {
      title: 'Research Not Found | History',
      description: 'This research is no longer available or was not shared.',
    };
  }
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
