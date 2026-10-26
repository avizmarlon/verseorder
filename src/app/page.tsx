import LivingTimeline from "@/components/LivingTimeline";
import { siteDescription, siteUrl } from "@/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "VerseOrder",
  alternateName: "A Marvel Multiverse Watch Order",
  url: siteUrl,
  inLanguage: "en",
  description: siteDescription,
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
