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

export const metadata: Metadata = {
  title: "VerseOrder — The Ultimate Marvel Multiverse Watch Order",
  description: "Explore a carefully curated narrative watch order connecting the MCU, legacy Marvel films, series and the multiverse. An independent fan project.",
  applicationName: "VerseOrder",
  keywords: ["Marvel", "MCU", "watch order", "multiverse", "timeline", "movies", "series"],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
