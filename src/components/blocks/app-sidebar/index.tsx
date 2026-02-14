"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
  getSidebarIconUrl,
  getLogoUrl,
  getPublicAssetUrl,
} from "@/lib/asset-loader";
import { useState } from "react";
import { useAppContext } from "@/contexts/app";
import PromotionSidebarCard from "@/components/blocks/promotion/promotion-sidebar-card";

interface AppSidebarProps {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}

interface NavItem {
  href: string;
  iconPath: string;
}

interface GlobalPromotionConfig {
  enabled?: boolean;
  text?: string;
  link?: string;
  image?: string;
}

const tooltipKeyMap = {
  "/home": "home",
  "/my-creations": "my_creations",
  "/user": "profile",
  "/community": "community",
  "/oc-maker": "oc_maker",
  "/ai-anime-generator": "ai_anime_generator",
  "/ai-anime-video-generator": "ai_anime_video_generator",
  "/chat": "chat",
  "/ai-action-figure-generator": "ai_action_figure_generator",
  "/ai-sticker-generator": "ai_sticker_generator",
  "/oc-apps": "oc_apps",
} as const;

export default function AppSidebar({
  isMobile = false,
  isOpen = false,
  onClose,
  isCollapsed: propsIsCollapsed,
  setIsCollapsed: propsSetIsCollapsed,
}: AppSidebarProps) {
  const pathname = usePathname();
  const tSidebar = useTranslations("sidebar");
  const t = useTranslations();
  const [localIsCollapsed, localSetIsCollapsed] = useState(false);
  const { user } = useAppContext();
  const sidebarPromotion = t.raw(
    "promotions.sidebar_card",
  ) as GlobalPromotionConfig;

  const isCollapsed = propsIsCollapsed ?? localIsCollapsed;
  const setIsCollapsed = propsSetIsCollapsed ?? localSetIsCollapsed;

  const logoUrl = getLogoUrl();
  const logoCollapsedUrl = getPublicAssetUrl("logo_collapsed.webp");
  const userProfilePath = user?.uuid ? `/user/${user.uuid}` : "/user";

  const userNavigation: NavItem[] = [
    {
      href: "/home",
      iconPath: getSidebarIconUrl("home"),
    },
    {
      href: "/my-creations",
      iconPath: getSidebarIconUrl("creations"),
    },
    {
      href: userProfilePath,
      iconPath: getSidebarIconUrl("profile"),
    },
  ];

  const community: NavItem[] = [
    {
      href: "/community",
      iconPath: getSidebarIconUrl("community"),
    },
  ];

  const creationTools: NavItem[] = [
    {
      href: "/oc-maker",
      iconPath: getSidebarIconUrl("oc_maker"),
    },
    {
      href: "/ai-anime-generator",
      iconPath: getSidebarIconUrl("image_generator"),
    },
    {
      href: "/ai-anime-video-generator",
      iconPath: getSidebarIconUrl("video_generator"),
    },
    {
      href: "/chat",
      iconPath: getSidebarIconUrl("chat"),
    },
  ];

  const ocAppsSubmenu: NavItem[] = [
    {
      href: "/ai-action-figure-generator",
      iconPath: getSidebarIconUrl("oc_apps"),
    },
    {
      href: "/ai-sticker-generator",
      iconPath: getSidebarIconUrl("oc_apps"),
    },
  ];

  const isActiveLink = (href: string) => {
    if (href.startsWith("/user/")) {
      return pathname.startsWith("/user/");
    }
    return (
      pathname === href ||
      (href === "/home" && (pathname === "/" || pathname === ""))
    );
  };

  const getTooltipText = (href: string) => {
    if (href.startsWith("/user/")) {
      return tSidebar("profile");
    }
    if (href in tooltipKeyMap) {
      const key = tooltipKeyMap[href as keyof typeof tooltipKeyMap];
      return tSidebar(key);
    }
    return "";
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const NavButton = ({
    item,
    submenu,
  }: {
    item: NavItem;
    submenu?: NavItem[];
  }) => {
    const IconComponent = () => (
      <img
        src={item.iconPath}
        alt={getTooltipText(item.href)}
        className="shrink-0 transition-transform duration-200 hover:scale-110 contrast-[1.05] saturate-[1.05] dark:brightness-110"
      />
    );

    // 移动端处理submenu
    if (isMobile && submenu && submenu.length > 0) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-muted/80 text-foreground/90 hover:text-foreground w-full">
              <IconComponent />
              <span className="font-medium text-sm whitespace-nowrap">
                {getTooltipText("/oc-apps")}
              </span>
              <ChevronDown className="w-4 h-4 ml-auto" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="bottom"
            align="start"
            className="w-48 z-100000"
          >
            {submenu.map((subItem) => (
              <DropdownMenuItem key={subItem.href} asChild>
                <Link
                  href={subItem.href}
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 w-full cursor-pointer"
                >
                  <span className="font-medium text-sm">
                    {getTooltipText(subItem.href)}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    if (isMobile) {
      // 移动端：图标 + 文字标签双列布局
      return (
        <Link
          href={item.href}
          onClick={handleLinkClick}
          className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200 hover:bg-muted/80 w-full ${
            isActiveLink(item.href)
              ? "bg-primary/10 text-primary"
              : "text-foreground/90 hover:text-foreground"
          }`}
        >
          <IconComponent />
          <span className="font-medium text-sm whitespace-nowrap">
            {getTooltipText(item.href)}
          </span>
        </Link>
      );
    }

    // 折叠状态：显示图标 + tooltip
    if (isCollapsed) {
      if (submenu && submenu.length > 0) {
        return (
          <TooltipProvider>
            <Tooltip>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <TooltipTrigger asChild>
                    <button className="flex items-center justify-center p-2 rounded-xl transition-all duration-200 hover:bg-muted/80 group text-foreground/90 hover:text-foreground mx-auto">
                      <div className="w-7 h-7 flex items-center justify-center shrink-0">
                        <IconComponent />
                      </div>
                    </button>
                  </TooltipTrigger>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="start"
                  className="w-56 z-[100000]"
                >
                  {submenu.map((subItem) => (
                    <DropdownMenuItem key={subItem.href} asChild>
                      <Link
                        href={subItem.href}
                        onClick={handleLinkClick}
                        className="flex items-center gap-3 w-full cursor-pointer"
                      >
                        <span className="font-medium text-sm">
                          {getTooltipText(subItem.href)}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent
                side="right"
                className="glass-panel z-[100] px-3 py-1.5 text-sm font-medium text-popover-foreground shadow-xl rounded-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=right]:slide-in-from-left-2"
              >
                <p>{getTooltipText(item.href)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }

      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                onClick={handleLinkClick}
                className={`flex items-center justify-center p-2 rounded-xl transition-all duration-300 group mx-auto ${
                  isActiveLink(item.href)
                    ? "bg-white dark:bg-white/20 text-primary shadow-md scale-105"
                    : "text-foreground/70 dark:text-foreground/80 hover:text-foreground hover:bg-white/50 dark:hover:bg-white/10"
                }`}
              >
                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <IconComponent />
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="glass-panel z-[100] px-3 py-1.5 text-sm font-medium text-popover-foreground shadow-xl rounded-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=right]:slide-in-from-left-2"
            >
              <p>{getTooltipText(item.href)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // 展开状态：图标 + 标题横向布局
    if (submenu && submenu.length > 0) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex items-center gap-3 p-2 rounded-xl transition-all duration-200 hover:bg-muted/80 w-full text-left group ${
                isActiveLink("/oc-apps")
                  ? "bg-primary/10 text-primary"
                  : "text-foreground/90 hover:text-foreground"
              }`}
            >
              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                <IconComponent />
              </div>
              <span className="font-medium text-sm whitespace-nowrap truncate">
                {getTooltipText("/oc-apps")}
              </span>
              <ChevronDown className="w-4 h-4 ml-auto shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="w-56 z-100000"
          >
            {submenu.map((subItem) => (
              <DropdownMenuItem key={subItem.href} asChild>
                <Link
                  href={subItem.href}
                  onClick={handleLinkClick}
                  className="flex items-center gap-3 w-full cursor-pointer"
                >
                  <span className="font-medium text-sm">
                    {getTooltipText(subItem.href)}
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Link
        href={item.href}
        onClick={handleLinkClick}
        className={`flex items-center gap-3 p-2 rounded-xl transition-all duration-300 group w-full text-left ${
          isActiveLink(item.href)
            ? "bg-primary/10 text-primary shadow-sm"
            : "text-foreground/90 hover:text-foreground hover:bg-muted/80"
        }`}
      >
        <div className="w-6 h-6 flex items-center justify-center shrink-0">
          <IconComponent />
        </div>
        <span className="font-medium text-sm whitespace-nowrap truncate">
          {getTooltipText(item.href)}
        </span>
      </Link>
    );
  };

  return (
    <>
      {!isMobile && (
        <aside
          className={`fixed left-0 top-0 z-60 h-screen ${isCollapsed ? "w-16" : "w-52"} bg-transparent transition-all duration-300`}
        >
          <div className="glass-panel flex flex-col pt-2 pb-6 space-y-1 h-full relative overflow-y-auto scrollbar-hide border-r border-white/10 dark:border-white/5">
            {/* Logo Section */}
            <div
              className={`mb-5 flex items-center transition-all duration-300 ${isCollapsed ? "justify-center" : "justify-start pl-4"}`}
            >
              <Link href="/" className="flex items-center group">
                {isCollapsed ? (
                  <img
                    src={logoCollapsedUrl}
                    alt="AnividAI"
                    className="w-6 h-6 object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <img
                    src={logoUrl}
                    alt="AnividAI"
                    className="w-28 h-8 object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </Link>
            </div>

            {/* Force rehydration sync */}
            {/* 明亮模式内部微光效果 - 增加融合感 */}
            <div className="absolute inset-0 opacity-10 dark:opacity-0 bg-linear-to-b from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

            {/* 暗黑模式内部微光效果 - 增强水晶感 */}
            <div className="absolute inset-0 opacity-0 dark:opacity-10 bg-linear-to-b from-primary/5 via-transparent to-accent/5 pointer-events-none" />

            {/* User Navigation */}
            <div
              className={`space-y-1 relative z-10 flex flex-col ${isCollapsed ? "items-center" : "px-3"}`}
            >
              {userNavigation.map((item) => (
                <NavButton key={item.href} item={item} />
              ))}
            </div>

            {!isCollapsed && (
              <div className="px-2 my-2">
                <div className="w-full h-px bg-border/50" />
              </div>
            )}

            {/* Community */}
            <div
              className={`space-y-1 flex flex-col ${isCollapsed ? "items-center" : "px-3"}`}
            >
              {community.map((item) => (
                <NavButton key={item.href} item={item} />
              ))}
            </div>

            {!isCollapsed && (
              <>
                <div className="px-2 my-2">
                  <div className="w-full h-px bg-border/50" />
                </div>

                {/* Creation Tools */}
                <div className="space-y-1 flex flex-col px-3">
                  {creationTools.map((item) => (
                    <NavButton key={item.href} item={item} />
                  ))}
                  {/* Studo Tools Submenu */}
                  <NavButton
                    item={{
                      href: "/oc-apps",
                      iconPath: getSidebarIconUrl("oc_apps"),
                    }}
                    submenu={ocAppsSubmenu}
                  />
                </div>
              </>
            )}

            {isCollapsed && (
              <div className="px-2 my-2">
                <div className="w-full h-px bg-border/50" />
              </div>
            )}

            {/* Creation Tools - Collapsed View */}
            {isCollapsed && (
              <div className="space-y-1 flex flex-col items-center">
                {creationTools.map((item) => (
                  <NavButton key={item.href} item={item} />
                ))}
                {/* Studo Tools Submenu */}
                <NavButton
                  item={{
                    href: "/studio-tools",
                    iconPath: getSidebarIconUrl("oc_apps"),
                  }}
                  submenu={ocAppsSubmenu}
                />
              </div>
            )}

            <div className="mt-auto space-y-3 px-3 pt-4">
              {!isCollapsed && (
                <PromotionSidebarCard
                  enabled={sidebarPromotion?.enabled}
                  image={sidebarPromotion?.image}
                  text={sidebarPromotion?.text}
                  link={sidebarPromotion?.link}
                />
              )}

              {/* 折叠/展开按钮 */}
              <div className="flex justify-end">
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="flex items-center justify-center p-2 rounded-xl hover:bg-muted/80 transition-all duration-300 group"
                >
                  {isCollapsed ? (
                    <PanelLeftOpen className="w-5 h-5 text-foreground/70 group-hover:text-foreground transition-colors" />
                  ) : (
                    <PanelLeftClose className="w-5 h-5 text-foreground/70 group-hover:text-foreground transition-colors" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {isMobile && (
        <div
          className={`fixed inset-0 !z-[99999] lg:hidden transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside
            className={`glass-panel fixed left-4 top-4 bottom-4 !z-[99999] w-64 shadow-2xl rounded-[2rem] transition-transform duration-300 ease-out ${isOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]"}`}
          >
            {/* Force rehydration sync */}
            <div className="flex flex-col h-full pt-8 pb-4 space-y-1 overflow-y-auto scrollbar-hide">
              {/* Mobile Logo */}
              <div className="px-6 mb-6">
                <Link href="/" onClick={onClose} className="flex items-center">
                  <img
                    src={logoUrl}
                    alt="AnividAI"
                    className="w-32 h-10 object-contain"
                  />
                </Link>
              </div>

              {/* User Navigation */}
              <div className="px-4 space-y-1">
                {userNavigation.map((item) => (
                  <NavButton key={item.href} item={item} />
                ))}
              </div>

              <div className="px-2">
                <div className="w-full h-px bg-border/50 my-2" />
              </div>

              {/* Community */}
              <div className="px-4 space-y-1">
                {community.map((item) => (
                  <NavButton key={item.href} item={item} />
                ))}
              </div>

              <div className="px-2">
                <div className="w-full h-px bg-border/50 my-2" />
              </div>

              {/* Creation Tools */}
              <div className="px-4 space-y-1">
                {creationTools.map((item) => (
                  <NavButton key={item.href} item={item} />
                ))}
                {/* Studo Tools Submenu */}
                <NavButton
                  item={{
                    href: "/oc-apps",
                    iconPath: getSidebarIconUrl("oc_apps"),
                  }}
                  submenu={ocAppsSubmenu}
                />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
