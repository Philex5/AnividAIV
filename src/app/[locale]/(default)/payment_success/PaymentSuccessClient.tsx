"use client";

import { useEffect, useState } from "react";
import {
  trackSubscriptionPaymentSuccess,
  trackCreditsPaymentSuccess,
} from "@/lib/gtm";

interface PaymentSuccessClientProps {
  locale: string;
  pageData: {
    order: any;
    user: any;
    productType: string;
    translations: {
      title: string;
      subtitle: string;
      orderNumber: string;
      product: string;
      credits: string;
      amount: string;
      paymentDate: string;
      paymentMethod: string;
      email: string;
      status: string;
      statusPaid: string;
      backToHome: string;
      viewAccount: string;
      autoRedirect: string;
      autoRedirectMessage: string;
      clickHere: string;
    };
  };
  gtmEventData: {
    order_no: string;
    order: any;
    user: any;
    isSubscription: boolean;
    isCreditsPackage: boolean;
  };
}

export default function PaymentSuccessClient({
  locale,
  pageData,
  gtmEventData,
}: PaymentSuccessClientProps) {
  const { order, user, translations } = pageData;
  const [countdown, setCountdown] = useState(5);

  // 倒计时逻辑
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // 跳转到用户中心
          window.location.href = "/user-center";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // 防止同一订单重复发送GTM事件
    const { order_no } = gtmEventData;
    const sentKey = `gtm_payment_success_${order_no}`;

    // 检查sessionStorage中是否已发送过该订单的事件
    if (sessionStorage.getItem(sentKey)) {
      console.log(
        `[GTM] ⚠️ Event already sent for order ${order_no}, skipping duplicate`
      );
      return;
    }

    // 发送GTM支付成功事件
    try {
      const { order, user, isSubscription, isCreditsPackage } = gtmEventData;

      if (isSubscription) {
        // 订阅支付成功事件
        const productId = order.product_id || "";
        const subscriptionPlan = productId.toLowerCase().includes("basic")
          ? "basic"
          : productId.toLowerCase().includes("plus")
            ? "plus"
            : productId.toLowerCase().includes("pro")
              ? "pro"
              : "basic";

        const subscriptionInterval =
          order.interval === "year" ? "yearly" : "monthly";

        // 判断是否为续费（sub_times > 1）
        const isRenewal = (order.sub_times || 0) > 1;

        // 计算积分
        const monthlyCredits =
          order.interval === "year"
            ? (order.credits || 0) / 12
            : order.credits || 0;
        const totalCredits = order.credits || 0;

        trackSubscriptionPaymentSuccess({
          transaction_id: order.order_no,
          stripe_subscription_id: order.sub_id,
          subscription_plan: subscriptionPlan,
          subscription_interval: subscriptionInterval,
          currency: order.currency || "usd",
          amount: order.amount,
          is_renewal: isRenewal,
          user_uuid: user?.uuid,
          user_email: user?.email,
          monthly_credits: monthlyCredits,
          total_credits: totalCredits,
        });

        console.log(
          `[GTM] ✅ Sent subscription_payment_success event for ${order.order_no}`
        );
      } else if (isCreditsPackage) {
        // 积分包支付成功事件
        const creditsAmount = order.credits || 0;
        const packageType = "fixed"; // 根据业务逻辑调整

        trackCreditsPaymentSuccess({
          transaction_id: order.order_no,
          credits_package_type: packageType,
          credits_amount: creditsAmount,
          currency: order.currency || "usd",
          amount: order.amount,
          user_uuid: user?.uuid,
          user_email: user?.email,
        });

        console.log(
          `[GTM] ✅ Sent credits_payment_success event for ${order.order_no}`
        );
      }

      // 标记事件已发送，避免刷新页面或重新渲染时重复发送
      sessionStorage.setItem(sentKey, "true");
    } catch (gtmError) {
      console.error(`[GTM] ❌ Failed to send payment success event:`, gtmError);
      // 事件发送失败不影响页面展示
    }
  }, [gtmEventData]);

  // 格式化货币
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency?.toUpperCase() || "USD",
    }).format(amount / 100);
  };

  // 格式化日期
  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 获取产品显示名称
  const getProductDisplayName = () => {
    if (order.product_name) {
      return order.product_name;
    }
    if (order.product_id) {
      const productId = order.product_id.toLowerCase();
      if (productId.includes("basic")) return "Basic Plan";
      if (productId.includes("plus")) return "Plus Plan";
      if (productId.includes("pro")) return "Pro Plan";
      if (productId.includes("mc")) return "MC Credits Package";
    }
    return "Premium Package";
  };

  // 获取订阅周期显示
  const getSubscriptionInterval = () => {
    if (order.interval === "year") return "Yearly";
    if (order.interval === "month") return "Monthly";
    return "";
  };

  return (
    <div className="w-full max-w-lg">
      <div className="bg-card rounded-2xl shadow-xl overflow-hidden border border-border">
        {/* Header with image */}
        <div className="bg-gradient-to-r from-primary to-accent px-4 py-6 text-center">
          <img
            src="https://artworks.anividai.com/assets/email/creamy-sub-thanks-nb.webp"
            alt="Thank you"
            className="w-20 h-20 mx-auto mb-3 object-contain"
          />
          <h1 className="text-xl font-bold text-primary-foreground mb-1">
            {translations.title}
          </h1>
          <p className="text-primary-foreground/80 text-xs">
            {translations.subtitle}
          </p>
        </div>

        {/* Order Details */}
        <div className="px-4 py-4">
          <div className="space-y-3">
            {/* Order Number */}
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">
                {translations.orderNumber}
              </span>
              <span className="font-mono text-sm font-medium text-card-foreground">
                {order.order_no}
              </span>
            </div>

            {/* Product */}
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">
                {translations.product}
              </span>
              <div className="text-right">
                <div className="font-medium text-card-foreground text-sm">
                  {getProductDisplayName()}
                </div>
                {order.interval && (
                  <div className="text-xs text-muted-foreground">
                    {getSubscriptionInterval()}
                  </div>
                )}
              </div>
            </div>

            {/* Credits */}
            {order.credits > 0 && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground text-sm">
                  {translations.credits}
                </span>
                <span className="font-medium text-card-foreground text-sm">
                  {order.credits.toLocaleString()} MC
                </span>
              </div>
            )}

            {/* Amount */}
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">
                {translations.amount}
              </span>
              <span className="font-bold text-lg text-card-foreground">
                {formatCurrency(order.amount, order.currency)}
              </span>
            </div>

            {/* Payment Date */}
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">
                {translations.paymentDate}
              </span>
              <span className="text-card-foreground text-sm">
                {formatDate(order.paid_at)}
              </span>
            </div>

            {/* Payment Method */}
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-muted-foreground text-sm">
                {translations.paymentMethod}
              </span>
              <span className="text-card-foreground text-sm">Stripe</span>
            </div>

            {/* User Email */}
            {user?.email && (
              <div className="flex justify-between items-center py-2 border-b border-border">
                <span className="text-muted-foreground text-sm">
                  {translations.email}
                </span>
                <span className="text-card-foreground text-sm">
                  {user.email}
                </span>
              </div>
            )}

            {/* Status */}
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground text-sm">
                {translations.status}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400">
                ✓ {translations.statusPaid}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auto Redirect Message - Outside the card */}
      <div className="mt-6 text-center">
        {countdown > 0 && (
          <p className="text-muted-foreground text-sm font-medium animate-pulse mb-2">
            {translations.autoRedirect.replace(
              "{countdown}",
              countdown.toString()
            )}
          </p>
        )}
        <p className="text-muted-foreground text-sm">
          {translations.autoRedirectMessage.replace("{clickHere}", "").trim()}
          <a
            href="/user-center"
            className="text-primary hover:underline font-medium ml-1"
          >
            {translations.clickHere}
          </a>
          {" to go directly."}
        </p>
      </div>
    </div>
  );
}
