import { seo, siteUrl } from "@/lib/seo";
import { faqs } from "./content";

/** schema.org data for search engines and AI agents: who we are, the product with its price, the FAQ. */
export function structuredData(fee: number, trialDays: number) {
  const url = siteUrl("/");
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}#organization`,
        name: seo.nameEn,
        alternateName: seo.name,
        url,
        logo: siteUrl("/images/logo.svg"),
        areaServed: { "@type": "Country", name: "Bangladesh" },
      },
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        name: `${seo.name} (${seo.nameEn})`,
        url,
        inLanguage: "bn",
        publisher: { "@id": `${url}#organization` },
      },
      {
        "@type": "SoftwareApplication",
        name: `${seo.nameEn} (${seo.name})`,
        url,
        description: seo.descriptionEn,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Windows",
        inLanguage: "bn",
        publisher: { "@id": `${url}#organization` },
        offers: {
          "@type": "Offer",
          price: fee,
          priceCurrency: "BDT",
          description: `${trialDays} days free trial, then ${fee} BDT per printer per month`,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: fee,
            priceCurrency: "BDT",
            unitText: "printer per month",
          },
        },
      },
      {
        "@type": "FAQPage",
        inLanguage: "bn",
        mainEntity: faqs.map((faq) => ({
          "@type": "Question",
          name: faq.q,
          acceptedAnswer: { "@type": "Answer", text: faq.a },
        })),
      },
    ],
  };
  // Escape "<" so the JSON cannot close the script tag.
  return JSON.stringify(graph).replace(/</g, "\\u003c");
}
