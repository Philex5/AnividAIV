import { newCreemClient } from "@/integrations/creem";
import { updateOrder } from "@/services/order";

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
  const path = `/${locale}${redirectUrl.startsWith('/') ? '' : '/'}${redirectUrl}`;
  return `${baseUrl}${path}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const checkoutId = searchParams.get("checkout_id");
  const requestId = searchParams.get("request_id");

  const locale = searchParams.get("locale") || "en";
  let redirectUrl = "";

  try {
    if (!checkoutId || !requestId) {
      throw new Error("invalid params");
    }

    const client = newCreemClient();

    const result = await client.creem().retrieveCheckout({
      xApiKey: client.apiKey(),
      checkoutId: checkoutId,
    });
    if (result.requestId !== requestId) {
      throw new Error("invalid checkout data");
    }

    if (!result.order || result.order.status !== "paid") {
      throw new Error("invalid order status");
    }

    if (
      !result.customer ||
      typeof result.customer === "string" ||
      !("email" in result.customer)
    ) {
      throw new Error("invalid customer email");
    }

    const order_no = result.requestId;
    const paid_email = result.customer.email;
    const paid_detail = JSON.stringify(result);

    await updateOrder({ order_no, paid_email, paid_detail });

    redirectUrl = process.env.NEXT_PUBLIC_PAY_SUCCESS_URL || "/";
  } catch (e) {
    redirectUrl = process.env.NEXT_PUBLIC_PAY_FAIL_URL || "/";
  }

  const finalUrl = buildRedirectUrl(redirectUrl, locale);
  return Response.redirect(finalUrl, 303);
}
