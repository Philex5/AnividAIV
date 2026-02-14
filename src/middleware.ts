import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

// 公共路由列表（不依赖登录态的页面）
const publicRoutes = [
  "/",
  "/community",
  "/pricing",
  "/ai-anime-generator",
  "/ai-anime-video-generator",
  "/ai-action-figure-generator",
  "/ai-sticker-generator",
  "/oc-maker",
  "/anime-character-generator",
  "/posts",
  "/changelog",
  "/models",
];

function isPublicRoute(pathname: string): boolean {
  // 移除 locale 前缀后检查
  const pathWithoutLocale =
    pathname.replace(/^\/(en|ja|zh|ko|ru|fr|de|ar|es|it)/, "") || "/";
  return publicRoutes.some(
    (route) =>
      pathWithoutLocale === route || pathWithoutLocale.startsWith(`${route}/`)
  );
}

function shouldBypassIntl(pathname: string): boolean {
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel")
  ) {
    return true;
  }

  // 静态资源（包含扩展名）的路径也不需要走国际化中间件
  return /\.[^/]+$/.test(pathname);
}

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (shouldBypassIntl(pathname)) {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  // 对公共路由删除 Set-Cookie，以支持 CDN 缓存
  if (isPublicRoute(pathname)) {
    response.headers.delete("Set-Cookie");
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/(en|en-US|zh|zh-CN|zh-TW|zh-HK|zh-MO|ja|ko|ru|fr|de|ar|es|it)/:path*",
    "/((?!privacy-policy|terms-of-service|api/|_next|_vercel|.*\\..*).*)",
  ],
};
