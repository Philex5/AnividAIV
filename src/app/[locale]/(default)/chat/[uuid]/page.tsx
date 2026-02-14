import { setRequestLocale } from "next-intl/server";
import { getChatWithCharacterPage } from "@/services/page";
import { getUserInfo } from "@/services/user";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import ChatWithCharacterClient from "../page-client";
import { getOrCreateSession } from "@/models/chat";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; uuid: string }>;
}): Promise<Metadata> {
  const { locale, uuid } = await params;
  const pageData = await getChatWithCharacterPage(locale);

  let canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/chat/${uuid}`;

  if (locale !== "en") {
    canonicalUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/chat/${uuid}`;
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
        en: `${process.env.NEXT_PUBLIC_WEB_URL}/chat/${uuid}`,
        ja: `${process.env.NEXT_PUBLIC_WEB_URL}/ja/chat/${uuid}`,
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

export default async function ChatWithCharacterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; uuid: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale, uuid } = await params;
  const { session_id } = await searchParams;
  setRequestLocale(locale);
  const pageData = await getChatWithCharacterPage(locale);

  // 检查用户登录状态
  let user;
  try {
    user = await getUserInfo();
  } catch (error) {
    console.log("User not authenticated");
  }

  // 如果用户未登录，检查是否为示例数据
  // 示例数据（oc-example-XXX）对未登录用户可见，不需要重定向到登录页面
  if (!user) {
    const isExampleCharacter = uuid.startsWith('oc-example-');
    if (!isExampleCharacter) {
      // 构建完整的回调URL，包括locale前缀和查询参数
      const callbackUrl = `/${locale}/chat/${uuid}${session_id ? `?session_id=${session_id}` : ''}`;
      const loginUrl = `/${locale}/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      redirect(loginUrl);
    }
  }

  // 自动创建session逻辑
  let activeSessionId = session_id;
  if (user && !session_id) {
    // 如果用户已登录但没有session_id,自动创建新session
    try {
      const session = await getOrCreateSession({
        userUuid: user.uuid,
        characterUuid: uuid,
      });
      activeSessionId = session.session_id;
    } catch (error) {
      console.error("Failed to create session:", error);
      // 即使创建失败,也继续显示页面
    }
  }

  // Show chat interface
  return (
    <ChatWithCharacterClient
      pageData={pageData}
      characterUuid={uuid}
      sessionId={activeSessionId}
      isLoggedIn={!!user}
    />
  );
}
