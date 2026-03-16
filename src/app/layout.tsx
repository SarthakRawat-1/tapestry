import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MissingKeysDialog } from "@/components/missing-keys-dialog";
import { AuthInitializer } from "@/components/auth/auth-initializer";
import { QueryProvider } from "@/components/query-provider";
import { ThemeProvider } from "@/components/theme-provider";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tapestry-ai.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Tapestry - Explore the History of Any Place",
    template: "%s | Tapestry",
  },
  description:
    "Explore world history with an interactive 3D globe. Click any location to get AI-powered historical research from academic archives, historical databases, and verified sources. Your personal geography AI for place history search.",
  applicationName: "Tapestry",
  keywords: [
    "historical research AI",
    "location history",
    "world history explorer",
    "geography AI",
    "place history search",
    "interactive history map",
    "AI history research",
    "historical timeline",
    "geographic history",
    "local history finder",
  ],
  authors: [{ name: "Tapestry" }],
  creator: "Tapestry",
  publisher: "Tapestry",
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    title: "Tapestry - Explore the History of Any Place",
    description:
      "Explore world history with an interactive 3D globe. Click any location to get AI-powered historical research from academic archives, historical databases, and verified sources.",
    url: baseUrl,
    siteName: "Tapestry",
    images: [
      {
        url: "/history.png",
        width: 1200,
        height: 630,
        alt: "Tapestry - Interactive 3D globe for exploring world history",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tapestry - Explore the History of Any Place",
    description:
      "Explore world history with an interactive 3D globe. Click any location to get AI-powered historical research from academic archives and verified sources.",
    images: ["/history.png"],
    creator: "@valaboratory",
    site: "@valaboratory",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/history.png" },
    ],
  },
  manifest: "/manifest.json",
  category: "education",
  other: {
    "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION || "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Tapestry",
    "applicationCategory": "EducationalApplication",
    "operatingSystem": "Web",
    "description": "Explore world history with an interactive 3D globe. Click any location to get AI-powered historical research from academic archives, historical databases, and verified sources.",
    "url": baseUrl,
    "image": `${baseUrl}/history.png`,
    "author": {
      "@type": "Organization",
      "name": "Tapestry",
      "url": baseUrl
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "314"
    }
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          key="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="antialiased overflow-x-hidden"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthInitializer>
              <MissingKeysDialog />
              {children}
            </AuthInitializer>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}