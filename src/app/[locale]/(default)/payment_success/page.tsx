import { setRequestLocale } from "next-intl/server";
import { findOrderByOrderNo } from "@/models/order";
import { findUserByUuid } from "@/models/user";
import { trackSubscriptionPaymentSuccess, trackCreditsPaymentSuccess } from "@/lib/gtm";
import { getPaymentSuccessPage } from "@/services/page";
import { Suspense } from "react";
import PaymentSuccessClient from "./PaymentSuccessClient";

export const revalidate = 0;

export const dynamic = "force-dynamic";

export default async function PaymentSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 获取页面级国际化配置
  const pageData = await getPaymentSuccessPage(locale);

  const resolvedSearchParams = await searchParams;
  const order_no = resolvedSearchParams.order_no as string;

  if (!order_no) {
    // 如果没有order_no，重定向到首页
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {pageData.invalidPayment || "Invalid Payment"}
          </h1>
          <a href="/" className="text-primary hover:underline">
            {pageData.returnToHome || "Return to Home"}
          </a>
        </div>
      </div>
    );
  }

  // 获取订单信息
  const order = await findOrderByOrderNo(order_no);

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            {pageData.orderNotFound || "Order Not Found"}
          </h1>
          <a href="/" className="text-primary hover:underline">
            {pageData.returnToHome || "Return to Home"}
          </a>
        </div>
      </div>
    );
  }

  // 获取用户信息（如果需要）
  let user: any = null;
  if (order.user_uuid) {
    user = await findUserByUuid(order.user_uuid);
  }

  // 判断产品类型
  const isSubscription = !!order.sub_id;
  const isCreditsPackage = !order.sub_id;

  // 准备页面数据（包含翻译）
  const dataToPass = {
    order,
    user,
    productType: isSubscription ? "subscription" : "credits",
    translations: {
      title: pageData.title,
      subtitle: pageData.subtitle,
      orderNumber: pageData.orderNumber,
      product: pageData.product,
      credits: pageData.credits,
      amount: pageData.amount,
      paymentDate: pageData.paymentDate,
      paymentMethod: pageData.paymentMethod,
      email: pageData.email,
      status: pageData.status,
      statusPaid: pageData.statusPaid,
      backToHome: pageData.backToHome,
      viewAccount: pageData.viewAccount,
      autoRedirect: pageData.autoRedirect,
      autoRedirectMessage: pageData.autoRedirectMessage,
      clickHere: pageData.clickHere,
    },
  };

  // 发送GTM事件（服务端准备数据，客户端触发）
  const gtmEventData = {
    order_no,
    order,
    user,
    isSubscription,
    isCreditsPackage,
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <PaymentSuccessClient
          locale={locale}
          pageData={dataToPass}
          gtmEventData={gtmEventData}
        />
      </Suspense>
    </div>
  );
}
