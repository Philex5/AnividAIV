"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState, useEffect } from "react";

import { Header as HeaderType } from "@/types/blocks/header";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import LocaleToggle from "@/components/locale/toggle";
import { Menu, Grid3X3 } from "lucide-react";
import SignToggle from "@/components/sign/toggle";
import ThemeToggle from "@/components/theme/toggle";
import { cn } from "@/lib/utils";
import { getLogoUrl } from "@/lib/asset-loader";
import PromotionBanner from "@/components/blocks/promotion/promotion-banner";

// 类型定义：子功能
interface SubFeature {
  title: string;
  description: string;
  icon?: string;
  url: string;
}

// 类型定义：应用容器项
interface AppContainerItem {
  title: string;
  description: string;
  icon?: string;
  url: string;
  sub_features: SubFeature[];
}

// 类型定义：Mega Menu列
interface MegaMenuColumn {
  title: string;
  app_container?: boolean;
  items?: (NonNullable<NonNullable<HeaderType["nav"]>["items"]>[number] & {
    sub_features?: SubFeature[];
  })[];
}

// 类型定义：支持Mega Menu的导航项
type ExtendedNavItem = NonNullable<
  NonNullable<HeaderType["nav"]>["items"]
>[0] & {
  is_mega_menu?: boolean;
  columns?: MegaMenuColumn[];
};

interface GlobalPromotionConfig {
  enabled?: boolean;
  icon?: string;
  text?: string;
  link?: string;
}

export default function Header({ header }: { header: HeaderType }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const t = useTranslations();
  const promotionBanner = t.raw("promotions.banner") as GlobalPromotionConfig;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (header.disabled) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500">
      {/* 顶部环境光/遮罩 - 增强氛围感 - 仅在未滚动时显示或调整不透明度 */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-24 bg-linear-to-b from-background via-background/60 to-transparent pointer-events-none -z-10 transition-opacity duration-500",
          isScrolled ? "opacity-0" : "opacity-80",
        )}
      />

      <div className="w-full">
        <PromotionBanner
          enabled={promotionBanner?.enabled}
          icon={promotionBanner?.icon}
          text={promotionBanner?.text}
          link={promotionBanner?.link}
          storageKey="promo-banner-global-dismissed"
          className="border-x-0 border-t-0"
          centered
        />

        <nav
          className={cn(
            "hidden justify-between lg:flex items-center px-8 h-16 transition-all duration-500",
            isScrolled
              ? "glass-panel border-b border-white/10 dark:border-white/5 shadow-sm"
              : "bg-transparent border-b border-transparent",
          )}
        >
          {/* 微秒的流动边框效果 - 仅在滚动后显示，或者一直显示但透明度不同？保持原样即可，它是 nav 的子元素 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
              <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-2000" />
            </div>
          </div>

          <div className="flex items-center gap-8 relative z-10">
            <Link
              href={(header.brand?.url as any) || "/"}
              className="flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            >
              <img
                src={getLogoUrl()}
                alt={header.brand?.logo?.alt || header.brand?.title || "Logo"}
                className="w-24 brightness-110 drop-shadow-sm"
              />
            </Link>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList className="gap-1">
                  {header.nav?.items?.map((item, i) => {
                    const extendedItem = item as ExtendedNavItem;

                    // Mega Menu 模式
                    if (extendedItem.is_mega_menu && extendedItem.columns) {
                      return (
                        <NavigationMenuItem
                          key={i}
                          className="text-muted-foreground"
                        >
                          <NavigationMenuTrigger className="font-display font-bold text-sm bg-transparent hover:bg-white/10 dark:hover:bg-white/5 transition-colors rounded-full px-4">
                            {item.icon && (
                              <Icon
                                name={item.icon}
                                className="size-4 shrink-0 mr-2"
                              />
                            )}
                            <span className="text-mixed">{item.title}</span>
                          </NavigationMenuTrigger>
                          <NavigationMenuContent className="!z-[99999]">
                            <div className="w-[760px] p-6 grid grid-cols-2 gap-6 glass-card border-refined rounded-2xl shadow-2xl animate-dialogue-appear">
                              {extendedItem.columns.map((column, colIndex) => (
                                <div key={colIndex} className="flex flex-col">
                                  {column.app_container ? (
                                    // 第二列：Studo Tools 大卡片容器
                                    <div className="flex-1 rounded-xl p-4 border border-white/10 bg-white/5 dark:bg-primary/5 backdrop-blur-sm">
                                      <ul className="space-y-4">
                                        {column.items?.map((app, appIndex) => (
                                          <li key={appIndex}>
                                            <div className="mb-3 px-3">
                                              <div className="font-display font-black text-xs text-primary/80 mb-1 uppercase tracking-widest">
                                                {app.title}
                                              </div>
                                              {app.description && (
                                                <p className="text-xs text-muted-foreground/70 font-medium">
                                                  {app.description}
                                                </p>
                                              )}
                                            </div>
                                            {/* 子功能列表 */}
                                            {app.sub_features && (
                                              <ul className="space-y-1">
                                                {app.sub_features.map(
                                                  (sub, subIndex) => (
                                                    <li key={subIndex}>
                                                      <Link
                                                        href={sub.url as any}
                                                        className="block rounded-lg p-3 hover:bg-white/10 dark:hover:bg-white/5 hover:translate-x-1 hover:shadow-sm transition-all group/sub"
                                                      >
                                                        <div className="font-display font-bold text-sm text-foreground group-hover/sub:text-primary transition-colors">
                                                          {sub.title}
                                                        </div>
                                                        {sub.description && (
                                                          <div className="text-xs text-muted-foreground/60 mt-0.5 line-clamp-1">
                                                            {sub.description}
                                                          </div>
                                                        )}
                                                      </Link>
                                                    </li>
                                                  ),
                                                )}
                                              </ul>
                                            )}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ) : (
                                    // 第一列：普通功能列表
                                    <div className="space-y-4">
                                      <div className="px-3 font-display font-black text-xs text-muted-foreground/40 uppercase tracking-widest">
                                        {column.title || "Features"}
                                      </div>
                                      <ul className="space-y-1">
                                        {column.items?.map(
                                          (item, itemIndex) => (
                                            <li key={itemIndex}>
                                              <Link
                                                href={item.url as any}
                                                className="block rounded-lg p-3 hover:bg-primary/10 hover:translate-x-1 transition-all group/item"
                                              >
                                                <div className="font-display font-bold text-sm text-foreground group-hover/item:text-primary transition-colors">
                                                  {item.title}
                                                </div>
                                                {item.description && (
                                                  <div className="text-xs text-muted-foreground/60 mt-0.5">
                                                    {item.description}
                                                  </div>
                                                )}
                                              </Link>
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                      );
                    }

                    // 普通下拉菜单
                    if (item.children && item.children.length > 0) {
                      return (
                        <NavigationMenuItem
                          key={i}
                          className="text-muted-foreground"
                        >
                          <NavigationMenuTrigger className="font-display font-bold text-sm bg-transparent hover:bg-white/10 dark:hover:bg-white/5 transition-colors rounded-full px-4">
                            {item.icon && (
                              <Icon
                                name={item.icon}
                                className="size-4 shrink-0 mr-2"
                              />
                            )}
                            <span className="text-mixed">{item.title}</span>
                          </NavigationMenuTrigger>
                          <NavigationMenuContent>
                            <ul className="w-80 p-3 glass-card border-refined rounded-lg shadow-2xl animate-dialogue-appear">
                              <NavigationMenuLink>
                                {item.children.map((iitem, ii) => (
                                  <li key={ii}>
                                    <Link
                                      className={cn(
                                        "flex select-none gap-4 rounded-lg p-3 leading-none no-underline outline-hidden transition-all hover:bg-primary/10 hover:translate-x-1 group/drop",
                                      )}
                                      href={iitem.url as any}
                                      target={iitem.target}
                                    >
                                      {iitem.icon && (
                                        <div className="size-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover/drop:bg-primary/20 transition-colors">
                                          <Icon
                                            name={iitem.icon}
                                            className="size-5 text-primary"
                                          />
                                        </div>
                                      )}
                                      <div className="flex flex-col justify-center">
                                        <div className="font-display text-sm font-bold text-foreground group-hover/drop:text-primary transition-colors">
                                          {iitem.title}
                                        </div>
                                        {iitem.description && (
                                          <p className="font-body text-xs leading-snug text-muted-foreground/70 mt-1 line-clamp-1">
                                            {iitem.description}
                                          </p>
                                        )}
                                      </div>
                                    </Link>
                                  </li>
                                ))}
                              </NavigationMenuLink>
                            </ul>
                          </NavigationMenuContent>
                        </NavigationMenuItem>
                      );
                    }

                    // 简单链接
                    return (
                      <NavigationMenuItem key={i}>
                        <Link
                          className={cn(
                            "text-muted-foreground font-display font-bold text-sm transition-colors hover:text-primary rounded-full px-4",
                            navigationMenuTriggerStyle(),
                            "bg-transparent hover:bg-white/10 dark:hover:bg-white/5",
                          )}
                          href={item.url as any}
                          target={item.target}
                        >
                          {item.title}
                        </Link>
                      </NavigationMenuItem>
                    );
                  })}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="shrink-0 flex gap-4 items-center relative z-10">
            <div className="flex items-center gap-8">
              {header.show_locale && <LocaleToggle />}
              {header.show_theme && <ThemeToggle />}
            </div>

            <div className="h-6 w-[1px] bg-white/10 mx-2" />

            {header.buttons?.map((item, i) => {
              return (
                <Button
                  key={i}
                  variant={item.variant}
                  shape="pill"
                  size="sm"
                  className="font-display font-black tracking-tight anime-button"
                >
                  <Link
                    href={item.url as any}
                    target={item.target || ""}
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    {item.title}
                    {item.icon && (
                      <Icon name={item.icon} className="size-4 shrink-0" />
                    )}
                  </Link>
                </Button>
              );
            })}
            {header.show_sign && <SignToggle />}
          </div>
        </nav>

        {/* Mobile Header */}
        <div className="block lg:hidden">
          <div
            className={cn(
              "flex items-center justify-between px-5 h-14 transition-all duration-500 relative group overflow-hidden",
              isScrolled
                ? "glass-panel border-b border-white/10 dark:border-white/5"
                : "bg-transparent border-b border-transparent",
            )}
          >
            <Link
              href={(header.brand?.url || "/") as any}
              className="flex items-center gap-2 active:scale-95 transition-transform"
            >
              <img
                src={getLogoUrl()}
                alt={header.brand?.logo?.alt || header.brand?.title || "Logo"}
                className="w-20"
              />
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  shape="pill"
                  className="hover:bg-white/10 active:scale-90 transition-transform"
                >
                  <Menu className="size-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-full sm:max-w-md p-0 bg-transparent border-none"
              >
                <div className="h-full glass-panel backdrop-blur-3xl flex flex-col p-6 rounded-l-xl border-l border-white/20">
                  <SheetHeader className="mb-6">
                    <div className="flex items-center justify-between">
                      <SheetTitle className="text-left font-display font-black text-2xl tracking-tighter text-primary">
                        AnividAI
                      </SheetTitle>
                    </div>
                  </SheetHeader>

                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                    <Accordion
                      type="single"
                      collapsible
                      className="w-full space-y-2"
                    >
                      {header.nav?.items?.map((item, i) => {
                        const extendedItem = item as ExtendedNavItem;

                        // Mega Menu 模式
                        if (extendedItem.is_mega_menu && extendedItem.columns) {
                          return (
                            <AccordionItem
                              key={i}
                              value={item.title || ""}
                              className="border-none bg-white/5 dark:bg-white/2 rounded-lg px-4"
                            >
                              <AccordionTrigger className="font-display font-bold text-base py-4 hover:no-underline hover:text-primary transition-colors">
                                <span className="flex items-center gap-3">
                                  {item.icon && (
                                    <Icon
                                      name={item.icon}
                                      className="size-5 text-primary"
                                    />
                                  )}
                                  {item.title}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="pb-4">
                                <div className="space-y-6 pt-2 pl-4 border-l-2 border-primary/20">
                                  {extendedItem.columns.map(
                                    (column, colIndex) => (
                                      <div key={colIndex}>
                                        {column.app_container ? (
                                          <div className="space-y-6">
                                            {column.items?.map(
                                              (app, appIndex) => (
                                                <div
                                                  key={appIndex}
                                                  className="mb-4 last:mb-0"
                                                >
                                                  <div className="font-display font-black text-[10px] uppercase tracking-[0.2em] text-primary/60 mb-3">
                                                    {app.title}
                                                  </div>
                                                  {app.sub_features && (
                                                    <ul className="space-y-4">
                                                      {app.sub_features.map(
                                                        (sub, subIndex) => (
                                                          <li key={subIndex}>
                                                            <Link
                                                              href={
                                                                sub.url as any
                                                              }
                                                              className="block group"
                                                            >
                                                              <div className="font-display font-bold text-sm group-hover:text-primary transition-colors">
                                                                {sub.title}
                                                              </div>
                                                              {sub.description && (
                                                                <div className="text-xs text-muted-foreground/60 mt-0.5">
                                                                  {
                                                                    sub.description
                                                                  }
                                                                </div>
                                                              )}
                                                            </Link>
                                                          </li>
                                                        ),
                                                      )}
                                                    </ul>
                                                  )}
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        ) : (
                                          <ul className="space-y-4">
                                            {column.items?.map(
                                              (item, itemIndex) => (
                                                <li key={itemIndex}>
                                                  <Link
                                                    href={item.url as any}
                                                    className="block group"
                                                  >
                                                    <div className="font-display font-bold text-sm group-hover:text-primary transition-colors">
                                                      {item.title}
                                                    </div>
                                                    {item.description && (
                                                      <div className="text-xs text-muted-foreground/60 mt-0.5">
                                                        {item.description}
                                                      </div>
                                                    )}
                                                  </Link>
                                                </li>
                                              ),
                                            )}
                                          </ul>
                                        )}
                                      </div>
                                    ),
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        }

                        // 普通下拉菜单
                        if (item.children && item.children.length > 0) {
                          return (
                            <AccordionItem
                              key={i}
                              value={item.title || ""}
                              className="border-none bg-white/5 dark:bg-white/2 rounded-lg px-4"
                            >
                              <AccordionTrigger className="font-display font-bold text-base py-4 hover:no-underline hover:text-primary transition-colors">
                                <span className="flex items-center gap-3">
                                  {item.icon && (
                                    <Icon
                                      name={item.icon}
                                      className="size-5 text-primary"
                                    />
                                  )}
                                  {item.title}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent className="pb-4">
                                <div className="space-y-4 pt-2 pl-4 border-l-2 border-primary/20">
                                  {item.children.map((iitem, ii) => (
                                    <Link
                                      key={ii}
                                      className="block group"
                                      href={iitem.url as any}
                                      target={iitem.target}
                                    >
                                      <div className="font-display font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                                        {iitem.title}
                                      </div>
                                      {iitem.description && (
                                        <p className="text-xs text-muted-foreground/60 mt-1">
                                          {iitem.description}
                                        </p>
                                      )}
                                    </Link>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        }

                        // 简单链接
                        return (
                          <Link
                            key={i}
                            href={item.url as any}
                            target={item.target}
                            className="font-display font-bold text-base py-4 px-4 bg-white/5 dark:bg-white/2 rounded-lg flex items-center justify-between hover:text-primary transition-colors active:translate-x-1"
                          >
                            <span className="flex items-center gap-3">
                              {item.icon && (
                                <Icon
                                  name={item.icon}
                                  className="size-5 text-primary"
                                />
                              )}
                              {item.title}
                            </span>
                          </Link>
                        );
                      })}
                    </Accordion>
                  </div>

                  <div className="mt-auto pt-8 border-t border-white/10 space-y-6">
                    <div className="flex flex-col gap-3">
                      {header.buttons?.map((item, i) => {
                        return (
                          <Button
                            key={i}
                            variant={item.variant}
                            className="w-full font-display font-black anime-button"
                            shape="pill"
                            size="lg"
                          >
                            <Link
                              href={item.url as any}
                              target={item.target || ""}
                              className="flex items-center gap-2"
                            >
                              {item.title}
                              {item.icon && (
                                <Icon name={item.icon} className="size-5" />
                              )}
                            </Link>
                          </Button>
                        );
                      })}

                      <div className="py-2 scale-105 origin-left">
                        {header.show_sign && <SignToggle />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 dark:bg-white/2 rounded-lg">
                      <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                          Theme
                        </span>
                      </div>
                      {header.show_locale && <LocaleToggle />}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
