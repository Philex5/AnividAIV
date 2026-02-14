import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { AppContextProvider } from "@/contexts/app";
import { Metadata } from "next";
import { NextAuthSessionProvider } from "@/auth/session";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@/providers/theme";
import FeedbackWrapper from "@/components/feedback/FeedbackWrapper";
import { CookieConsentWrapper } from "@/components/layout/cookie-consent-wrapper";
import { auth } from "@/auth";
import { getUserInfo } from "@/services/user";
import NewUserDetector from "@/components/gtm/NewUserDetector";
import type { Session } from "next-auth";
import AttributionTracker from "@/components/analytics/AttributionTracker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations();

  return {
    title: {
      template: `%s`,
      default: t("metadata.title") || "",
    },
    description: t("metadata.description") || "",
    keywords: t("metadata.keywords") || "",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);

  const messages: any = await getMessages();

  // 获取当前用户信息，检查是否为新用户
  let session: Session | null = null;
  try {
    session = (await auth()) as Session | null;
  } catch (error) {
    console.error("[LocaleLayout] Failed to resolve auth session:", error);
  }
  const user = session?.user || null;
  const userInfo = user ? await getUserInfo() : null;

  // 检查是否为新用户（created_at是今天）
  const isNewUser = userInfo?.created_at && new Date(userInfo.created_at).toDateString() === new Date().toDateString();

  return (
    <NextIntlClientProvider messages={messages}>
      <NextAuthSessionProvider>
        <AppContextProvider>
          <ThemeProvider>
            {/* 新用户注册事件检测器 */}
            {isNewUser && userInfo && (
              <NewUserDetector
                userUuid={userInfo.uuid || ""}
                userEmail={userInfo.email || ""}
                signupMethod={userInfo.signin_type || "unknown"}
                signupProvider={userInfo.signin_provider || "unknown"}
                welcomeCredits={1000}
                creditsExpiredAt=""
              />
            )}
            <AttributionTracker />
            {children}
            <FeedbackWrapper locale={locale} />
            <CookieConsentWrapper />
          </ThemeProvider>
        </AppContextProvider>
      </NextAuthSessionProvider>
    </NextIntlClientProvider>
  );
}
