import { setRequestLocale } from "next-intl/server";
import { getChatWithCharacterPage } from "@/services/page";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const pageData = await getChatWithCharacterPage(locale);

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/chat`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/chat`;
  }

  const title = pageData.metadata?.title || "Character AI Chat - Original Characters | AnividAI";
  const description =
    pageData.metadata?.description ||
    "Experience the best ai character chat platform with original characters. Chat with community OCs using our advanced ai chat bot - 500 free conversations monthly!";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/chat`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/chat`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "AnividAI",
      images: [
        {
          url: "https://artworks.anividai.com/social/og/anividai-chat.webp",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["https://artworks.anividai.com/social/og/anividai-chat.webp"],
      site: process.env.NEXT_PUBLIC_TWITTER_SITE,
    },
  };
}

export default async function ChatMarketingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const pageData = await getChatWithCharacterPage(locale);

  // Structured data for SEO
  const softwareApplicationJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Character AI Chat with Original Characters",
    alternateName:
      pageData.metadata?.title ||
      "AI Character Chat - Original Characters - 500 Free Chats Monthly",
    description:
      pageData.metadata?.description ||
      "Experience the ultimate ai character chat platform for original characters. Enjoy ai chat character free with 500 monthly conversations. Our ai chat bot features real-time ai chat online with community OCs and your creations.",
    url: `${process.env.NEXT_PUBLIC_WEB_URL}/chat`,
    applicationCategory: "CommunicationApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description:
        "500 free ai chat character conversations monthly, no credit card required",
    },
    featureList: [
      "500 Free Character AI Chat Conversations Monthly",
      "No Credit Card Required",
      "OC Chat with Community Original Characters",
      "AI-Powered Character Chat Bot",
      "Advanced Contextual Memory",
      "Multiple Original Characters Support",
      "Real-time AI Chat Online",
      "Free AI Chat Character System",
    ],
    provider: {
      "@type": "Organization",
      name: "AnividAI",
      url: process.env.NEXT_PUBLIC_WEB_URL,
    },
    screenshot: "https://artworks.anividai.com/social/og/anividai-chat.webp",
  };

  const faqPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is Character AI Chat with Original Characters?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Our ai character chat platform allows you to have real-time oc chat conversations with your original characters or community-shared OCs using advanced AI technology. Experience ai chat character free with 500 monthly conversations at no cost. Our ai chat bot delivers authentic character ai chat experiences.",
        },
      },
      {
        "@type": "Question",
        name: "How does the free AI chat character system work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "After signing up (no credit card required), you receive 500 free ai chat character conversations monthly. Enjoy ai chat online with any OC - your creations or community original characters. Our AI chat bot remembers all conversations and responds based on character personality.",
        },
      },
      {
        "@type": "Question",
        name: "Can I do AI chat online with multiple original characters?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes! Our character ai chat platform supports unlimited oc chat with multiple original characters. Each OC maintains unique personality traits and conversation history, giving you diverse ai chat character experiences. Experience ai chat online like never before.",
        },
      },
      {
        "@type": "Question",
        name: "Is there really a free AI chat character option?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Absolutely! Enjoy 500 free ai chat character conversations every month with no credit card required. Our ai free chat system includes full access to original characters, community browsing, and AI chat bot responses. Perfect for ai chat online enthusiasts.",
        },
      },
    ],
  };

  // Import the marketing page client component
  const ChatMarketingPageClient = (await import("./page-client-marketing"))
    .default;

  // Use client wrapper component to handle marketing page
  return (
    <div className="min-h-full">
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqPageJsonLd),
        }}
      />

      {/* Client component for marketing page */}
      <ChatMarketingPageClient pageData={pageData} />
    </div>
  );
}
