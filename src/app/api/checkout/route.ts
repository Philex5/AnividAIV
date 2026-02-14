import { getUserEmail, getUserUuid } from "@/services/user";
import { insertOrder, OrderStatus, updateOrderSession } from "@/models/order";
import { respData, respErr } from "@/lib/resp";

import Stripe from "stripe";
import { findUserByUuid } from "@/models/user";
import { getSnowId } from "@/lib/hash";
import { getPricingPage } from "@/services/page";
import { PricingItem } from "@/types/blocks/pricing";
import { newStripeClient } from "@/integrations/stripe";
import { Order } from "@/types/order";
import { newCreemClient } from "@/integrations/creem";

export async function POST(req: Request) {
  try {
    let { product_id, currency, locale, custom_mc } = await req.json();

    let cancel_url = `${
      process.env.NEXT_PUBLIC_PAY_CANCEL_URL || process.env.NEXT_PUBLIC_WEB_URL
    }`;
    if (cancel_url && cancel_url.startsWith("/")) {
      // relative url
      cancel_url = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}${cancel_url}`;
    }

    if (!product_id) {
      return respErr("invalid params");
    }

    // validate checkout params
    const page = await getPricingPage(locale);
    if (!page || !page.pricing) {
      return respErr("invalid pricing table");
    }

    // Search for product in all possible locations
    let item: PricingItem | undefined;
    if (page.pricing.items) {
      item = page.pricing.items.find((i: PricingItem) => i.product_id === product_id);
    }
    if (!item && page.pricing.mc_payg_items) {
      item = page.pricing.mc_payg_items.find((i: PricingItem) => i.product_id === product_id);
    }
    if (!item && page.pricing.mc_fixed_items) {
      item = page.pricing.mc_fixed_items.find((i: PricingItem) => i.product_id === product_id);
    }

    if (!item || !item.interval || !item.currency) {
      return respErr("invalid checkout params");
    }

    let { amount, interval, valid_months, credits, credits_value, product_name, is_custom, custom_rate } = item as any;

    // Use credits_value if available (for mc_fixed_items), otherwise use credits
    const creditsToUse = credits_value || credits || 0;

    // Handle custom PAYG purchase
    if (is_custom) {
      const qty = Number(custom_mc);
      if (!qty || !Number.isFinite(qty) || qty <= 0) {
        return respErr("invalid custom_mc amount");
      }
      const rate = Number(custom_rate) || 0.005; // USD per MC
      const total = qty * rate; // USD
      amount = Math.round(total * 100); // to cents
      credits = Math.floor(qty);
    } else {
      credits = creditsToUse;
    }

    if (!amount) {
      return respErr("invalid checkout params: amount");
    }

    if (!["year", "month", "one-time"].includes(interval)) {
      return respErr("invalid interval");
    }

    if (interval === "year" && valid_months !== 12) {
      return respErr("invalid valid_months");
    }

    if (interval === "month" && valid_months !== 1) {
      return respErr("invalid valid_months");
    }

    if (currency === "cny") {
      if (!item.cn_amount) {
        return respErr("invalid checkout params: cn_amount");
      }
      amount = item.cn_amount;
    } else {
      currency = item.currency;
    }

    const is_subscription = interval === "month" || interval === "year";

    // get signed user
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth, please sign-in");
    }

    let user_email = await getUserEmail();
    if (!user_email) {
      const user = await findUserByUuid(user_uuid);
      if (user) {
        user_email = user.email;
      }
    }
    if (!user_email) {
      return respErr("invalid user");
    }

    // generate order_no
    const order_no = getSnowId();

    const currentDate = new Date();
    const created_at = currentDate.toISOString();

    // calculate expired_at (one-time orders only)
    let expired_at = "";
    if (!is_subscription && valid_months && valid_months > 0) {
      const timePeriod = new Date(currentDate);
      timePeriod.setMonth(currentDate.getMonth() + valid_months);
      expired_at = timePeriod.toISOString();
    }

    // create order
    const order = {
      order_no: order_no,
      created_at: new Date(created_at),
      user_uuid: user_uuid,
      user_email: user_email,
      amount: amount,
      interval: interval,
      expired_at: expired_at ? new Date(expired_at) : null,
      status: OrderStatus.Created,
      credits: credits || 0,
      currency: currency,
      product_id: product_id,
      product_name: product_name,
      valid_months: valid_months,
    };
    await insertOrder(order);

    const provider = process.env.PAY_PROVIDER || "stripe";

    if (provider === "creem") {
      // checkout with creem
      const result = await creemCheckout({
        order: order as any,
        locale,
        cancel_url,
      });

      return respData(result);
    }

    // checkout with stripe
    const result = await stripeCheckout({
      order: order as any,
      locale,
      cancel_url,
    });

    return respData(result);
  } catch (e: any) {
    console.log("checkout failed: ", e);
    return respErr("checkout failed: " + e.message);
  }
}

async function stripeCheckout({
  order,
  locale,
  cancel_url,
}: {
  order: Order;
  locale: string;
  cancel_url: string;
}) {
  const intervals = ["month", "year"];
  const is_subscription = order.interval ? intervals.includes(order.interval) : false;

  const client = newStripeClient();

  // 构建 success_url，确保跳转到正确的回调地址
  const successUrl = `${process.env.NEXT_PUBLIC_WEB_URL}/api/pay/callback/stripe?locale=${locale}&session_id={CHECKOUT_SESSION_ID}&order_no=${order.order_no}`;
  console.log(`[Stripe Checkout] Created session with success_url: ${successUrl}`);

  let options: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: order.currency || "USD",
          product_data: {
            name: order.product_name || "",
          },
          unit_amount: order.amount,
          recurring: is_subscription
            ? {
                interval: order.interval as any,
              }
            : undefined,
        },
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    metadata: {
      project: process.env.NEXT_PUBLIC_PROJECT_NAME || "",
      product_name: order.product_name || "",
      order_no: order.order_no,
      user_email: order.user_email,
      credits: order.credits,
      user_uuid: order.user_uuid,
    },
    mode: is_subscription ? "subscription" : "payment",
    success_url: successUrl,
    cancel_url: cancel_url,
  };

  if (order.user_email) {
    options.customer_email = order.user_email;
  }

  if (order.interval && (order.interval === "month" || order.interval === "year")) {
    options.subscription_data = {
      metadata: options.metadata,
    };
  }

  if (order.currency === "cny") {
    options.payment_method_types = ["wechat_pay", "alipay", "card"];
    options.payment_method_options = {
      wechat_pay: {
        client: "web",
      },
      alipay: {},
    };
  }

  const session = await client.stripe().checkout.sessions.create(options);

  // update order detail
  await updateOrderSession(order.order_no, session.id, JSON.stringify(options));

  return {
    order_no: order.order_no,
    session_id: session.id,
    checkout_url: session.url,
  };
}

async function creemCheckout({
  order,
  locale,
  cancel_url,
}: {
  order: Order;
  locale: string;
  cancel_url: string;
}) {
  const client = newCreemClient();

  let products = (process.env.CREEM_PRODUCTS as any) || {};
  if (typeof products === "string") {
    products = JSON.parse(products);
  }
  console.log("creem products: ", products);

  const product_id = products[order.product_id || ""] || "";
  if (!product_id) {
    throw new Error("invalid product_id");
  }

  const success_url = `${process.env.NEXT_PUBLIC_WEB_URL}/api/pay/callback/creem?locale=${locale}`;

  const result = await client.creem().createCheckout({
    xApiKey: client.apiKey(),
    createCheckoutRequest: {
      productId: product_id,
      requestId: order.order_no,
      customer: {
        email: order.user_email,
      },
      successUrl: success_url,
      metadata: {
        project: process.env.NEXT_PUBLIC_PROJECT_NAME || "",
        product_name: order.product_name || "",
        order_no: order.order_no,
        user_email: order.user_email,
        credits: order.credits,
        user_uuid: order.user_uuid,
      },
    },
  });

  // update order detail
  await updateOrderSession(order.order_no, result.id, JSON.stringify(result));

  return {
    order_no: order.order_no,
    session_id: result.id,
    checkout_url: result.checkoutUrl,
  };
}
