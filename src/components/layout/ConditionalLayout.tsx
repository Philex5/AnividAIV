"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useTranslations } from "next-intl";
import Header from "@/components/blocks/header";
import HomeFooter from "@/components/blocks/footer/HomeFooter";
import AppLayout from "@/components/app/layout";
import { Sidebar } from "@/types/blocks/sidebar";
import { Header as HeaderType } from "@/types/blocks/header";
import { getLogoUrl } from "@/lib/asset-loader";

// Full-width route matching rules.
// How to add a non-generator page:
// 1) Add the page prefix into `FULL_WIDTH_PREFIXES` (e.g. "/workspace").
// 2) If prefix matching is not enough, add a custom RegExp in `FULL_WIDTH_PATTERNS`.
const FULL_WIDTH_PREFIXES = ["/chat/", "/models/", "/oc-maker"];
const FULL_WIDTH_PATTERNS = [/(?:^|\/)\S*generator(?:\/|$)/];

interface ConditionalLayoutProps {
  children: ReactNode;
  header?: HeaderType;
}

export default function ConditionalLayout({
  children,
  header,
}: ConditionalLayoutProps) {
  const pathname = usePathname();
  const t = useTranslations();

  // 检测是否为首页
  const isHomePage = pathname === "/" || pathname.match(/^\/[a-z]{2}$/);

  // 首页使用 Header + Footer 布局
  if (isHomePage) {
    return (
      <>
        {header && <Header header={header} />}
        <main className="overflow-x-hidden">{children}</main>
        <HomeFooter />
      </>
    );
  }

  // 其他页面使用侧边栏布局 (AppLayout 已经内置了 AppHeader)
  const sidebar: Sidebar = {
    brand: {
      title: "AnividAI",
      logo: {
        src: getLogoUrl(),
        alt: "AnividAI",
      },
      url: "/",
    },
    variant: "sidebar",
    collapsible: "icon",
    nav: {
      title: "Menu",
      items: [
        {
          title: t("nav.ai_anime_generator"),
          url: "/ai-anime-generator",
          icon: "RiMagicLine",
          is_active: pathname.startsWith("/ai-anime-generator"),
        },
        {
          title: t("nav.posts"),
          url: "/posts",
          icon: "RiArticleLine",
          is_active: pathname.startsWith("/posts"),
        },
        {
          title: t("nav.showcase"),
          url: "/showcase",
          icon: "RiGalleryLine",
          is_active: pathname.startsWith("/showcase"),
        },
        {
          title: t("nav.pricing"),
          url: "/pricing",
          icon: "RiPriceTag3Line",
          is_active: pathname.startsWith("/pricing"),
        },
      ],
    },
    bottomNav: {
      items: [
        {
          title: t("nav.home"),
          url: "/",
          icon: "RiHomeLine",
        },
      ],
    },
    account: {
      items: [
        {
          title: t("nav.home"),
          url: "/",
          icon: "RiHomeLine",
        },
        {
          title: t("user.my_orders"),
          url: "/my-orders",
          icon: "RiOrderPlayLine",
        },
      ],
    },
  };

  const isFullWidthByPrefix = FULL_WIDTH_PREFIXES.some((prefix) =>
    pathname.includes(prefix),
  );
  const isFullWidthByPattern = FULL_WIDTH_PATTERNS.some((pattern) =>
    pattern.test(pathname),
  );
  const isFullWidth = isFullWidthByPrefix || isFullWidthByPattern;

  return <AppLayout sidebar={sidebar} isFullWidth={isFullWidth}>{children}</AppLayout>;
}
