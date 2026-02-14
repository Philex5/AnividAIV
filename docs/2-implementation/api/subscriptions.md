**Related**: 订阅管理（Subscription Management）

# API 契约：Subscriptions

## 当前版本

- Version: v1.0
- Auth: Required（所有接口需要登录）
- Errors: 统一英文

## 接口列表

### 1. 获取用户订阅信息

- **Endpoint**: `GET /api/subscriptions`
- **用途**: 获取用户当前订阅信息、历史订阅记录及会员状态
- **Auth**: Required
- **文件位置**: `src/app/api/subscriptions/route.ts`
- **Request**: 无参数
- **Response**:
  ```json
  {
    "data": {
      "currentSubscription": {
        "sub_id": "sub_xxx",
        "plan_id": "plan_pro_monthly",
        "status": "active",
        "current_period_start": "2025-10-01T00:00:00.000Z",
        "current_period_end": "2025-11-01T00:00:00.000Z",
        "cancel_at_period_end": false,
        "created_at": "2025-10-01T00:00:00.000Z"
      },
      "subscriptionHistory": [
        {
          "sub_id": "sub_xxx",
          "plan_id": "plan_pro_monthly",
          "status": "active",
          "created_at": "2025-10-01T00:00:00.000Z"
        }
      ],
      "membership": {
        "level": "pro",
        "display_name": "Pro Member",
        "monthly_credits": 10000,
        "yaery_credits": 120000,
        "features": ["unlimited_generation", "priority_queue"]
      }
    }
  }
  ```
- **错误**:
  - `no auth` (401)
  - `failed to get subscriptions` (500)

### 2. 取消订阅（期末生效）

- **Endpoint**: `POST /api/subscriptions/cancel`
- **用途**: 取消订阅，订阅将在当前计费周期结束后停止
- **Auth**: Required
- **文件位置**: `src/app/api/subscriptions/cancel/route.ts`
- **Request**:
  ```json
  {
    "sub_id": "sub_xxx",
    "cancel_type": "period_end"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Subscription will be cancelled at the end of current period"
  }
  ```
- **错误**:
  - `subscription id is required` (400)
  - `subscription not found` (404)
  - `cancel subscription failed` (500)

### 3. 取消订阅（立即生效+退款）

- **Endpoint**: `POST /api/subscriptions/cancel-with-refund`
- **用途**: 立即取消订阅并处理退款（仅年付订阅支持退款）
- **Auth**: Required
- **文件位置**: `src/app/api/subscriptions/cancel-with-refund/route.ts`
- **Request**:
  ```json
  {
    "sub_id": "sub_xxx",
    "reason": "不满意服务"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "refund_processed": true,
    "refund_amount": 15.5,
    "credits_voided": 5000,
    "message": "Subscription cancelled and refund processed"
  }
  ```
- **退款政策**:
  - **月付订阅**: 只取消订阅（`cancel_at_period_end`），不退款（`refund_amount=0`）
    - 原因：积分一次性全部发放（30天过期），无法按比例收回
    - 用户仍可使用到周期末
  - **年付订阅**: 按未激活月数比例退款，作废未激活的积分批次
- **错误**:
  - `subscription id is required` (400)
  - `subscription not found` (404)
  - `refund failed` (500)

### 4. 预览退款金额

- **Endpoint**: `GET /api/subscriptions/refund-preview`
- **用途**: 在实际退款前预览可退款金额（年付订阅显示退款计算，月付订阅返回0）
- **Auth**: Required
- **文件位置**: `src/app/api/subscriptions/refund-preview/route.ts`
- **Request**: `?sub_id=sub_xxx`
- **Response（年付订阅）**:
  ```json
  {
    "data": {
      "sub_id": "sub_xxx",
      "interval": "year",
      "total_paid": 420.0,
      "activated_months": 3,
      "unactivated_months": 9,
      "refund_amount": 315.0,
      "refund_percentage": 75.0
    }
  }
  ```
- **Response（月付订阅）**:
  ```json
  {
    "data": {
      "sub_id": "sub_xxx",
      "interval": "month",
      "total_paid": 29.99,
      "refund_amount": 0,
      "message": "Monthly subscriptions are not eligible for refunds"
    }
  }
  ```
- **错误**:
  - `subscription id is required` (400)
  - `subscription not found` (404)

### 5. 执行退款（管理员专用）

- **Endpoint**: `POST /api/subscriptions/refund`
- **用途**: 管理员对订阅执行退款操作
- **Auth**: Required（管理员权限）
- **文件位置**: `src/app/api/subscriptions/refund/route.ts`
- **Request**:
  ```json
  {
    "sub_id": "sub_xxx",
    "refund_type": "full" | "partial",
    "reason": "Customer request"
  }
  ```
- **Response（成功）**:
  ```json
  {
    "success": true,
    "refund": {
      "id": "re_xxx",
      "amount": 315.0,
      "currency": "usd",
      "status": "succeeded",
      "reason": "partial_refund_9_months_remaining"
    },
    "message": "Refund processed successfully"
  }
  ```
- **退款类型**:
  - **full（全额退款）**:
    - 月付订阅：✅ 支持
    - 年付订阅：✅ 支持，作废所有未激活积分
  - **partial（部分退款）**:
    - 月付订阅：❌ **不支持**（返回400错误）
    - 年付订阅：✅ 支持，按未激活月数比例退款
- **错误**:
  - `subscription id is required` (400)
  - `Monthly subscriptions do not support partial refunds` (400)
  - `Refund amount too small. Minimum is $0.50` (400)
  - `subscription not found` (404)
  - `refund failed` (500)

### 6. 创建计费门户会话

- **Endpoint**: `POST /api/subscriptions/billing-portal`
- **用途**: 创建 Stripe 客户计费门户会话链接（用于用户管理订阅、更新支付方式等）
- **Auth**: Required
- **文件位置**: `src/app/api/subscriptions/billing-portal/route.ts`
- **Request**: 无参数（自动获取当前用户）
- **Response**:
  ```json
  {
    "url": "https://billing.stripe.com/session/xxx"
  }
  ```
- **说明**: 返回的 URL 有效期为 30 分钟，用户应直接跳转
- **错误**:
  - `no auth` (401)
  - `customer not found` (404)
  - `create billing portal failed` (500)

## 订阅生命周期

```
[创建订阅]
    ↓
[active] ──→ [cancel_at_period_end=true] ──→ [canceled]
    ↓
[立即取消] ──→ [canceled + 退款处理]
    ↓
[续费失败] ──→ [past_due] ──→ [canceled]
```

## 退款策略

### 按比例退款规则:

#### 月付订阅

- **用户端API**: 不支持退款，只能取消订阅（保留到周期末）
- **管理员API**: 只支持全额退款（处理特殊情况/用户投诉），不支持部分退款
- **原因**:
  1. 积分一次性全部发放（30天过期），无法按比例"收回"
  2. 周期短（30天），退款操作成本高
  3. 用户可随时取消订阅，保留到周期末（已足够友好）

#### 年付订阅

- **用户端API**: 支持按未激活月数比例退款
- **管理员API**: 支持全额退款和部分退款
- **退款计算**: 按未激活月数比例计算，已激活的月份不退款
- **积分处理**: 作废所有未激活的积分批次

### 示例计算:

**年付订阅退款**:

- 用户1月15日购买年付订阅 $420
- 3月20日申请退款
- 已激活月数: 3个月（1月、2月、3月的积分已激活）
- 未激活月数: 9个月
- 退款金额 = $420 × (9/12) = $315
- 作废积分 = 未激活的9个月的积分批次

**月付订阅（无退款）**:

- 用户购买月订阅 $29.99
- 使用10天后取消
- 退款金额 = $0（不支持退款）
- 用户可继续使用到本周期末（剩余20天）
- 积分正常过期（30天后）

## 相关服务

- **Service Layer**: `src/services/stripe.ts` - Stripe 订阅管理
- **Model Layer**: `src/models/order.ts` - 订单数据模型
- **Model Layer**: `src/models/credit.ts` - 积分管理

## 变更历史

- 2025-11-12 v1.0 首次创建，从 payments.md 分离出订阅管理 API
- 2025-11-12 v1.1 更新退款策略
  - 明确月付订阅不支持部分退款（只能全额退款）
  - 更新API文档，区分月付/年付的退款规则
  - 更新退款预览API响应格式
  - 更新管理员退款API说明
