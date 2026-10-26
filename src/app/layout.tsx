import type { Metadata } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/standard-italic.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "./globals.css";
import { siteUrl } from "@/site";
import Analytics from "@/components/Analytics";

const siteTitle = "VerseOrder — The Ultimate Marvel Multiverse Watch Order";
const siteDescription =
  "Explore a carefully curated narrative watch order connecting the MCU, legacy Marvel films, series and the multiverse. An independent fan project.";
// Rendered before every build by scripts/og/build-og-image.mjs.
const ogImage = {
  url: new URL("og/verseorder.png", siteUrl).href,
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "VerseOrder wordmark over a glowing gold disc: The Ultimate Marvel Multiverse Watch Order, an independent fan project.",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: "VerseOrder",
  keywords: ["Marvel", "MCU", "watch order", "multiverse", "timeline", "movies", "series"],
  alternates: { canonical: siteUrl },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "VerseOrder",
    title: siteTitle,
    description: siteDescription,
    locale: "en_US",
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [{ url: ogImage.url, alt: ogImage.alt }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<Analytics /></body></html>;
}
