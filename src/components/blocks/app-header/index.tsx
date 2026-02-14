"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Brand } from "@/types/blocks/base";
import Image from "next/image";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAppContext } from "@/contexts/app";
import { useResolvedImageUrl } from "@/hooks/useResolvedImage";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, Menu } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/theme/toggle";
import LocaleToggle from "@/components/locale/toggle";
import CheckInButton from "@/components/incentive/CheckInButton";
import { getCreamyCharacterUrl, getMemberBadgeUrl } from "@/lib/asset-loader";
import PromotionBanner from "@/components/blocks/promotion/promotion-banner";

interface AppHeaderProps {
  brand?: Brand;
  onMenuClick?: () => void;
  isCollapsed?: boolean;
}

interface GlobalPromotionConfig {
  enabled?: boolean;
  icon?: string;
  text?: string;
  link?: string;
}

function isExternalLink(link: string) {
  return /^https?:\/\//i.test(link);
}

export default function AppHeader({
  onMenuClick,
  isCollapsed,
}: AppHeaderProps) {
  const pageTitle = usePageTitle();
  const { user, credits, isLoadingCredits, setShowSignModal } = useAppContext();
  const t = useTranslations();
  const promotionBanner = t.raw("promotions.banner") as GlobalPromotionConfig;
  const promotionEnabled = !!promotionBanner?.enabled;
  const promotionLink = (promotionBanner?.link || "").trim();
  const promotionIcon = (promotionBanner?.icon || "").trim();
  const promotionIsExternal =
    promotionLink.length > 0 && isExternalLink(promotionLink);
  const [showMobilePromotionDetail, setShowMobilePromotionDetail] =
    useState(false);
  const mobilePromotionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMobilePromotionDetail) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (!mobilePromotionRef.current?.contains(target)) {
        setShowMobilePromotionDetail(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [showMobilePromotionDetail]);

  // 会员等级判断逻辑
  const isSub =
    user?.is_sub &&
    user?.sub_expired_at &&
    new Date(user.sub_expired_at) > new Date();

  // 获取会员等级
  const getMembershipLevel = () => {
    if (isSub && user?.sub_plan_type && user.sub_plan_type.trim()) {
      return user.sub_plan_type.trim();
    }
    return isSub ? "pro" : "free";
  };

  const membershipLevel = getMembershipLevel();

  // 获取会员显示名称
  const getMembershipDisplayName = () => {
    const levelMap: Record<string, string> = {
      free: "Free Member",
      pro: "Pro Member",
      basic: "Basic Member",
      plus: "Plus Member",
      premium: "Premium Member",
      vip: "VIP Member",
      enterprise: "Enterprise Member",
    };
    const displayName = levelMap[membershipLevel] || membershipLevel;
    return `AnividAI ${displayName}`;
  };

  const membershipDisplayName = getMembershipDisplayName();
  const displayName = user?.display_name || user?.email || "";
  const { displayUrl: userAvatarUrl } = useResolvedImageUrl(user?.avatar_url);

  return (
    <header
      className="sticky top-0 z-50 w-full transition-all duration-500"
      style={{ height: "56px" }}
    >
      {/* 顶部环境光/遮罩：极致通透的渐变遮罩 */}
      <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-background via-background/60 to-transparent pointer-events-none -z-10" />

      <div
        className={`glass-panel flex h-full items-center px-6 w-full border-b border-white/10 dark:border-white/5 overflow-visible sm:overflow-hidden relative group transition-all duration-300 ${
          isCollapsed === undefined ? "" : isCollapsed ? "lg:pl-22" : "lg:pl-58"
        }`}
      >
        {/* Force rehydration sync */}
        {/* 明亮模式内部微光效果 - 增加融合感 */}
        <div className="absolute inset-0 opacity-15 dark:opacity-0 bg-linear-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

        {/* 暗黑模式内部微光效果 - 增强水晶感 */}
        <div className="absolute inset-0 opacity-0 dark:opacity-10 bg-linear-to-tr from-primary/5 via-transparent to-accent/5 pointer-events-none" />

        {/* 微秒的流动边框效果 (仅在Hover时) */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none">
          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-2000" />
        </div>

        {/* Left Section - Menu Button & Title */}
        <div className="flex items-center gap-0.5 sm:gap-4 relative z-10">
          {/* Menu Button - Show only on mobile */}
          <Button
            variant="ghost"
            size="sm"
            shape="pill"
            className="p-1.5 hover:bg-white/20 transition-colors lg:hidden flex items-center gap-1.5"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>

          {pageTitle && (
            <div>
              <h1 className="text-sm md:text-lg font-anime font-bold bg-linear-to-r from-primary to-accent bg-clip-text text-transparent animate-slide-in-from-left">
                {pageTitle}
              </h1>
            </div>
          )}
        </div>

        {/* Center Promotion Banner */}
        <div className="mx-2 min-w-0 flex-1 px-1 sm:px-2">
          {promotionEnabled && promotionLink ? (
            <div ref={mobilePromotionRef} className="sm:hidden relative z-20">
              <button
                type="button"
                className="inline-flex max-w-full items-center px-0.5 py-1"
                aria-label={t("promotions.banner.mobile_badge")}
                onClick={() => setShowMobilePromotionDetail((prev) => !prev)}
              >
                <span className="shrink-0 rounded-full border border-primary/35 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary transition-colors hover:border-primary/55 hover:text-primary">
                  {promotionIcon || t("promotions.banner.mobile_badge")}
                </span>
              </button>

              <Link
                href={promotionLink as any}
                target={promotionIsExternal ? "_blank" : undefined}
                rel={promotionIsExternal ? "noreferrer noopener" : undefined}
                onClick={() => setShowMobilePromotionDetail(false)}
                className={`absolute left-0 top-full mt-1.5 block w-[min(72vw,320px)] rounded-full border border-primary/25 bg-background/95 px-3 py-2 shadow-sm backdrop-blur-sm transition-all duration-300 ${
                  showMobilePromotionDetail
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-2 opacity-0 pointer-events-none"
                }`}
              >
                <p className="truncate text-[11px] font-medium text-foreground">
                  {promotionBanner?.text}
                </p>
              </Link>
            </div>
          ) : null}

          <div className="hidden sm:block">
            <PromotionBanner
              enabled={promotionBanner?.enabled}
              icon={promotionBanner?.icon}
              text={promotionBanner?.text}
              link={promotionBanner?.link}
              storageKey="promo-banner-global-dismissed"
              compact
            />
          </div>
        </div>

        {/* Right Section - Theme Toggle, Credits, User Menu */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-4 mr-2">
            <CheckInButton />
            <div className="flex items-center gap-4">
              <LocaleToggle />
              <ThemeToggle />
            </div>
          </div>

          {user ? (
            <>
              {/* Credits Display - Clickable */}
              <Link
                href="/user-center"
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-transparent hover:bg-white/20 dark:hover:bg-white/10 transition-all border border-transparent hover:border-white/10"
              >
                <Image
                  src={getCreamyCharacterUrl("meow_coin")}
                  alt="Credits"
                  width={512}
                  height={512}
                  className="w-4 h-4 sm:w-5 h-5 object-contain"
                />
                <span className="text-xs sm:text-sm font-bold tabular-nums">
                  {isLoadingCredits ? "..." : credits}
                </span>
              </Link>

              {/* User Avatar Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 group focus:outline-none rounded-full p-1 transition-all hover:bg-white/20">
                    <div className="relative">
                      {/* 订阅用户渐变光晕效果 - 持续展示 */}
                      {isSub && (
                        <>
                          {/* 外层光晕 - 较厚的渐变边框 */}
                          <div className="absolute inset-[-2.5px] rounded-full bg-linear-to-r from-primary/40 via-secondary/45 to-primary/40 animate-[spin_8s_linear_infinite] blur-[0.5px]" />
                          {/* 内层光晕 - 反向旋转增强动感 */}
                          <div className="absolute inset-[-1.5px] rounded-full bg-linear-to-r from-secondary/45 via-primary/40 to-secondary/45 animate-[spin_12s_linear_infinite_reverse]" />
                        </>
                      )}
                      <Avatar
                        className={`h-8 w-8 transition-all group-hover:scale-110 ${isSub ? "ring-2 ring-primary/70 dark:ring-primary/60" : ""}`}
                      >
                        <AvatarImage
                          src={userAvatarUrl || undefined}
                          alt={displayName || undefined}
                        />
                        <AvatarFallback
                          className={
                            isSub
                              ? "bg-linear-to-br from-primary/20 to-secondary/20 text-primary"
                              : ""
                          }
                        >
                          {displayName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-40 sm:w-48" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium leading-none">
                          {displayName || user.email}
                        </p>
                        {/* 会员等级徽章 */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="cursor-pointer">
                                <Image
                                  src={getMemberBadgeUrl(
                                    `${membershipLevel}_member`,
                                  )}
                                  alt={`${membershipLevel} Member`}
                                  width={20}
                                  height={20}
                                  className="rounded"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{membershipDisplayName}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* Upgrade 按钮 - 仅对 free 用户显示 */}
                  {!isSub && (
                    <>
                      <DropdownMenuItem asChild className="cursor-pointer">
                        <Link
                          href="/pricing"
                          className="flex items-center justify-center w-full"
                        >
                          <Button
                            size="sm"
                            className="w-full bg-linear-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground"
                          >
                            {t("user.upgrade")}
                          </Button>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link
                      href="/user-center"
                      className="flex items-center w-full"
                    >
                      <User className="mr-2 h-4 w-4" />
                      <span>{t("user.user_center")}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("user.sign_out")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-3 h-7 sm:h-8"
              onClick={() => setShowSignModal(true)}
            >
              {t("user.sign_in")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
