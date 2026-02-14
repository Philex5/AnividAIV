"use client";

import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import pageTitlesConfig from "@/configs/page-titles.json";

export function usePageTitle(): string | null {
  const pathname = usePathname();
  const locale = useLocale();
  
  // 移除语言前缀，获取纯路径
  const cleanPath = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
  
  // 查找匹配的路径模式
  const matchedPath = findMatchingPath(cleanPath);
  
  if (!matchedPath) {
    return null;
  }
  
  // 获取对应语言的标题
  const titles = pageTitlesConfig.pageTitles[matchedPath as keyof typeof pageTitlesConfig.pageTitles];
  if (!titles) {
    return null;
  }
  
  return titles[locale as keyof typeof titles] || titles.en || null;
}

function findMatchingPath(path: string): string | null {
  const availablePaths = Object.keys(pageTitlesConfig.pageTitles);
  
  // 精确匹配
  if (availablePaths.includes(path)) {
    return path;
  }
  
  // 动态路由匹配
  for (const pattern of availablePaths) {
    if (pattern.includes("[") && pattern.includes("]")) {
      const regex = patternToRegex(pattern);
      if (regex.test(path)) {
        return pattern;
      }
    }
  }
  
  // 部分匹配（用于子路径）
  for (const pattern of availablePaths) {
    if (path.startsWith(pattern) && pattern !== "/") {
      return pattern;
    }
  }
  
  return null;
}

function patternToRegex(pattern: string): RegExp {
  // 将 Next.js 动态路由模式转换为正则表达式
  // 例如: /posts/[slug] -> /posts/[^/]+
  // /admin/posts/[uuid]/edit -> /admin/posts/[^/]+/edit
  const regexPattern = pattern
    .replace(/\[\.\.\.[\w]+\]/g, ".*") // [...slug] -> .*
    .replace(/\[[\w]+\]/g, "[^/]+")   // [id] -> [^/]+
    .replace(/\//g, "\\/");           // / -> \/
  
  return new RegExp(`^${regexPattern}$`);
}