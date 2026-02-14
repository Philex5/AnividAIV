"use client";

import { motion } from "framer-motion";
import { Check, Loader } from "lucide-react";
import { PricingItem, Pricing as PricingType } from "@/types/blocks/pricing";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState, Fragment } from "react";
import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Icon from "@/components/icon";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppContext } from "@/contexts/app";
import { useLocale } from "next-intl";
import { getCreamyCharacterUrl, getPaymentIconUrl } from "@/lib/asset-loader";
import {
  trackBeginSubscriptionCheckout,
  trackBeginCreditsPurchase,
} from "@/lib/gtm";

export default function Pricing({
  pricing,
  isSubscriptionMember = false,
}: {
  pricing: PricingType;
  isSubscriptionMember?: boolean;
}) {
  if (pricing.disabled) {
    return null;
  }

  const locale = useLocale();

  const { user, setShowSignModal } = useAppContext();

  const renderFeatureText = (text: string) => {
    if (typeof text !== "string") return text;
    const parts = text.split(/(\[MC\])/g);
    return parts.map((part, i) => {
      if (part === "[MC]") {
        return (
          <img
            key={i}
            src={getCreamyCharacterUrl("meow_coin")}
            alt="MC"
            className="h-3.5 w-3.5 inline-block mx-0.5 mb-0.5 align-middle"
          />
        );
      }
      return part;
    });
  };

  const [group, setGroup] = useState(() => {
    // Prefer 'monthly' group if it exists
    const filteredGroups = pricing.groups?.filter((g) => g.name !== "mc_packs");
    const monthlyGroup = filteredGroups?.find((g) => g.name === "monthly");
    if (monthlyGroup) return monthlyGroup.name;

    const featuredGroup = filteredGroups?.find((g) => g.is_featured);
    // If no featured group exists, fall back to the first group
    return featuredGroup?.name || filteredGroups?.[0]?.name;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [customQty, setCustomQty] = useState<Record<string, number>>({});

  const handleCheckout = async (
    item: PricingItem,
    cn_pay: boolean = false,
    custom_mc?: number
  ) => {
    try {
      if (!user) {
        setShowSignModal(true);
        return;
      }

      // Check if user is already a subscription member trying to subscribe again
      if (isSubscriptionMember) {
        const isSubscriptionProduct = !(
          item.product_id.toLowerCase().includes("mc") ||
          item.product_id.toLowerCase().includes("credits") ||
          item.group === "mc_packs"
        );

        if (isSubscriptionProduct) {
          toast.error(
            "You are already a subscription member. Please purchase credits instead."
          );
          return;
        }
      }

      const params: any = {
        product_id: item.product_id,
        currency: cn_pay ? "cny" : item.currency,
        locale: locale || "en",
      };
      if (item.is_custom && custom_mc && custom_mc > 0) {
        params.custom_mc = Math.floor(custom_mc);
      }

      setIsLoading(true);
      setProductId(item.product_id);

      // GTM 事件跟踪：区分订阅和积分包
      try {
        // 判断是否为订阅产品（排除 MC 和积分包）
        const isSubscriptionProduct = !(
          item.product_id.toLowerCase().includes("mc") ||
          item.product_id.toLowerCase().includes("credits") ||
          item.group === "mc_packs"
        );

        if (isSubscriptionProduct) {
          // 订阅产品事件跟踪
          const subscriptionPlan = item.title?.toLowerCase().includes("basic")
            ? "basic"
            : item.title?.toLowerCase().includes("plus")
              ? "plus"
              : item.title?.toLowerCase().includes("pro")
                ? "pro"
                : "basic";

          const subscriptionInterval =
            item.interval === "year" ? "yearly" : "monthly";

          // 从价格中提取金额（转换为分）
          const priceMatch = item.price?.match(/\d+/);
          const priceInDollars = priceMatch ? parseInt(priceMatch[0]) : 0;
          const amountInCents = priceInDollars * 100;

          // 计算积分
          const monthlyCredits = item.credits
            ? item.interval === "year"
              ? item.credits / 12
              : item.credits
            : 0;
          const totalCredits = item.credits || 0;

          trackBeginSubscriptionCheckout({
            product_id: item.product_id,
            product_name: item.title || "Subscription",
            subscription_plan: subscriptionPlan,
            subscription_interval: subscriptionInterval,
            currency: cn_pay ? "cny" : item.currency || "usd",
            amount: amountInCents,
            monthly_credits: monthlyCredits,
            total_credits: totalCredits,
            user_uuid: user?.uuid,
            user_email: user?.email,
            payment_method: cn_pay ? "creem" : "stripe",
          });
        } else {
          // 积分包事件跟踪
          const creditsAmount = item.credits || custom_mc || 0;
          const packageType = item.is_custom ? "custom" : "fixed";

          // 从价格中提取金额（转换为分）
          const priceMatch = item.price?.match(/\d+/);
          const priceInDollars = priceMatch ? parseInt(priceMatch[0]) : 0;
          const amountInCents = priceInDollars * 100;

          // 自定义 MC 的单价
          const customMcRate = item.custom_rate || 0.05;

          trackBeginCreditsPurchase({
            product_id: item.product_id,
            product_name: item.title || `${creditsAmount} MC`,
            credits_package_type: packageType,
            credits_amount: creditsAmount,
            currency: cn_pay ? "cny" : item.currency || "usd",
            amount: amountInCents,
            user_uuid: user?.uuid,
            user_email: user?.email,
            payment_method: cn_pay ? "creem" : "stripe",
            is_custom_mc: item.is_custom,
            custom_mc_amount: item.is_custom ? custom_mc : undefined,
            custom_mc_rate: item.is_custom ? customMcRate : undefined,
          });
        }
      } catch (gtmError) {
        console.error("[GTM] Failed to track event:", gtmError);
        // GTM 错误不影响支付流程
      }

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        setIsLoading(false);
        setProductId(null);

        setShowSignModal(true);
        return;
      }

      const { code, message, data } = await response.json();
      if (code !== 0) {
        toast.error(message);
        return;
      }

      const { checkout_url } = data;
      if (!checkout_url) {
        toast.error("checkout failed");
        return;
      }

      window.location.href = checkout_url;
    } catch (e) {
      console.log("checkout failed: ", e);

      toast.error("checkout failed");
    } finally {
      setIsLoading(false);
      setProductId(null);
    }
  };

  useEffect(() => {
    if (pricing.items) {
      const featuredItem = pricing.items.find((i) => i.is_featured);
      setProductId(featuredItem?.product_id || pricing.items[0]?.product_id);
      setIsLoading(false);
    }
  }, [pricing.items]);

  return (
    <section id={pricing.name} className="py-0">
      <div className="container px-0">
        <div className="mx-auto mb-12 text-center">
          <h2 className="mb-4 text-4xl font-extrabold tracking-tight lg:text-5xl bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {pricing.title}
          </h2>
          <p className="mx-auto max-w-2xl text-muted-foreground text-base lg:text-lg leading-relaxed">
            {pricing.description}
          </p>
        </div>

        {/* Subscription Plans Section */}
        <div className="w-full flex flex-col items-center gap-1 mb-16">
          <h2 className="sr-only">Subscription Plans</h2>
          {(() => {
            const filteredGroups =
              pricing.groups?.filter((g) => g.name !== "mc_packs") || [];
            return (
              <>
                {filteredGroups.length > 0 && (
                  <div className="mx-auto w-full max-w-[min(100%,420px)] sm:w-auto sm:max-w-none flex sm:inline-flex items-center rounded-2xl sm:rounded-full glass-panel p-1 mb-10 sm:p-1 sm:mb-12 overflow-hidden sm:overflow-visible">
                    <RadioGroup
                      value={group}
                      className="flex w-full items-center gap-1 sm:w-auto"
                      onValueChange={(value) => {
                        setGroup(value);
                      }}
                    >
                      {filteredGroups.map((item, i) => {
                        const isChecked = group === item.name;
                        return (
                          <div
                            key={i}
                            className="relative flex-1 min-w-0 sm:flex-none"
                          >
                            <RadioGroupItem
                              value={item.name || ""}
                              id={item.name}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={item.name}
                              className={`relative flex min-h-[48px] sm:h-8 cursor-pointer items-center justify-center rounded-xl sm:rounded-full px-2 sm:px-6 text-[11px] sm:text-sm font-bold transition-colors duration-300 z-10 text-center leading-tight ${
                                isChecked 
                                  ? "text-primary-foreground" 
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1 min-w-0">
                                <span className="whitespace-normal break-words sm:whitespace-nowrap sm:break-normal">
                                  {item.title}
                                </span>
                                {item.label && (
                                  <span 
                                    className={`sm:hidden flex-shrink-0 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-tighter ${
                                      isChecked 
                                        ? "bg-primary-foreground/20 text-primary-foreground" 
                                        : "bg-primary/10 text-primary"
                                    }`}
                                  >
                                    {item.label}
                                  </span>
                                )}
                              </div>
                              {item.label && (
                                <Badge
                                  variant="outline"
                                  className={`absolute -top-2.5 -right-2 hidden sm:inline-flex border-primary bg-primary px-1.5 py-0 text-[10px] font-bold uppercase text-primary-foreground ${
                                    isChecked ? "border-primary-foreground/30" : ""
                                  }`}
                                >
                                  {item.label}
                                </Badge>
                              )}
                            </Label>
                            {isChecked && (
                              <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-primary rounded-xl sm:rounded-full shadow-sm z-0"
                                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </RadioGroup>
                  </div>
                )}
                {(() => {
                  const visibleItems =
                    pricing.items?.filter(
                      (item) => !item.group || item.group === group
                    ) || [];
                  const cols = Math.min(visibleItems.length || 1, 4);
                  const colsClass =
                    cols === 1
                      ? "md:grid-cols-1"
                      : cols === 2
                        ? "md:grid-cols-2"
                        : cols === 3
                          ? "md:grid-cols-2 lg:grid-cols-3"
                          : "md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4";

                  return (
                    <div
                      className={`w-full mt-0 grid gap-8 grid-cols-1 ${colsClass} ${cols === 1 ? "max-w-sm mx-auto" : ""}`}
                    >
                      {pricing.items?.map((item, index) => {
                        if (item.group && item.group !== group) {
                          return null;
                        }

                        return (
                          <div
                            key={index}
                            className={`relative flex flex-col rounded-[2rem] p-6 transition-all duration-500 hover:translate-y-[-4px] glass-card ${
                              item.is_featured
                                ? "border-2 border-primary shadow-[0_10px_40px_-10px_rgba(255,149,0,0.2)] z-20"
                                : "border border-border/50 shadow-sm hover:shadow-md hover:border-border/80 z-10"
                            }`}
                          >
                            {/* Corner Badge - Positioned to avoid clipping */}
                            {item.label && (
                              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30">
                                <Badge
                                  className="bg-primary hover:bg-primary text-primary-foreground px-4 py-1 text-[11px] font-black uppercase tracking-widest shadow-lg border-none rounded-full"
                                >
                                  {item.label}
                                </Badge>
                              </div>
                            )}

                            <div className="flex h-full flex-col justify-between gap-8 relative z-10">
                              <div>
                                <div className="flex items-center justify-between mb-4">
                                  {item.title && (
                                    <h3 className="text-2xl font-black tracking-tight uppercase">
                                      {item.title}
                                    </h3>
                                  )}
                                </div>

                                <div className="flex flex-col mb-4 relative">
                                  <div className="flex items-baseline gap-2">
                                    {item.is_custom ? (
                                      <span className="text-4xl font-black tracking-tight">
                                        {(() => {
                                          const qty =
                                            customQty[item.product_id] || 0;
                                          const rate = item.custom_rate ?? 0.05;
                                          const prefix =
                                            item.custom_price_prefix ?? "$";
                                          const suffix =
                                            item.custom_price_suffix ?? "";
                                          const price = Math.max(0, qty * rate);
                                          return `${prefix}${price.toFixed(2)}${suffix}`;
                                        })()}
                                      </span>
                                    ) : (
                                      item.price && (
                                        <div className="flex items-baseline gap-1">
                                          <span className="text-4xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                                            {item.interval === "year" && item.price_per_month 
                                              ? item.price_per_month 
                                              : item.price}
                                          </span>
                                          {item.unit && (
                                            <span className="text-xs font-bold text-muted-foreground ml-1 uppercase tracking-widest">
                                              {item.unit}
                                            </span>
                                          )}
                                        </div>
                                      )
                                    )}
                                    {item.original_price && (
                                      <span className="text-xs text-muted-foreground font-medium line-through opacity-50 ml-2">
                                        {item.original_price}
                                      </span>
                                    )}
                                  </div>

                                  {/* Billed annually text for annual plans */}
                                  {item.interval === "year" && (
                                    <div className="mt-0.5">
                                      <span className="text-xs font-bold text-muted-foreground opacity-60">
                                        {(pricing.credits_display as any)?.billed_annually || "Billed annually at"} {item.price}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {item.description && (
                                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 font-medium opacity-80">
                                    {item.description}
                                  </p>
                                )}

                                {item.features_title && (
                                  <p className="mb-2 mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/50">
                                    {item.features_title}
                                  </p>
                                )}
                                {item.features && (
                                  <ul className="flex flex-col gap-4">
                                    {item.features.map((feature, fi) => {
                                      const isMcRate = feature.startsWith("MC Rate:");

                                      const featureElement = (
                                        <li
                                          className="flex items-start gap-3 text-sm"
                                          key={`feature-${fi}`}
                                        >
                                          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors bg-foreground/10 text-foreground">
                                            <Check className="h-3 w-3" />
                                          </div>
                                          <span className={`${isMcRate ? "text-primary font-black" : "text-muted-foreground font-semibold"} leading-snug`}>
                                            {renderFeatureText(feature)}
                                          </span>
                                        </li>
                                      );

                                      // Inject MC Rate after "Up to ... images or ... videos"
                                      if (item.mc_rate && (feature.toLowerCase().includes("images or") || feature.includes("画像または"))) {
                                        return (
                                          <Fragment key={`fragment-${fi}`}>
                                            {featureElement}
                                            <li
                                              className="flex items-start gap-3 text-sm"
                                              key={`feature-mc-rate-${fi}`}
                                            >
                                              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors bg-primary/10 text-primary">
                                                <Check className="h-3 w-3" />
                                              </div>
                                              <span className="text-primary font-black leading-snug">
                                                {renderFeatureText(`${pricing.credits_display?.mc_rate || "[MC] Rate"}: $${item.mc_rate.toFixed(4)}/[MC]`)}
                                              </span>
                                            </li>
                                          </Fragment>
                                        );
                                      }

                                      return featureElement;
                                    })}
                                  </ul>
                                )}
                              </div>
                              <div className="flex flex-col gap-4 mt-8">
                                {item.cn_amount && item.cn_amount > 0 ? (
                                  <div className="flex flex-col gap-2">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center opacity-60">
                                      Regional Payment Options
                                    </span>
                                    <div
                                      className={`flex items-center justify-center p-2 rounded-2xl transition-all duration-300 cursor-pointer ${
                                        isSubscriptionMember &&
                                        !(
                                          item.product_id
                                            .toLowerCase()
                                            .includes("mc") ||
                                          item.product_id
                                            .toLowerCase()
                                            .includes("credits") ||
                                          item.group === "mc_packs"
                                        )
                                          ? "opacity-30 cursor-not-allowed bg-muted grayscale"
                                          : "bg-background/40 hover:bg-background/80 border border-border/50 shadow-sm hover:shadow-md hover:scale-[1.02]"
                                      }`}
                                      onClick={() => {
                                        if (isLoading) {
                                          return;
                                        }
                                        if (
                                          isSubscriptionMember &&
                                          !(
                                            item.product_id
                                              .toLowerCase()
                                              .includes("mc") ||
                                            item.product_id
                                              .toLowerCase()
                                              .includes("credits") ||
                                            item.group === "mc_packs"
                                          )
                                        ) {
                                          toast.error(
                                            "You are already a subscription member. Please purchase credits instead."
                                          );
                                          return;
                                        }
                                        handleCheckout(item, true);
                                      }}
                                    >
                                      <img
                                        src={getPaymentIconUrl("cnpay")}
                                        alt="cnpay"
                                        className="w-20 h-10 object-contain"
                                      />
                                    </div>
                                  </div>
                                ) : null}
                                {item.button && (
                                  item.product_id === "free" ? (
                                    <div className="w-full h-14 rounded-2xl flex items-center justify-center border border-border/50 bg-muted/20">
                                      <span className="text-muted-foreground font-black uppercase tracking-widest opacity-60">
                                        {isSubscriptionMember
                                          ? (pricing.credits_display as any)?.included || "Included"
                                          : (pricing.credits_display as any)?.current_plan || "Current Plan"}
                                      </span>
                                    </div>
                                  ) : (
                                    <Button
                                      size="lg"
                                      className={`w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 ${
                                        item.is_featured ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:brightness-110" : "bg-foreground text-background hover:bg-foreground/90"
                                      } ${
                                        isSubscriptionMember &&
                                        !(
                                          item.product_id
                                            .toLowerCase()
                                            .includes("mc") ||
                                          item.product_id
                                            .toLowerCase()
                                            .includes("credits") ||
                                          item.group === "mc_packs"
                                        )
                                          ? "opacity-50 cursor-not-allowed grayscale"
                                          : ""
                                      }`}
                                      disabled={
                                        isLoading ||
                                        (isSubscriptionMember &&
                                          !(
                                            item.product_id
                                              .toLowerCase()
                                              .includes("mc") ||
                                            item.product_id
                                              .toLowerCase()
                                              .includes("credits") ||
                                            item.group === "mc_packs"
                                          )) ||
                                        (item.is_custom &&
                                          (!customQty[item.product_id] ||
                                            customQty[item.product_id] <= 0))
                                      }
                                      onClick={() => {
                                        if (isLoading) {
                                          return;
                                        }
                                        if (item.button?.url) {
                                          window.location.href = item.button.url;
                                          return;
                                        }
                                        const qty = customQty[item.product_id];
                                        handleCheckout(
                                          item,
                                          false,
                                          item.is_custom ? qty || 0 : undefined
                                        );
                                      }}
                                    >
                                      {(!isLoading ||
                                        (isLoading &&
                                          productId !== item.product_id)) && (
                                        <span>
                                          {isSubscriptionMember &&
                                          !(
                                            item.product_id
                                              .toLowerCase()
                                              .includes("mc") ||
                                            item.product_id
                                              .toLowerCase()
                                              .includes("credits") ||
                                            item.group === "mc_packs" ||
                                            item.button?.url
                                          )
                                            ? "Member Active"
                                            : item.button.title}
                                        </span>
                                      )}

                                      {isLoading &&
                                        productId === item.product_id && (
                                          <span>{item.button.title}</span>
                                        )}
                                      {isLoading &&
                                        productId === item.product_id && (
                                          <Loader className="h-5 w-5 animate-spin" />
                                        )}
                                      {item.button.icon && !isLoading && (
                                        <Icon
                                          name={item.button.icon}
                                          className="size-5"
                                        />
                                      )}
                                    </Button>
                                  )
                                )}
                                {isSubscriptionMember &&
                                  !(
                                    item.product_id
                                      .toLowerCase()
                                      .includes("mc") ||
                                    item.product_id
                                      .toLowerCase()
                                      .includes("credits") ||
                                    item.group === "mc_packs" ||
                                    item.button?.url
                                  ) && (
                                    <p className="text-muted-foreground text-[10px] text-center font-bold uppercase tracking-tighter opacity-50">
                                      Active subscription detected
                                    </p>
                                  )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </div>

        {/* MC Packs Section */}
        {pricing.mc_packs_section && (
          <div className="w-full mt-24">
            <h2 className="sr-only">Meow Coin Credit Packs</h2>
            <div className="mx-auto mb-10 text-center">
              <h3 className="mb-3 text-3xl font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {pricing.mc_packs_section.title}
              </h3>
              <p className="text-muted-foreground text-base max-w-xl mx-auto font-medium opacity-80">
                {renderFeatureText(pricing.mc_packs_section.subtitle || "")}
              </p>
              {pricing.mc_packs_section.note && (
                <p className="text-[9px] text-primary font-bold tracking-widest mt-3 bg-primary/10 inline-block px-3 py-1 rounded-full border border-primary/20 shadow-sm">
                  {renderFeatureText(pricing.mc_packs_section.note)}
                </p>
              )}
            </div>

            {/* MC Packs - Compact Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch max-w-6xl mx-auto">
              {/* Left: Pay as You Go - Span 5 */}
              {pricing.mc_payg_items && pricing.mc_payg_items.length > 0 && (
                <div className="lg:col-span-5 flex flex-col">
                  <div className="mb-4 pl-4">
                    <h4 className="text-lg font-bold tracking-tight">
                      {pricing.mc_payg?.title || "Pay as You Go"}
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-medium opacity-70">
                      {pricing.mc_payg?.description || "Custom amount"}
                    </p>
                  </div>
                  {pricing.mc_payg_items.map((item, index) => {
                    const qty = customQty[item.product_id] || 0;

                    // Unified rate calculation - use custom_rate from config
                    const rate = item.custom_rate ?? 0.0065;

                    const prefix = item.custom_price_prefix ?? "$";
                    const suffix = item.custom_price_suffix ?? "";
                    const price = Math.max(0, qty * rate);

                    return (
                      <div
                        key={index}
                        className="glass-card rounded-[2rem] p-6 flex-1 flex flex-col justify-between border border-border/50 shadow-sm hover:shadow-md transition-all duration-500"
                      >
                        <div className="space-y-6">
                          <div>
                            <label className="block mb-3 text-[9px] font-bold tracking-[0.2em] text-foreground/50 text-center">
                              {item.custom_input_label || "Meow Coin Amount"}
                            </label>
                            <div className="flex items-center justify-center gap-3 max-w-[280px] mx-auto">
                              <div className="relative group flex-1">
                                <input
                                  type="number"
                                  min={1}
                                  step={1}
                                  inputMode="numeric"
                                  className="w-full h-14 rounded-2xl border-2 border-border/30 px-4 text-xl font-bold bg-background/30 text-center focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all duration-300"
                                  placeholder={item.custom_placeholder || "0"}
                                  value={customQty[item.product_id] || ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === "") {
                                      setCustomQty((prev) => {
                                        const newState = { ...prev };
                                        delete newState[item.product_id];
                                        return newState;
                                      });
                                    } else {
                                      const n = Math.max(1, Math.floor(Number(v) || 1));
                                      setCustomQty((prev) => ({
                                        ...prev,
                                        [item.product_id]: n,
                                      }));
                                    }
                                  }}
                                />
                              </div>
                              <div className="flex-shrink-0 transition-transform duration-300 hover:scale-110">
                                <img
                                  src={getCreamyCharacterUrl("meow_coin")}
                                  alt="MC"
                                  className="h-8 w-8"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="text-center py-6 rounded-2xl bg-primary/5 border border-primary/10">
                            <span className="block text-[9px] font-bold text-primary/60 tracking-[0.2em] mb-1">Estimated Total</span>
                            <div className="flex flex-col items-center">
                              <span className="text-3xl font-bold tracking-tighter text-foreground">
                                {prefix}{price.toFixed(2)}{suffix}
                              </span>
                              {rate && (
                                <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider mt-1">
                                  {renderFeatureText(`$${rate.toFixed(4)}/[MC]`)}
                                </span>
                              )}
                              {price > 0 && price < 5 && (
                                <span className="text-[9px] font-bold text-destructive mt-1 animate-pulse">
                                  Min. purchase $5.00
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-8">
                          {item.button && (
                            <Button
                              size="lg"
                              className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold tracking-widest shadow-lg hover:shadow-primary/20 active:scale-95 bg-primary text-primary-foreground transition-all duration-300"
                              disabled={isLoading || !customQty[item.product_id] || customQty[item.product_id] <= 0 || price < 5}
                              onClick={() => {
                                if (isLoading) return;
                                const qty = customQty[item.product_id];
                                handleCheckout(item, false, item.is_custom ? qty || 0 : undefined);
                              }}
                            >
                              {!isLoading || productId !== item.product_id ? (
                                <>
                                  <span>{item.button.title}</span>
                                  {item.button.icon && <Icon name={item.button.icon} className="size-4" />}
                                </>
                              ) : (
                                <Loader className="h-5 w-5 animate-spin" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Right: Quick Options - Span 7 */}
              {pricing.mc_fixed_items && pricing.mc_fixed_items.length > 0 && (
                <div className="lg:col-span-7 flex flex-col">
                  <div className="mb-4 pl-4">
                    <h4 className="text-lg font-bold tracking-tight">
                      {pricing.mc_fixed?.title || "Quick Options"}
                    </h4>
                    <p className="text-[11px] text-muted-foreground font-medium opacity-70">
                      {pricing.mc_fixed?.description || "Choose from our popular packs"}
                    </p>
                  </div>
                  <div className="grid gap-4 flex-1">
                    {pricing.mc_fixed_items.map((item, index) => (
                      <div
                        key={index}
                        className={`relative glass-card rounded-[1.5rem] p-6 flex flex-col sm:flex-row items-center justify-between border border-border/50 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 group gap-4 overflow-hidden ${
                          item.is_featured ? "border-primary/40 bg-primary/[0.02]" : ""
                        }`}
                      >
                         {/* Badge positioned at top right */}
                         {item.label && (
                              <Badge className="absolute top-0 right-0 rounded-none rounded-bl-xl bg-primary hover:bg-primary text-primary-foreground px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm border-none z-10">
                                {item.label}
                              </Badge>
                            )}

                        <div className="flex flex-col gap-1 items-start w-full sm:w-auto">
                            <h5 className="text-lg font-black tracking-tight uppercase text-foreground/80">{item.title}</h5>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black tracking-tighter text-foreground">
                                {renderFeatureText(String(item.credits || ""))}
                              </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-2xl font-black tracking-tighter text-primary">
                              {item.price}
                            </span>
                            {item.mc_rate && (
                              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                                {renderFeatureText(`$${item.mc_rate.toFixed(4)}/[MC]`)}
                              </span>
                            )}
                          </div>
                          
                          {item.button && (
                            <Button
                              size="sm"
                              className={`rounded-xl h-11 px-6 flex items-center gap-2 text-[11px] font-bold tracking-widest transition-all duration-300 shadow-md ${
                                item.is_featured 
                                  ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20" 
                                  : "bg-foreground text-background hover:bg-foreground/90"
                              } active:scale-95`}
                              disabled={isLoading}
                              onClick={() => {
                                if (isLoading) return;
                                handleCheckout(item, false);
                              }}
                            >
                              {!isLoading || productId !== item.product_id ? (
                                <>
                                  <span>{item.button.title}</span>
                                  <Icon name="RiCoinFill" className="size-4" />
                                </>
                              ) : (
                                <Loader className="h-4 w-4 animate-spin" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feature Comparison Section */}
        {pricing.features_comparison && (
          <div className="w-full mt-32">
            <h2 className="sr-only">Feature Comparison</h2>
            <div className="mx-auto mb-16 text-center">
              <h3 className="mb-4 text-4xl font-black tracking-tight uppercase">
                {pricing.features_comparison.title}
              </h3>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto font-medium opacity-80">
                {pricing.features_comparison.subtitle}
              </p>
            </div>

            <div className="glass-card rounded-[2.5rem] overflow-hidden border border-border/50 shadow-2xl relative">
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none" />
              
              <div className="overflow-x-auto relative z-10">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border/50 bg-foreground/[0.03]">
                      {pricing.features_comparison.headers?.map(
                        (header, index) => (
                          <th
                            key={index}
                            className={`py-8 px-6 text-center text-lg font-black uppercase tracking-[0.2em] text-foreground/50 ${index === 0 ? 'text-left pl-10' : ''}`}
                          >
                            {header}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {pricing.features_comparison.rows?.map((row, rowIndex) => (
                      <tr 
                        key={rowIndex} 
                        className={`border-b border-border/50 hover:bg-primary/[0.03] transition-colors duration-200 ${rowIndex % 2 === 1 ? 'bg-foreground/[0.01]' : 'bg-transparent'}`}
                      >
                        <td className="py-6 px-6 text-left pl-10 text-sm font-black uppercase tracking-tight text-foreground/80">
                          {renderFeatureText(row.feature)}
                        </td>
                        <td className="py-6 px-6 text-center text-sm font-bold text-muted-foreground/80">
                          {renderFeatureText(row.free)}
                        </td>
                        <td className="py-6 px-6 text-center text-sm font-bold text-foreground/90">
                          {renderFeatureText(row.basic)}
                        </td>
                        <td className="py-6 px-6 text-center text-sm font-bold text-foreground/90">
                          {renderFeatureText(row.plus)}
                        </td>
                        <td className="py-6 px-6 text-center text-sm font-bold text-foreground">
                          {renderFeatureText(row.pro)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        {pricing.faq && pricing.faq.items && pricing.faq.items.length > 0 && (
          <div className="w-full mt-40 pb-20">
            <h2 className="sr-only">Frequently Asked Questions</h2>
            <div className="mx-auto mb-16 text-center">
              <h3 className="mb-4 text-4xl font-black tracking-tight uppercase">
                {pricing.faq.title}
              </h3>
            </div>

            <div className="mx-auto max-w-5xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {pricing.faq.items.map((item, index) => (
                  <div key={index} className="glass-card rounded-[2rem] p-8 border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
                    <h4 className="mb-4 font-black text-xl leading-tight tracking-tight">
                      {renderFeatureText(item.question)}
                    </h4>
                    <p className="text-base text-muted-foreground leading-relaxed font-medium opacity-80">
                      {renderFeatureText(item.answer)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
