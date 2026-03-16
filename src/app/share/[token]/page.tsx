import Link from 'next/link';
import * as db from '@/lib/db';
import { SharePageClient } from '@/components/share-page-client';

async function SharePageContent({ token }: { token: string }) {
  const { data: task, error } = await db.getPublicResearchTask(token);

  if (error || !task) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Research Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This research is no longer available or was not shared.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  // Parse location_images if it exists (stored as JSON string)
  let parsedTask: any = { ...task };
  if (task.locationImages) {
    parsedTask.locationImages = db.parseLocationImages(task.locationImages as string);
  }

  const locationName = task.locationName || 'Unknown Location';
  const description = task.researchOutput?.summary
    || `Explore the fascinating history of ${locationName}.`;

  return (
    <>
      {/* Hidden SEO content for crawlers */}
      <article className="sr-only" aria-hidden="true">
        <h1>{locationName} - Historical Research</h1>
        <p>
          {description}
        </p>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: `${locationName} - Historical Research`,
              description,
              author: { '@type': 'Organization', name: 'History AI' },
              publisher: { '@type': 'Organization', name: 'History' },
            }),
          }}
        />
      </article>

      <SharePageClient task={parsedTask} />
    </>
  );
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharePageContent token={token} />;
}
