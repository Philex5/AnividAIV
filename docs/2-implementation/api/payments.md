**Related**: 付费/订单（Stripe / Creem）

# API 契约：Payments

## 当前版本
- Version: v1.0
- Auth: 视接口而定
- Errors: 统一英文

## Checkout

- POST /api/checkout
  - 用途：创建支付会话（Stripe 或 Creem），并创建订单
  - Auth: Required
  - 位置：`src/app/api/checkout/route.ts`
  - Request: `{ product_id, currency, locale }`
  - Response: `{ order_no, session_id, checkout_url }`
  - 错误：`invalid params | invalid pricing table | invalid checkout params | invalid user | checkout failed: ...`
  - 伪代码：
    ```
    assert(product_id)
    page = getPricingPage(locale); item = page.items.find(product_id)
    create order (status=Created)
    if provider==stripe -> create session -> update order session
    if provider==creem -> create checkout -> update order session
    return session info
    ```

## Webhook/Callback（Provider）

- POST /api/pay/notify/stripe
  - 用途：Stripe Webhook（checkout.session.completed / invoice.payment_succeeded）
  - Auth: Stripe 签名校验
  - 位置：`src/app/api/pay/notify/stripe/route.ts`
  - 结果：调用 service 处理订单入账/续费

- GET /api/pay/callback/stripe
  - 用途：前端支付完成页面回跳；完成后端校验并跳转 success/fail 页面
  - 位置：`src/app/api/pay/callback/stripe/route.ts`

- POST /api/pay/notify/creem
  - 用途：Creem Webhook（checkout.completed）
  - Auth: 自有签名校验 `creem-signature`
  - 位置：`src/app/api/pay/notify/creem/route.ts`

- GET /api/pay/callback/creem
  - 用途：前端支付回跳；校验 checkout 并更新订单后重定向
  - 位置：`src/app/api/pay/callback/creem/route.ts`

## 变更历史
- 2025-10-20 v1.0 首次补齐（Checkout + Webhook/Callback）

