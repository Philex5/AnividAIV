import { Resend } from "resend";
import { getEmailTemplateUrl } from "@/lib/asset-loader";
import pricingMessages from "@/i18n/pages/pricing/en.json";

/**
 * 发送邮件服务 - Cloudflare Workers 版本
 * 适配 Workers 环境：HTTP fetch 加载模板 → 替换变量 → 发送邮件
 */

const resend = new Resend(process.env.RESEND_API_KEY!);
const SENDER_EMAIL = process.env.RESEND_SENDER_EMAIL || "noreply@anividai.com";
const WEBSITE_URL = process.env.NEXT_PUBLIC_WEB_URL || "https://anividai.com";
const STORAGE_DOMAIN =
  process.env.NEXT_PUBLIC_STORAGE_DOMAIN || process.env.STORAGE_DOMAIN || "";

// 模板缓存（避免重复请求）
const templateCache = new Map<string, string>();

export interface RawEmailSendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/**
 * 从 R2 加载邮件模板
 * @param template 模板名称（不含 .html 后缀）
 * @returns 模板 HTML 内容
 */
async function loadEmailTemplate(template: string): Promise<string> {
  // 检查缓存
  if (templateCache.has(template)) {
    return templateCache.get(template)!;
  }

  // 使用 assetLoader 获取模板 URL
  const templateUrl = getEmailTemplateUrl(template);

  try {
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error(`Failed to load email template: ${template} (${response.status})`);
    }

    const htmlContent = await response.text();

    // 缓存模板
    templateCache.set(template, htmlContent);

    console.log(`Email template loaded: ${template}`);
    return htmlContent;
  } catch (error) {
    console.error(`Error loading email template ${template}:`, error);
    throw new Error(`Failed to load email template: ${template}`);
  }
}

/**
 * 发送邮件函数
 * @param params 参数
 * @param params.to 收件人邮箱
 * @param params.template 模板名称（不含.html后缀）
 * @param params.subject 邮件主题
 * @param params.variables 变量替换对象
 * @returns 是否发送成功
 */
export async function sendEmail({
  to,
  template,
  subject,
  variables = {},
}: {
  to: string;
  template: string; // 模板文件名，不含.html后缀
  subject: string;
  variables?: Record<string, any>;
}): Promise<boolean> {
  try {
    // 从 R2 加载HTML模板
    let htmlContent = await loadEmailTemplate(template);

    // 合并默认变量
    const mergedVariables = {
      company_name: "AnividAI",
      website_url: WEBSITE_URL,
      current_year: new Date().getFullYear().toString(),
      support_email: "support@anividai.com",
      storage_domain: STORAGE_DOMAIN,
      ...variables,
    };

    // 渲染 Mustache 风格模板
    htmlContent = renderTemplate(htmlContent, mergedVariables);

    const sendResult = await sendRawEmail({
      to,
      subject,
      html: htmlContent,
    });

    if (!sendResult.ok) {
      throw new Error(sendResult.error || "Failed to send email");
    }

    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return false;
  }
}

export async function sendRawEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<RawEmailSendResult> {
  try {
    const result: any = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [to],
      subject,
      html,
      text,
    });

    const messageId = result?.data?.id || result?.id;
    const errorMessage =
      result?.error?.message || result?.error?.name || undefined;

    if (errorMessage) {
      return {
        ok: false,
        error: errorMessage,
      };
    }

    return {
      ok: true,
      messageId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email";
    return {
      ok: false,
      error: message,
    };
  }
}

/**
 * Mustache 风格模板渲染函数
 * 支持变量替换和条件渲染
 */
function renderTemplate(
  content: string,
  variables: Record<string, any>
): string {
  let result = content;

  // 处理条件块 {{#if condition}}...{{/if}}
  result = result.replace(
    /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g,
    (match, condition, innerContent) => {
      // 如果变量存在且为 truthy，则渲染内部内容
      if (variables[condition]) {
        // 递归渲染内部内容中的变量
        return renderTemplate(innerContent, variables);
      }
      return "";
    }
  );

  // 处理普通变量替换
  for (const [key, value] of Object.entries(variables)) {
    // 跳过在条件块中已经处理过的变量
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(regex, String(value ?? ""));
  }

  return result;
}

/**
 * 批量发送邮件
 * @param emails 邮件列表
 * @param template 模板名称
 * @param subject 邮件主题
 * @param variables 变量替换对象
 * @returns 发送结果
 */
export async function sendBulkEmails({
  emails,
  template,
  subject,
  variables = {},
}: {
  emails: string[];
  template: string;
  subject: string;
  variables?: Record<string, any>;
}): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  // 并发发送，但限制并发数避免过多请求
  const CONCURRENCY_LIMIT = 5;
  const chunks = chunkArray(emails, CONCURRENCY_LIMIT);

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map((email) =>
        sendEmail({
          to: email,
          template,
          subject,
          variables,
        }).then((result) => ({ email, result }))
      )
    );

    results.forEach(({ email, result }) => {
      if (result) {
        success.push(email);
      } else {
        failed.push(email);
      }
    });
  }

  return { success, failed };
}

/**
 * 将数组分块
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 发送欢迎邮件 - 注册后自动触发
 */
export async function sendWelcomeEmail({
  to,
  userName,
  signupDate,
}: {
  to: string;
  userName: string;
  signupDate: string;
}): Promise<boolean> {
  return sendEmail({
    to,
    template: "welcome",
    subject: "Welcome to AnividAI!",
    variables: {
      user_name: userName,
      signup_date: signupDate,
      cta_url: `${WEBSITE_URL}/user-center`,
    },
  });
}
/**
 * 发送订阅感谢邮件 - 付费成功后自动触发
 */
export async function sendSubscriptionThankYouEmail({
  to,
  userName,
  userUuid,
  planName,
  startDate,
  nextBillingDate,
  manageUrl,
  mcAmount,
  ocLimit,
  worldLimit,
  imageLimit,
  videoLimit,
  isPrioritySupport = false,
  hasSotaAccess = false,
  isAnnual = false,
  earlyAccess = false,
}: {
  to: string;
  userName: string;
  userUuid?: string;
  planName?: string;
  startDate?: string;
  nextBillingDate?: string;
  manageUrl?: string;
  mcAmount?: number;
  ocLimit?: number | undefined;
  worldLimit?: number | undefined;
  imageLimit?: number | undefined;
  videoLimit?: number | undefined;
  isPrioritySupport?: boolean;
  hasSotaAccess?: boolean;
  isAnnual?: boolean;
  earlyAccess?: boolean;
}): Promise<boolean> {
  // 如果没有传入 ocLimit 且有 userUuid，从会员服务获取
  let finalOcLimit = ocLimit;
  let finalWorldLimit = worldLimit;
  let finalImageLimit = imageLimit;
  let finalVideoLimit = videoLimit;
  let resolvedLevel: "free" | "basic" | "plus" | "pro" | null = null;
  const planNameLower = (planName || "").toLowerCase();

  const PLAN_BENEFITS = {
    free: { oc: 3, world: 1 },
    basic: { oc: 20, world: 5, image: 312, video: 41 },
    plus: { oc: 100, world: 20, image: 837, video: 112 },
    pro: { oc: Infinity, world: Infinity, image: 1462, video: 195 },
  } as const;

  const inferLevelFromPlanName = (): "free" | "basic" | "plus" | "pro" | null => {
    if (!planNameLower) return null;
    if (planNameLower.includes("basic")) return "basic";
    if (planNameLower.includes("plus")) return "plus";
    if (planNameLower.includes("pro")) return "pro";
    if (planNameLower.includes("free")) return "free";
    return null;
  };

  if (
    (ocLimit === undefined ||
      ocLimit === null ||
      worldLimit === undefined ||
      worldLimit === null ||
      imageLimit === undefined ||
      imageLimit === null ||
      videoLimit === undefined ||
      videoLimit === null) &&
    userUuid
  ) {
    try {
      const { getMembershipLevel } = await import(
        "@/services/membership"
      );
      resolvedLevel = await getMembershipLevel(userUuid);
    } catch (error) {
      console.error(`Failed to get limits for user ${userUuid}:`, error);
    }
  }

  if (!resolvedLevel) {
    resolvedLevel = inferLevelFromPlanName();
  }

  const fallbackLevel = resolvedLevel || "basic";
  const planBenefits = PLAN_BENEFITS[fallbackLevel];

  if (finalOcLimit === undefined || finalOcLimit === null) {
    finalOcLimit = planBenefits.oc;
  }
  if (finalWorldLimit === undefined || finalWorldLimit === null) {
    finalWorldLimit = planBenefits.world;
  }
  if (finalImageLimit === undefined || finalImageLimit === null) {
    const planImageLimit = "image" in planBenefits ? planBenefits.image : undefined;
    finalImageLimit = planImageLimit ?? 0;
  }
  if (finalVideoLimit === undefined || finalVideoLimit === null) {
    const planVideoLimit = "video" in planBenefits ? planBenefits.video : undefined;
    finalVideoLimit = planVideoLimit ?? 0;
  }

  // 如果 ocLimit 是 Infinity，转换为 "unlimited" 文本
  const ocLimitDisplay =
    finalOcLimit === Infinity ? "unlimited" : (finalOcLimit ?? 5);
  const worldLimitDisplay =
    finalWorldLimit === Infinity ? "unlimited" : (finalWorldLimit ?? 1);
  const planFeaturesHtml = buildPlanFeaturesHtml();
  const monthlyCreditsMap = getMonthlyCreditsByLevel();
  const fallbackCredits = mcAmount ?? 0;
  const planCredits = resolvedLevel ? monthlyCreditsMap[resolvedLevel] : undefined;
  const mcAmountDisplay = isAnnual && planCredits ? planCredits : fallbackCredits || planCredits || 0;
  const mcValidityText = isAnnual
    ? "Valid for 30 days (issued monthly)"
    : "Valid for 30 days";

  return sendEmail({
    to,
    template: "subscription-thanks",
    subject: "Thank You for Your AnividAI Premium Subscription! 🎉",
    variables: {
      user_name: userName,
      plan_name: planName || "Premium",
      start_date: startDate || new Date().toLocaleDateString(),
      next_billing_date: nextBillingDate || "",
      manage_url: manageUrl || `${WEBSITE_URL}/user-center`,
      mc_amount: mcAmountDisplay,
      mc_validity_text: mcValidityText,
      oc_limit: ocLimitDisplay,
      is_unlimited_oc: finalOcLimit === Infinity,
      world_limit: worldLimitDisplay,
      is_unlimited_worlds: finalWorldLimit === Infinity,
      image_limit: finalImageLimit ?? 0,
      video_limit: finalVideoLimit ?? 0,
      is_priority_support: isPrioritySupport,
      has_sota_access: hasSotaAccess,
      is_annual: isAnnual,
      early_access: earlyAccess,
      plan_features_html: planFeaturesHtml,
    },
  });

  function buildPlanFeaturesHtml(): string {
    const paidLevel = resolvedLevel === "free" ? "basic" : resolvedLevel || "basic";
    const featuresByLevel = getPlanFeaturesByLevel();
    const features = featuresByLevel[paidLevel] || [];
    if (!features.length) return "";
    return features
      .map(
        (feature) =>
          `<li style="margin:6px 0;">${feature}</li>`
      )
      .join("");
  }
}

type PricingItem = {
  title?: string;
  features?: string[];
  group?: string;
  credits?: number;
};

function getMonthlyCreditsByLevel(): Record<"free" | "basic" | "plus" | "pro", number | undefined> {
  const items = (pricingMessages as any)?.pricing?.items as PricingItem[] | undefined;
  if (!items?.length) {
    return { free: undefined, basic: undefined, plus: undefined, pro: undefined };
  }

  const free = items.find((item) => item.title === "Free" && item.group === "free");
  const basic = items.find((item) => item.title === "Basic" && item.group === "monthly");
  const plus = items.find((item) => item.title === "Plus" && item.group === "monthly");
  const pro = items.find((item) => item.title === "Pro" && item.group === "monthly");

  return {
    free: free?.credits,
    basic: basic?.credits,
    plus: plus?.credits,
    pro: pro?.credits,
  };
}

function getPlanFeaturesByLevel(): Record<"basic" | "plus" | "pro", string[]> {
  const items = (pricingMessages as any)?.pricing?.items as PricingItem[] | undefined;
  if (!items?.length) {
    return { basic: [], plus: [], pro: [] };
  }

  const basicFeatures = getPlanFeatures(items, "Basic", "monthly");
  const plusFeatures = getPlanFeatures(items, "Plus", "monthly");
  const proFeatures = getPlanFeatures(items, "Pro", "monthly");

  return {
    basic: mergeFeaturesWithOverrides(basicFeatures),
    plus: mergeFeaturesWithOverrides(basicFeatures, plusFeatures),
    pro: mergeFeaturesWithOverrides(basicFeatures, plusFeatures, proFeatures),
  };
}

function getPlanFeatures(
  items: PricingItem[],
  title: string,
  preferredGroup?: string
): string[] {
  const titleLower = title.toLowerCase();
  const candidates = items.filter(
    (item) => (item.title || "").toLowerCase() === titleLower
  );
  if (!candidates.length) return [];
  const preferred =
    (preferredGroup &&
      candidates.find((item) => item.group === preferredGroup)) ||
    candidates[0];
  return Array.isArray(preferred.features) ? preferred.features : [];
}

function mergeFeaturesWithOverrides(...lists: string[][]): string[] {
  const merged: string[] = [];
  const keyToIndex = new Map<string, number>();
  const indexToKeys = new Map<number, string[]>();
  const seenRaw = new Set<string>();

  for (const list of lists) {
    for (const item of list) {
      if (!item) continue;
      const keys = getFeatureKeys(item);
      if (!keys.length) {
        if (!seenRaw.has(item)) {
          seenRaw.add(item);
          merged.push(item);
        }
        continue;
      }

      for (const key of keys) {
        const existingIndex = keyToIndex.get(key);
        if (existingIndex !== undefined) {
          merged.splice(existingIndex, 1);
          const removedKeys = indexToKeys.get(existingIndex) || [];
          for (const removedKey of removedKeys) {
            keyToIndex.delete(removedKey);
          }
          indexToKeys.delete(existingIndex);

          const updatedIndexToKeys = new Map<number, string[]>();
          for (const [idx, idxKeys] of indexToKeys.entries()) {
            const newIndex = idx > existingIndex ? idx - 1 : idx;
            updatedIndexToKeys.set(newIndex, idxKeys);
          }
          indexToKeys.clear();
          for (const [idx, idxKeys] of updatedIndexToKeys.entries()) {
            indexToKeys.set(idx, idxKeys);
          }
          for (const [k, idx] of keyToIndex.entries()) {
            if (idx > existingIndex) {
              keyToIndex.set(k, idx - 1);
            }
          }
        }
      }

      merged.push(item);
      const newIndex = merged.length - 1;
      indexToKeys.set(newIndex, keys);
      for (const key of keys) {
        keyToIndex.set(key, newIndex);
      }
    }
  }

  return merged;
}

function getFeatureKeys(feature: string): string[] {
  const keys: string[] = [];
  const text = feature.toLowerCase();

  if (text.includes("[mc] per month")) keys.push("mc_per_month");
  if (text.includes("access to latest sota models")) keys.push("sota");
  if (/up to \d+ images or \d+ videos/.test(text)) keys.push("media_limits");
  if (text.includes("original characters")) keys.push("ocs");
  if (text.includes("worlds")) keys.push("worlds");
  if (text.includes("monthly chat quota") || text.includes("chat quota")) {
    keys.push("chat_quota");
  }
  if (text.includes("support")) keys.push("support");
  if (text.includes("early access")) keys.push("early_access");
  if (text.includes("no video watermark") || text.includes("video watermark")) {
    keys.push("watermark");
  }
  if (text.includes("private/public") || text.includes("public only")) {
    keys.push("visibility");
  }
  if (text.includes("check-in") || text.includes("check in")) {
    keys.push("checkin_share");
  }
  if (text.includes("all products access")) keys.push("core_features");

  if (text.includes("ocs & worlds")) {
    return ["ocs", "worlds"];
  }

  return keys;
}

/**
 * 发送支付失败邮件 - 续费或支付失败时触发
 */
export async function sendPaymentFailedEmail({
  to,
  userName,
  failureReason,
  attemptCount,
  manageUrl,
}: {
  to: string;
  userName: string;
  failureReason?: string;
  attemptCount?: number;
  manageUrl?: string;
}): Promise<boolean> {
  return sendEmail({
    to,
    template: "payment-failed",
    subject: "Payment Failed - Action Required for Your AnividAI Subscription ⚠️",
    variables: {
      user_name: userName,
      failure_reason: failureReason,
      attempt_count: attemptCount,
      manage_url: manageUrl || `${WEBSITE_URL}/user-center`,
    },
  });
}

/**
 * v5.0新增：发送退款请求邮件 - 退款创建时自动触发
 */
export async function sendRefundCreatedEmail({
  to,
  userName,
  subscriptionId,
  planName,
  refundAmount,
  refundReason,
  subscriptionEndDate,
}: {
  to: string;
  userName: string;
  subscriptionId: string;
  planName: string;
  refundAmount: number;
  refundReason?: string;
  subscriptionEndDate: string;
}): Promise<boolean> {
  return sendEmail({
    to,
    template: "refund-created",
    subject: "Refund Request Received - AnividAI",
    variables: {
      user_name: userName,
      subscription_id: subscriptionId,
      plan_name: planName,
      refund_amount: refundAmount.toFixed(2),
      refund_reason: refundReason || "User requested cancellation",
      subscription_end_date: subscriptionEndDate,
      refund_request_date: new Date().toLocaleDateString(),
      contact_url: `${WEBSITE_URL}/contact`,
    },
  });
}

/**
 * v5.0新增：发送退款完成邮件 - 退款完成时自动触发
 */
export async function sendRefundCompletedEmail({
  to,
  userName,
  subscriptionId,
  planName,
  refundAmount,
  refundId,
  refundReason,
  subscriptionEndDate,
  processingDays = 7,
}: {
  to: string;
  userName: string;
  subscriptionId: string;
  planName: string;
  refundAmount: number;
  refundId: string;
  refundReason?: string;
  subscriptionEndDate: string;
  processingDays?: number;
}): Promise<boolean> {
  return sendEmail({
    to,
    template: "refund-completed",
    subject: "Your Refund Has Been Processed - AnividAI",
    variables: {
      user_name: userName,
      subscription_id: subscriptionId,
      plan_name: planName,
      refund_amount: refundAmount.toFixed(2),
      refund_id: refundId,
      refund_reason: refundReason || "User requested cancellation",
      subscription_end_date: subscriptionEndDate,
      refund_completed_date: new Date().toLocaleDateString(),
      processing_days: processingDays,
    },
  });
}
