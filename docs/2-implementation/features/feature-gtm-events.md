# GTM 事件跟踪系统

**Related**: [定价模型](../../1-specs/pricing-model.md) | [订阅系统](./feature-subscription.md)

**Status**: 📋 **设计方案** (2025-11-30)
**Version**: v1.0

## 1. 背景与目标

### 1.1 业务目标

为了更好地追踪用户购买行为和支付转化情况，需要集成 Google Tag Manager (GTM) 事件跟踪，实现：

- 追踪用户点击订阅购买按钮的结账事件
- 追踪用户点击积分包购买按钮的购买事件
- 区分追踪订阅支付成功事件和积分包支付成功事件
- 为营销分析和转化优化提供数据支持

### 1.2 验收标准

- ✅ 用户注册成功后发送 `user_registration` 事件
- ✅ 用户点击订阅购买按钮时发送 `begin_subscription_checkout` 事件
- ✅ 用户点击积分包购买按钮时发送 `begin_credits_purchase` 事件
- ✅ 订阅支付成功后发送 `subscription_payment_success` 事件
- ✅ 积分包支付成功后发送 `credits_payment_success` 事件
- ✅ 事件数据完整，包含产品信息、价格、货币、用户信息等
- ✅ 事件跟踪不影响支付流程正常运行
- ✅ 支持多货币（USD/CNY）追踪

## 2. 系统架构

### 2.1 GTM 集成现状

**已集成位置**: `src/app/layout.tsx`

- GTM 容器 ID: GTM-T8S2RB6B
- 已配置 Google Tag Manager 脚本
- 已配置 noscript iframe 标签

### 2.2 事件触发点

#### A. 用户注册事件（认证系统）

**文件**: `src/auth/handler.ts` 和 `src/services/user.ts`

**注册成功事件**:
- `handleSignInUser()` 函数 (line 9-40): 处理新用户注册
- `saveUser()` 函数 (line 20-77): 数据库用户创建逻辑

**触发时机**: 新用户首次登录/注册，数据库中不存在该用户时

#### B. 前端事件触发点（定价页面）

**文件**: `src/components/blocks/pricing/index.tsx`

**主要购买按钮**:

- **订阅计划按钮**（line 515-570）: Basic/Plus/Pro 的月付/年付
- **人民币支付按钮**（line 481-511）: 支持 CNY 支付的替代按钮
- **MC 自定义包按钮**（line 696-729）: 用户输入自定义积分数量
- **MC 固定包按钮**（line 788-817）: 预定义的积分包（2000/6000/10000 MC）

**触发函数**: `handleCheckout()` (line 47-121)

#### C. 后端事件触发点（Webhook）

**文件**: `src/app/api/pay/notify/stripe/route.ts`

**支付成功事件**:

- `checkout.session.completed` (line 66-80): 一次性支付完成
- `invoice.payment_succeeded` (line 83-97): 订阅支付成功

**处理函数**: `handleCheckoutSession()` 和 `handleInvoice()`

### 2.3 数据流

#### A. 用户注册流程

```
用户完成认证（Google/GitHub/Credentials）
    ↓
调用 saveUser() 创建用户
    ↓
数据库检查用户是否存在
    ↓
新用户 → 插入用户数据
    ↓
赠送新人积分
    ↓
发送欢迎邮件（可选）
    ↓
发送 user_registration 事件
```

#### B. 订阅购买流程

```
用户点击订阅购买按钮
    ↓
前端发送 begin_subscription_checkout 事件
    ↓
调用 /api/checkout 创建订单
    ↓
跳转 Stripe 支付页面
    ↓
用户完成支付
    ↓
Stripe Webhook 通知
    ↓
后端处理支付成功
    ↓
发送 subscription_payment_success 事件
```

#### C. 积分包购买流程

```
用户点击积分包购买按钮
    ↓
前端发送 begin_credits_purchase 事件
    ↓
调用 /api/checkout 创建订单
    ↓
跳转 Stripe 支付页面
    ↓
用户完成支付
    ↓
Stripe Webhook 通知
    ↓
后端处理支付成功
    ↓
发送 credits_payment_success 事件
```

## 3. 事件设计

### 3.1 user_registration 事件

**触发时机**: 新用户注册成功，数据库中创建新用户记录后

**事件参数**:

```typescript
{
  // 事件基本信息
  event: 'user_registration',

  // 用户信息
  user_id: string,               // 用户 UUID
  user_email: string,            // 用户邮箱
  signup_method: string,         // 注册方式：'oauth' | 'credentials'
  signup_provider: string,       // OAuth 提供商：'google' | 'github' | 'google-one-tap'
  signup_ip: string,             // 注册 IP 地址

  // 注册信息
  signup_date: string,           // 注册日期（ISO 字符串）
  signup_timestamp: number,      // 注册时间戳（毫秒）
  is_new_user: boolean,          // 固定值 true

  // 赠送积分
  welcome_credits: number,       // 新用户赠送积分数量
  credits_expired_at: string,    // 积分过期时间（ISO 字符串）
}
```

### 3.2 begin_subscription_checkout 事件

**触发时机**: 用户点击订阅购买按钮（Basic/Plus/Pro），调用 `/api/checkout` 之前

**事件参数**:

```typescript
{
  // 事件基本信息
  event: 'begin_subscription_checkout',

  // 订阅信息
  subscription_plan: string,     // 'basic' | 'plus' | 'pro'
  subscription_interval: string, // 'monthly' | 'yearly'
  currency: string,              // 'USD' | 'CNY'
  amount: number,                // 价格（单位：分）
  amount_display: number,        // 显示用价格（元，GTM 标准）

  // 产品信息
  items: [{
    item_id: string,             // 产品 ID（如 'basic_monthly'）
    item_name: string,           // 产品名称
    item_brand: string,          // 固定值 'AnividAI'
    price: number,               // 单价（元，GTM 标准）
    quantity: number,            // 固定值 1
    item_category: string,       // 固定值 'subscription'
    subscription_interval: string, // 'monthly' | 'yearly'
    subscription_periods: number,  // 月付=1，年付=12
    monthly_credits: number,     // 每月包含积分数量
    total_credits: number,       // 总积分数量（年付=monthly_credits*12）
  }],

  // 用户信息
  user_id: string,               // 用户 UUID
  user_email?: string,           // 用户邮箱
  payment_method: string,        // 'stripe' | 'creem'
}
```

### 3.3 begin_credits_purchase 事件

**触发时机**: 用户点击积分包购买按钮（MC包），调用 `/api/checkout` 之前

**事件参数**:

```typescript
{
  // 事件基本信息
  event: 'begin_credits_purchase',

  // 积分包信息
  credits_package_type: string,  // 'fixed' | 'custom'
  credits_amount: number,        // 积分数量
  currency: string,              // 'USD' | 'CNY'
  amount: number,                // 价格（单位：分）
  amount_display: number,        // 显示用价格（元，GTM 标准）

  // 产品信息
  items: [{
    item_id: string,             // 产品 ID（如 'mc_2000'）
    item_name: string,           // 产品名称
    item_brand: string,          // 固定值 'AnividAI'
    price: number,               // 单价（元，GTM 标准）
    quantity: number,            // 固定值 1
    item_category: string,       // 固定值 'credits'
    credits_package_type: string, // 'fixed' | 'custom'
    credits_amount: number,      // 积分数量
    custom_mc_rate?: number,     // 自定义 MC 单价（仅自定义包）
  }],

  // 用户信息
  user_id: string,               // 用户 UUID
  user_email?: string,           // 用户邮箱
  payment_method: string,        // 'stripe' | 'creem'
  is_custom_mc: boolean,         // 是否为自定义 MC
  custom_mc_amount?: number,     // 自定义 MC 数量
}
```

### 3.4 subscription_payment_success 事件

**触发时机**: 订阅支付成功后（首次购买或续费）

**事件参数**:

```typescript
{
  // 事件基本信息
  event: 'subscription_payment_success',

  // 交易信息
  transaction_id: string,        // 订单号（order_no）
  stripe_subscription_id: string, // Stripe 订阅 ID
  currency: string,              // 'USD' | 'CNY'
  amount: number,                // 支付金额（单位：分）
  amount_display: number,        // 显示用金额（元，GTM 标准）

  // 订阅信息
  subscription_plan: string,     // 'basic' | 'plus' | 'pro'
  subscription_interval: string, // 'monthly' | 'yearly'
  subscription_periods: number,  // 周期数
  is_renewal: boolean,           // 是否为续费
  renewal_count?: number,        // 续费次数（续费时）

  // 产品信息
  items: [{
    item_id: string,             // 产品 ID
    item_name: string,           // 产品名称
    item_brand: string,          // 固定值 'AnividAI'
    price: number,               // 单价（元，GTM 标准）
    quantity: number,            // 固定值 1
    item_category: string,       // 固定值 'subscription'
    monthly_credits: number,     // 每月积分
    total_credits: number,       // 总积分
  }],

  // 用户信息
  user_id: string,               // 用户 UUID
  user_email?: string,           // 用户邮箱

  // 支付信息
  payment_provider: string,      // 'stripe'
  payment_status: string,        // 'completed'
  timestamp: number,             // 毫秒时间戳
}
```

### 3.5 credits_payment_success 事件

**触发时机**: 积分包支付成功后

**事件参数**:

```typescript
{
  // 事件基本信息
  event: 'credits_payment_success',

  // 交易信息
  transaction_id: string,        // 订单号（order_no）
  currency: string,              // 'USD' | 'CNY'
  amount: number,                // 支付金额（单位：分）
  amount_display: number,        // 显示用金额（元，GTM 标准）

  // 积分包信息
  credits_package_type: string,  // 'fixed' | 'custom'
  credits_amount: number,        // 积分数量

  // 产品信息
  items: [{
    item_id: string,             // 产品 ID
    item_name: string,           // 产品名称
    item_brand: string,          // 固定值 'AnividAI'
    price: number,               // 单价（元，GTM 标准）
    quantity: number,            // 固定值 1
    item_category: string,       // 固定值 'credits'
    credits_amount: number,      // 积分数量
    credits_package_type: string, // 'fixed' | 'custom'
  }],

  // 用户信息
  user_id: string,               // 用户 UUID
  user_email?: string,           // 用户邮箱

  // 支付信息
  payment_provider: string,      // 'stripe'
  payment_status: string,        // 'completed'
  timestamp: number,             // 毫秒时间戳
}
```


## 4. 实施方案

### 4.1 用户注册事件埋点（Phase 0）

**修改文件**: `src/services/user.ts`

**实施步骤**:

1. **创建 GTM 辅助函数**（新增文件 `src/lib/gtm.ts`）:

在前面的章节中已经提供了完整的 `src/lib/gtm.ts` 代码。

2. **在 `saveUser()` 函数中添加用户注册事件跟踪**:

在第 36 行用户创建成功后，添加事件跟踪逻辑：

```typescript
// src/services/user.ts
import { trackUserRegistration } from '@/lib/gtm';

// ...

const dbUser = await insertUser(user as typeof users.$inferInsert);

// 新用户注册成功后，发送 GTM 事件
try {
  trackUserRegistration({
    user_uuid: user.uuid,
    user_email: user.email,
    signup_method: user.signin_type,
    signup_provider: user.signin_provider,
    signup_ip: user.signin_ip,
    welcome_credits: CreditsAmount.NewUserGet,
    credits_expired_at: getOneMonthLaterTimestr(),
  });
  console.log(`[GTM] User registration event sent for ${user.email}`);
} catch (gtmError) {
  console.error("[GTM] Failed to send user_registration event:", gtmError);
  // 不影响注册流程，只记录日志
}

// increase credits for new user...
```

**注意**: 确保只在创建新用户时触发事件，已有用户登录不应触发。

### 4.2 前端事件埋点（Phase 1）

**修改文件**: `src/components/blocks/pricing/index.tsx`

**实施步骤**:

**关键位置**:
- 在 `handleCheckout()` 函数中添加 GTM 事件跟踪

```typescript
// src/lib/gtm.ts
interface GTMEventData {
  [key: string]: any;
}

export function pushToGTM(eventName: string, data: GTMEventData) {
  if (typeof window !== "undefined" && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: eventName,
      ...data,
    });
  }
}

// 追踪用户注册
export function trackUserRegistration(params: {
  user_uuid: string;
  user_email: string;
  signup_method: string;
  signup_provider: string;
  signup_ip?: string;
  welcome_credits: number;
  credits_expired_at: string;
}) {
  pushToGTM('user_registration', {
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
  });
}

// 追踪订阅结账开始
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
  pushToGTM('begin_subscription_checkout', {
    subscription_plan: params.subscription_plan,
    subscription_interval: params.subscription_interval,
    currency: params.currency,
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
  });
}

// 追踪积分包购买开始
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
  pushToGTM('begin_credits_purchase', {
    credits_package_type: params.credits_package_type,
    credits_amount: params.credits_amount,
    currency: params.currency,
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
    is_custom_mc: params.is_custom_mc,
    custom_mc_amount: params.custom_mc_amount,
  });
}
```

2. **修改 handleCheckout 函数**:

在 `handleCheckout()` 函数中，`setIsLoading(true)` 之后添加事件跟踪逻辑。

**关键位置**:

- Line 81: `setIsLoading(true);` 之后
- 需要解析产品信息，确定 item_category 和 item_category2
- 区分订阅和积分包
- 区分月付、年付、一次性支付

### 4.3 后端事件埋点（Phase 2）

**修改文件**:

1. `src/services/stripe.ts` - 处理 `handleCheckoutSession()` 和 `handleInvoice()`
2. `src/app/api/pay/notify/stripe/route.ts` - Webhook 处理逻辑

**实施步骤**:

1. **在 `stripe.ts` 中添加 GTM 事件发送逻辑**：

```typescript
// src/services/stripe.ts

// 发送订阅支付成功事件
async function sendSubscriptionPaymentSuccessEvent(params: {
  order_no: string;
  stripe_subscription_id: string;
  subscription_plan: 'basic' | 'plus' | 'pro';
  subscription_interval: 'monthly' | 'yearly';
  currency: string;
  amount: number; // 分
  is_renewal: boolean;
  user_uuid: string;
  user_email?: string;
  monthly_credits: number;
  total_credits: number;
}) {
  try {
    // 通过服务器端 GTM 发送事件
    // 方案 1: 使用 GTM Server-Side Tagging API
    // 方案 2: 触发客户端事件（返回页面后通过前端发送）
    // 方案 3: 使用 Measurement Protocol 发送到 GA4

    const eventData = {
      event: 'subscription_payment_success',
      transaction_id: params.order_no,
      stripe_subscription_id: params.stripe_subscription_id,
      currency: params.currency,
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
        monthly_credits: params.monthly_credits,
        total_credits: params.total_credits,
      }],
      user_id: params.user_uuid,
      user_email: params.user_email,
      payment_provider: 'stripe',
      payment_status: 'completed',
      timestamp: Date.now(),
    };

    console.log("[GTM] Sending subscription_payment_success event:", eventData);
  } catch (error) {
    console.error("[GTM] Failed to send subscription_payment_success event:", error);
    // 不影响支付流程，只记录日志
  }
}

// 发送积分包支付成功事件
async function sendCreditsPaymentSuccessEvent(params: {
  order_no: string;
  credits_package_type: 'fixed' | 'custom';
  credits_amount: number;
  currency: string;
  amount: number; // 分
  user_uuid: string;
  user_email?: string;
}) {
  try {
    const eventData = {
      event: 'credits_payment_success',
      transaction_id: params.order_no,
      currency: params.currency,
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

    console.log("[GTM] Sending credits_payment_success event:", eventData);
  } catch (error) {
    console.error("[GTM] Failed to send credits_payment_success event:", error);
    // 不影响支付流程，只记录日志
  }
}
```

2. **在支付成功后调用事件发送**:

- 在 `handleCheckoutSession()` 函数中，根据产品类型调用不同的事件发送函数
- 在 `handleInvoice()` 函数中，订阅续费处理成功后调用 `sendSubscriptionPaymentSuccessEvent()`

**注意**: Webhook 处理需要考虑幂等性，避免重复发送事件。

### 4.4 数据验证与测试（Phase 3）

**测试用例**:

1. **用户注册测试**:
   - ✅ Google 登录 → 发送 `user_registration` 事件
   - ✅ GitHub 登录 → 发送 `user_registration` 事件
   - ✅ Google One Tap 登录 → 发送 `user_registration` 事件
   - ✅ 事件参数包含 signup_method、signup_provider 等
   - ✅ 已注册用户再次登录 → 不发送 `user_registration` 事件

2. **订阅产品测试**:
   - ✅ 点击 Basic 月付按钮 → 发送 `begin_subscription_checkout` 事件
   - ✅ 支付成功 → 发送 `subscription_payment_success` 事件
   - ✅ 切换到年付 → 事件参数包含 yearly + basic

3. **积分包测试**:
   - ✅ 点击 MC 2000 包 → 发送 `begin_credits_purchase` 事件
   - ✅ 支付成功 → 发送 `credits_payment_success` 事件
   - ✅ 自定义 MC 数量 → 事件包含 custom_mc_amount

4. **订阅续费测试**:
   - ✅ 订阅续费成功 → 发送 `subscription_payment_success` 事件（is_renewal: true）

5. **多货币测试**:
   - ✅ USD 支付 → currency = 'USD'
   - ✅ CNY 支付 → currency = 'CNY'

**验证工具**:

- GTM Debug 模式
- Google Analytics 4 Real-time Reports
- GTM Preview 工具

## 5. 影响清单

### 5.1 新增文件

- `src/lib/gtm.ts` - GTM 辅助函数库
- `docs/2-implementation/features/feature-gtm-events.md` - 本文档

### 5.2 修改文件

#### 前端修改

- `src/components/blocks/pricing/index.tsx`
  - 在 `handleCheckout()` 函数中添加 `begin_subscription_checkout` 或 `begin_credits_purchase` 事件埋点
  - 需要解析产品类型和订阅周期
  - 需要提取订单信息（价格、货币等）

#### 后端修改

- `src/services/user.ts`
  - 在 `saveUser()` 函数中添加 `user_registration` 事件埋点
  - 在新用户创建成功后触发事件
  - 需要导入 GTM 辅助函数

- `src/services/stripe.ts`
  - 新增 `sendSubscriptionPaymentSuccessEvent()` 函数
  - 新增 `sendCreditsPaymentSuccessEvent()` 函数
  - 在 `handleCheckoutSession()` 中根据产品类型调用
  - 在 `handleInvoice()` 中调用订阅事件

- `src/app/api/pay/notify/stripe/route.ts`
  - Webhook 处理逻辑（已确认不需要修改）

### 5.3 配置需求

**GTM 容器配置**:

1. **创建触发器**:
   - `user_registration` 事件触发器
   - `begin_subscription_checkout` 事件触发器
   - `begin_credits_purchase` 事件触发器
   - `subscription_payment_success` 事件触发器
   - `credits_payment_success` 事件触发器

2. **创建标签**:
   - Google Analytics 4 事件标签（发送所有事件到 GA4）
   - Facebook Pixel 事件标签（如果需要）
   - 自定义 HTML 标签（如果需要发送到其他平台）

3. **变量设置**:
   - 数据层变量（提取事件参数）
   - 常量变量（品牌名称等）

**GA4 配置**:

1. **自定义维度**:
   - signup_method（注册方式）
   - signup_provider（注册提供商）
   - welcome_credits（新人赠送积分）
   - subscription_plan（订阅计划）
   - subscription_interval（订阅周期）
   - credits_package_type（积分包类型）
   - credits_amount（积分数量）
   - is_renewal（是否续费）
   - renewal_count（续费次数）

2. **转化设置**:
   - 将 `user_registration` 设为转化目标（重要：新用户获取）
   - 将 `subscription_payment_success` 设为转化目标
   - 将 `credits_payment_success` 设为转化目标
   - 可选：将 `begin_subscription_checkout` 和 `begin_credits_purchase` 设为转化目标

## 6. 技术风险与注意事项

### 6.1 风险点

1. **支付流程影响**: 事件跟踪代码不能阻塞支付流程
   - **解决方案**: 使用 try-catch 包裹，错误不影响主流程
   - **测试**: 多次测试支付流程，确保稳定性

2. **数据一致性**: 前端和后端事件数据可能不一致
   - **解决方案**: 以后端数据为准，purchase 事件使用订单真实数据
   - **验证**: 对比 begin_checkout 和 purchase 事件的 product_id、amount 等

3. **重复事件**: Webhook 可能重复触发，导致重复的 purchase 事件
   - **解决方案**: Webhook 使用幂等处理，已处理的事件跳过
   - **验证**: 检查 GTM Debug 工具，确认无重复事件

4. **隐私合规**: 用户邮箱等个人信息需要脱敏处理
   - **解决方案**: 可以使用用户 UUID 或哈希后的邮箱
   - **合规**: 确保符合 GDPR、CCPA 等隐私法规

5. **货币换算**: Stripe 金额单位为分，GTM 需要转换为元
   - **解决方案**: 统一在事件发送前转换
   - **注意**: 确保转换准确，避免精度损失

6. **自定义 MC 计算**: 自定义 MC 的价格在支付 API 中动态计算
   - **解决方案**: 前端获取实际的 checkout_url 前获取计算后的价格
   - **问题**: 前端只能预估价格，实际价格以后端为准
   - **解决**: 使用后端返回的金额作为准，或者传递自定义 MC 数量由后端计算

### 6.2 测试要点

- [ ] 新用户 Google 登录 → 发送 `user_registration` 事件
- [ ] 新用户 GitHub 登录 → 发送 `user_registration` 事件
- [ ] 新用户 Google One Tap 登录 → 发送 `user_registration` 事件
- [ ] 已注册用户再次登录 → 不发送 `user_registration` 事件
- [ ] 用户注册事件参数正确（signup_method、welcome_credits 等）
- [ ] 用户点击订阅按钮 → 发送 `begin_subscription_checkout` 事件
- [ ] 用户点击积分包按钮 → 发送 `begin_credits_purchase` 事件
- [ ] 订阅支付成功 → 发送 `subscription_payment_success` 事件
- [ ] 积分包支付成功 → 发送 `credits_payment_success` 事件
- [ ] 订阅续费支付 → 发送 `subscription_payment_success` 事件（is_renewal: true）
- [ ] 事件参数正确（产品分类、价格、货币等）
- [ ] 多货币支持（USD/CNY）
- [ ] 支付流程无异常
- [ ] GTM Debug 模式下事件正确触发
- [ ] GA4 Real-time 报告正确显示事件
- [ ] 事件名称区分明确（无混淆）

### 6.3 后续扩展

- 添加用户登录事件跟踪（user_login）
- 添加订阅退款事件跟踪（subscription_refund）
- 添加积分包退款事件跟踪（credits_refund）
- 添加支付失败事件跟踪（payment_failed）
- 集成 Facebook Pixel、Microsoft Ads 等其他营销平台
- 添加漏斗分析（funnel analysis）
- 添加用户行为热力图追踪

## 7. 变更历史

- 2025-11-30 FEAT-gtm-events v1.1 增加用户注册事件
  - 新增 `user_registration` 事件跟踪
  - 定义触发点：`src/services/user.ts` 的 `saveUser()` 函数
  - 添加注册方式参数：signup_method、signup_provider
  - 更新测试用例和验收标准
  - 更新 GTM/GA4 配置指南

- 2025-11-30 FEAT-gtm-events v1.0 初始设计
  - 设计 GTM 事件跟踪架构
  - 定义 4 种独立事件：begin_subscription_checkout、begin_credits_purchase、subscription_payment_success、credits_payment_success
  - 明确区分订阅和积分包两种产品类型
  - 规划前端和后端埋点方案
  - 确定数据参数和分类体系
