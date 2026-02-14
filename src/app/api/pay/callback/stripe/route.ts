import { newStripeClient } from "@/integrations/stripe";
import { handleCheckoutSession } from "@/services/stripe";
import { findOrderByOrderNo } from "@/models/order";

/**
 * 构建重定向URL，避免重复添加locale前缀
 * @param redirectUrl 基础重定向路径（如 "/user-center" 或 "/en/user-center"）
 * @param locale 当前locale（如 "en"）
 * @returns 完整的重定向URL
 */
function buildRedirectUrl(redirectUrl: string, locale: string): string {
  // 获取基础URL
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || "https://anividai.com";

  // 如果 redirectUrl 已经包含 locale 前缀，直接拼接
  if (redirectUrl.startsWith(`/${locale}/`) || redirectUrl === `/${locale}`) {
    return `${baseUrl}${redirectUrl}`;
  }

  // 否则，添加 locale 前缀
  const path = `/${locale}${redirectUrl.startsWith("/") ? "" : "/"}${redirectUrl}`;
  return `${baseUrl}${path}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const session_id = searchParams.get("session_id");
  const order_no = searchParams.get("order_no");

  const locale = searchParams.get("locale") || "en";

  // 如果缺少必要参数，直接跳转到首页
  if (!session_id || !order_no) {
    const redirectUrl = "/";
    const finalUrl = buildRedirectUrl(redirectUrl, locale);
    return Response.redirect(finalUrl, 303);
  }

  let redirectUrl = "";

  try {
    // 检查订单是否已处理过（幂等性检查）
    const existingOrder = await findOrderByOrderNo(order_no);
    if (existingOrder && existingOrder.status === "paid") {
      // 已支付的订单，重定向到payment_success页面
      redirectUrl = `/payment_success?order_no=${order_no}`;
      const finalUrl = buildRedirectUrl(redirectUrl, locale);
      return Response.redirect(finalUrl, 303);
    }

    const client = newStripeClient();

    const session = await client
      .stripe()
      .checkout.sessions.retrieve(session_id);

    // 注意：业务处理逻辑已移至 webhook（/pay/notify/stripe）
    // callback 仅负责页面重定向，避免重复处理导致邮件发送两次
    if (session.payment_status === "paid") {
      // Payment confirmed, redirecting to payment_success page with order_no
      redirectUrl = `/payment_success?order_no=${order_no}`;
    } else {
      // Session payment status not paid, redirecting to fail page
      redirectUrl = process.env.NEXT_PUBLIC_PAY_FAIL_URL || "/";
    }
  } catch (e) {
    redirectUrl = process.env.NEXT_PUBLIC_PAY_FAIL_URL || "/";
  }

  const finalUrl = buildRedirectUrl(redirectUrl, locale);
  return Response.redirect(finalUrl, 303);
}
