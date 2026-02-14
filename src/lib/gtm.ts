/**
 * GTM (Google Tag Manager) 事件跟踪辅助函数
 * 用于追踪用户购买行为和支付转化情况
 */

interface GTMEventData {
  [key: string]: any;
}

/**
 * 基础函数：将事件数据推送到 GTM dataLayer
 */
export function pushToGTM(eventName: string, data: GTMEventData) {
  if (typeof window !== "undefined" && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: eventName,
      ...data,
    });
    console.log(`[GTM] Event sent: ${eventName}`, data);
  } else {
    console.warn("[GTM] dataLayer not available");
  }
}

/**
 * 追踪用户注册事件
 * 触发时机：新用户注册成功，数据库中创建新用户记录后
 */
export function trackUserRegistration(params: {
  user_uuid: string;
  user_email: string;
  signup_method: string;
  signup_provider: string;
  signup_ip?: string;
  welcome_credits: number;
  credits_expired_at: string;
}) {
  const eventData = {
    event: 'user_registration',
    user_id: params.user_uuid,
    user_email: params.user_email,
    signup_method: params.signup_method,
    signup_provider: params.signup_provider,
    signup_ip: params.signup_ip,
    signup_date: new Date().toISOString(),
    signup_timestamp: Date.now(),
    is_new_user: true,
    welcome_credits: params.welcome_credits,
    credits_expired_at: params.credits_expired_at,
  };

  pushToGTM('user_registration', eventData);
}

/**
 * 追踪订阅结账开始事件
 * 触发时机：用户点击订阅购买按钮，调用 /api/checkout 之前
 */
export function trackBeginSubscriptionCheckout(params: {
  product_id: string;
  product_name: string;
  subscription_plan: 'basic' | 'plus' | 'pro';
  subscription_interval: 'monthly' | 'yearly';
  currency: string;
  amount: number; // 分
  monthly_credits: number;
  total_credits: number;
  user_uuid?: string;
  user_email?: string;
  payment_method: string;
}) {
  const eventData = {
    event: 'begin_subscription_checkout',
    subscription_plan: params.subscription_plan,
    subscription_interval: params.subscription_interval,
    currency: params.currency.toUpperCase(),
    amount: params.amount,
    amount_display: params.amount / 100,
    items: [{
      item_id: params.product_id,
      item_name: params.product_name,
      item_brand: 'AnividAI',
      price: params.amount / 100,
      quantity: 1,
      item_category: 'subscription',
      subscription_interval: params.subscription_interval,
      subscription_periods: params.subscription_interval === 'yearly' ? 12 : 1,
      monthly_credits: params.monthly_credits,
      total_credits: params.total_credits,
    }],
    user_id: params.user_uuid,
    user_email: params.user_email,
    payment_method: params.payment_method,
  };

  pushToGTM('begin_subscription_checkout', eventData);
}

/**
 * 追踪积分包购买开始事件
 * 触发时机：用户点击积分包购买按钮，调用 /api/checkout 之前
 */
export function trackBeginCreditsPurchase(params: {
  product_id: string;
  product_name: string;
  credits_package_type: 'fixed' | 'custom';
  credits_amount: number;
  currency: string;
  amount: number; // 分
  user_uuid?: string;
  user_email?: string;
  payment_method: string;
  is_custom_mc?: boolean;
  custom_mc_amount?: number;
  custom_mc_rate?: number;
}) {
  const eventData = {
    event: 'begin_credits_purchase',
    credits_package_type: params.credits_package_type,
    credits_amount: params.credits_amount,
    currency: params.currency.toUpperCase(),
    amount: params.amount,
    amount_display: params.amount / 100,
    items: [{
      item_id: params.product_id,
      item_name: params.product_name,
      item_brand: 'AnividAI',
      price: params.amount / 100,
      quantity: 1,
      item_category: 'credits',
      credits_package_type: params.credits_package_type,
      credits_amount: params.credits_amount,
      custom_mc_rate: params.custom_mc_rate,
    }],
    user_id: params.user_uuid,
    user_email: params.user_email,
    payment_method: params.payment_method,
    is_custom_mc: params.is_custom_mc || false,
    custom_mc_amount: params.custom_mc_amount,
  };

  pushToGTM('begin_credits_purchase', eventData);
}

/**
 * 追踪订阅支付成功事件
 * 触发时机：支付成功页面加载时（订阅支付）
 */
export function trackSubscriptionPaymentSuccess(params: {
  transaction_id: string;
  stripe_subscription_id?: string;
  subscription_plan: 'basic' | 'plus' | 'pro';
  subscription_interval: 'monthly' | 'yearly';
  currency: string;
  amount: number; // 分
  is_renewal: boolean;
  user_uuid?: string;
  user_email?: string;
  monthly_credits?: number;
  total_credits?: number;
}) {
  const eventData = {
    event: 'subscription_payment_success',
    transaction_id: params.transaction_id,
    stripe_subscription_id: params.stripe_subscription_id,
    currency: params.currency.toUpperCase(),
    amount: params.amount,
    amount_display: params.amount / 100,
    subscription_plan: params.subscription_plan,
    subscription_interval: params.subscription_interval,
    subscription_periods: params.subscription_interval === 'yearly' ? 12 : 1,
    is_renewal: params.is_renewal,
    items: [{
      item_id: `${params.subscription_plan}_${params.subscription_interval}`,
      item_name: `${params.subscription_plan} ${params.subscription_interval}`,
      item_brand: 'AnividAI',
      price: params.amount / 100,
      quantity: 1,
      item_category: 'subscription',
      monthly_credits: params.monthly_credits || 0,
      total_credits: params.total_credits || 0,
    }],
    user_id: params.user_uuid,
    user_email: params.user_email,
    payment_provider: 'stripe',
    payment_status: 'completed',
    timestamp: Date.now(),
  };

  pushToGTM('subscription_payment_success', eventData);
}

/**
 * 追踪积分包支付成功事件
 * 触发时机：支付成功页面加载时（积分包支付）
 */
export function trackCreditsPaymentSuccess(params: {
  transaction_id: string;
  credits_package_type: 'fixed' | 'custom';
  credits_amount: number;
  currency: string;
  amount: number; // 分
  user_uuid?: string;
  user_email?: string;
}) {
  const eventData = {
    event: 'credits_payment_success',
    transaction_id: params.transaction_id,
    currency: params.currency.toUpperCase(),
    amount: params.amount,
    amount_display: params.amount / 100,
    credits_package_type: params.credits_package_type,
    credits_amount: params.credits_amount,
    items: [{
      item_id: params.credits_package_type === 'custom' ? 'custom_mc' : `mc_${params.credits_amount}`,
      item_name: params.credits_package_type === 'custom' ? 'Custom MC Package' : `${params.credits_amount} MC`,
      item_brand: 'AnividAI',
      price: params.amount / 100,
      quantity: 1,
      item_category: 'credits',
      credits_amount: params.credits_amount,
      credits_package_type: params.credits_package_type,
    }],
    user_id: params.user_uuid,
    user_email: params.user_email,
    payment_provider: 'stripe',
    payment_status: 'completed',
    timestamp: Date.now(),
  };

  pushToGTM('credits_payment_success', eventData);
}