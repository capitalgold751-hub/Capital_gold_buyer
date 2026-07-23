import { HomeExperience } from "./components/HomeExperience";
import { PRIMARY_ADDRESS, PRIMARY_PHONE, SITE_NAME, SITE_URL } from "./lib/site-config";

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: SITE_NAME,
    url: SITE_URL,
    image: `${SITE_URL}/images/hero-modern-trust.webp`,
    telephone: PRIMARY_PHONE,
    priceRange: "₹₹",
    description: "Gold buying and transparent gold evaluation service in Basaveshwara Nagar, Bengaluru.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "1st Floor, 2/80, 3rd Stage, 2nd Block, 7th Main, Basaveshwara Nagar",
      addressLocality: "Bengaluru",
      addressRegion: "Karnataka",
      postalCode: "560079",
      addressCountry: "IN",
    },
    areaServed: "Bengaluru",
    openingHoursSpecification: [{
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:30",
      closes: "19:00",
    }],
    hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(PRIMARY_ADDRESS)}`,
    sameAs: ["https://www.instagram.com/capital_gold_buyer_/"],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <HomeExperience />
    </>
  );
}
