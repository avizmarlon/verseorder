import LivingTimeline from "@/components/LivingTimeline";
import { siteUrl } from "@/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "VerseOrder",
  alternateName: "The Ultimate Marvel Multiverse Watch Order",
  url: siteUrl,
  inLanguage: "en",
  description:
    "An independent, open-source fan project: a curated narrative watch order for the MCU, legacy Marvel films, series and the multiverse. Not affiliated with Marvel or Disney.",
  license: "https://opensource.org/licenses/MIT",
  codeRepository: "https://github.com/avizmarlon/verseorder",
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <LivingTimeline />
    </>
  );
}
