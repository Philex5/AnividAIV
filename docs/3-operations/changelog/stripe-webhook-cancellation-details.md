# Stripe Webhook 取消记录增强

## 问题描述

之前的Stripe webhook日志中缺少**用户主动取消订阅**的记录，只有：
- 支付成功记录
- 订阅到期的取消记录

无法区分用户主动取消 vs 订阅自然到期

## 修复内容

### 1. 增强 `handleSubscriptionDeleted` 函数 (line 247-312)

**新增功能**：
- 检查 `subscription.cancellation_details` 字段
- 区分三种取消类型：
  - `user_initiated`: 用户主动取消
  - `admin_cancelled`: 管理员取消
  - `system_expiration`: 订阅自然到期

**日志记录**：
- `reason`: 明确说明取消原因
- `metadata.cancel_type`: 取消类型标记
- `metadata.cancellation_details`: 完整的取消详情（requested_by, reason, feedback, comment）

### 2. 增强 `handleSubscriptionUpdated` 函数 (line 161-250)

**新增功能**：
- 检测用户主动设置 `cancel_at_period_end = true` 的情况
- 标记用户主动取消操作

**日志记录**：
- 当用户主动设置周期末取消时：`reason = "User initiated subscription cancellation (period end)"`
- 包含 `is_user_initiated` 标记和 `cancellation_details`

## 日志示例

### 用户主动立即取消
```
reason: "User initiated cancellation"
metadata: {
  cancel_type: "user_initiated",
  cancellation_details: {
    requested_by: "customer",
    reason: "cancellation_requested"
  }
}
```

### 用户设置周期末取消
```
reason: "User initiated subscription cancellation (period end)"
metadata: {
  is_user_initiated: true,
  cancel_at_period_end: true,
  cancellation_details: {
    requested_by: "customer",
    reason: "cancellation_requested"
  }
}
```

### 订阅自然到期
```
reason: "Subscription expired naturally"
metadata: {
  cancel_type: "system_expiration",
  cancellation_details: {
    requested_by: "system",
    reason: null
  }
}
```

## 相关文件

- `src/app/api/pay/notify/stripe/route.ts`: Stripe webhook处理函数
- `src/services/subscription-log.service.ts`: 订阅日志记录服务

## 测试建议

1. 测试用户通过Stripe Customer Portal主动取消订阅
2. 测试用户设置周期末取消
3. 验证订阅自然到期的情况
4. 检查后台日志记录是否正确区分三种情况
