import Pricing from "@/components/blocks/pricing";
import { getPricingPage } from "@/services/page";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getUserInfo } from "@/services/user";
import { getMembershipLevel } from "@/services/membership";
import AppFooter from "@/components/blocks/footer/AppFooter";

// Pricing page needs to be dynamic to correctly handle user subscription status
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/pricing`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/pricing`;
  }

  return {
    title: "Pricing Plans | AI Anime Generator - AnividAI",
    description: "Choose your perfect AnividAI plan. Get Meow Coins for AI anime generation, video creation with Veo 3.1 & Sora 2.0, character chat, and more. Save 20% on yearly plans.",
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/pricing`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/pricing`,
      },
    },
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const page = await getPricingPage(locale);

  // Pricing component will use the data directly from translations
  const pricingData = page?.pricing;

  // Check if user is already a subscription member
  let isSubscriptionMember = false;
  try {
    const session = await auth();
    if (session?.user?.uuid) {
      const user = await getUserInfo();
      if (user?.uuid) {
        const membershipLevel = await getMembershipLevel(user.uuid);
        // Check if membership level is not 'free' (i.e., user has an active subscription)
        isSubscriptionMember = membershipLevel !== "free";
      }
    } 
  } catch (error) {
    // If error occurs (e.g., user not authenticated), treat as non-member
    console.log("Error getting membership status:", error);
    isSubscriptionMember = false;
  }

  return (
    <div className="relative min-h-screen">
      <section className="relative z-10 py-8 md:py-12">
        <div className="container px-4 md:px-6">
          <div className="mx-auto w-full">
            {pricingData && (
              <Pricing
                pricing={pricingData as any}
                isSubscriptionMember={isSubscriptionMember}
              />
            )}
          </div>
        </div>
      </section>
      <AppFooter />
    </div>
  );
}
