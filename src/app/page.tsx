import LivingTimeline from "@/components/LivingTimeline";
import { siteUrl } from "@/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "VerseOrder",
  alternateName: "A Marvel Multiverse Watch Order",
  url: siteUrl,
  inLanguage: "en",
  description:
    "A Marvel watch order that mixes chronology with storytelling: 112 films, series and specials. An independent fan project. Not affiliated with Marvel, Disney or Sony.",
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
