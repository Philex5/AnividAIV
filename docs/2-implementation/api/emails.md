**Related**: 邮件服务（Email Service）

# API 契约：Emails

## 当前版本

- Version: v1.0
- Auth: Required（部分接口需要管理员权限）
- Errors: 统一英文

## 接口列表

### 1. 发送邮件

- **Endpoint**: `POST /api/emails/send`
- **用途**: 发送各类邮件通知（欢迎邮件、订阅确认、营销邮件等）
- **Auth**: Required（部分模板需要 Admin）
- **文件位置**: `src/app/api/emails/send/route.ts`
- **Request**:
  ```json
  {
    "to": "user@example.com",
    "template": "welcome",
    "subject": "Welcome to AnividAI",
    "variables": {
      "user_name": "John",
      "verification_url": "https://anivid.ai/verify?token=xxx"
    },
    "bulk": false
  }
  ```
- **Request Parameters**:
  - `to`: 收件人邮箱（必填）
  - `template`: 邮件模板名称（必填）
  - `subject`: 邮件主题（必填）
  - `variables`: 模板变量（可选）
  - `bulk`: 是否批量发送（可选，默认 false）
- **Response**:
  ```json
  {
    "success": true,
    "message": "Email sent successfully",
    "email_id": "msg_xxx"
  }
  ```
- **错误**:
  - `invalid email address` (400)
  - `template not found` (404)
  - `send email failed` (500)

## 邮件模板

### 系统邮件模板:

#### 1. Welcome Email（欢迎邮件）

- **Template**: `welcome`
- **Subject**: Welcome to AnividAI
- **Variables**:
  - `user_name`: 用户名
  - `login_url`: 登录链接
- **模板文件**: `public/emails/welcome.html`
- **触发时机**: 新用户注册成功

#### 2. Subscription Thanks（订阅感谢）

- **Template**: `subscription-thanks`
- **Subject**: Thank You for Your Subscription
- **Variables**:
  - `user_name`: 用户名
  - `plan_name`: 订阅计划名称
  - `mc_amount`: 获得的积分数量
  - `mc_validity_text`: MC有效期文案（年付显示“Valid for 30 days (issued monthly)”）
  - `oc_limit`: 可创建的 OC 数量限制
  - `is_unlimited_oc`: 是否无限 OC
  - `world_limit`: 可创建的世界数量限制
  - `is_unlimited_worlds`: 是否无限世界
  - `image_limit`: 每月可生成图片上限
  - `video_limit`: 每月可生成视频上限
  - `has_sota_access`: 是否可优先体验 SOTA 模型
  - `is_priority_support`: 是否享受优先支持
  - `is_annual`: 是否年付
  - `start_date`: 开始日期
  - `next_billing_date`: 下次计费日期
  - `manage_url`: 订阅管理链接
  - `plan_features_html`: 套餐权益HTML（来自 `src/i18n/pages/pricing/en.json`，按 Basic→Plus→Pro 继承合并）
- **模板文件**: `public/emails/subscription-thanks.html`
- **触发时机**: 订阅成功

#### 3. Marketing Email（营销邮件）

- **Template**: `marketing`
- **Subject**: 自定义
- **Variables**: 自定义
- **模板文件**: `public/emails/marketing.html`
- **触发时机**: 管理员手动触发
- **Auth**: 需要 Admin 权限

#### 4. Update Notification（更新通知）

- **Template**: `update`
- **Subject**: New Features Available
- **Variables**:
  - `feature_title`: 功能标题
  - `feature_description`: 功能描述
  - `cta_url`: 行动号召链接
- **模板文件**: `public/emails/update.html`
- **触发时机**: 产品更新

#### 5. Notification Email（通知邮件）

- **Template**: `notification`
- **Subject**: 自定义
- **Variables**:
  - `title`: 通知标题
  - `content`: 通知内容
  - `action_url`: 操作链接
- **模板文件**: `public/emails/notification.html`
- **触发时机**: 系统通知

## 邮件服务配置

### 邮件服务提供商: Resend

- **配置位置**: 环境变量 `RESEND_API_KEY`
- **发件人**: `noreply@anivid.ai`
- **回复邮箱**: `support@anivid.ai`

### 邮件发送限制:

- **Free Plan**: 3000 封/月
- **Pro Plan**: 50000 封/月

### 频率限制:

- 单用户每小时最多 10 封邮件
- 批量发送每次最多 100 个收件人

## 邮件发送流程

```
[触发事件]
    ↓
[准备模板变量]
    ↓
[加载 HTML 模板]
    ↓
[替换模板变量]
    ↓
[调用 Resend API]
    ↓
[记录发送日志]
    ↓
[返回结果]
```

## 邮件模板开发规范

### HTML 模板结构:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{subject}}</title>
    <style>
      /* 内联样式 */
    </style>
  </head>
  <body>
    <div class="container">
      <h1>{{title}}</h1>
      <p>{{content}}</p>
      <a href="{{action_url}}" class="button">{{action_text}}</a>
    </div>
  </body>
</html>
```

### 变量替换规则:

- 使用双花括号语法：`{{variable_name}}`
- 支持嵌套对象：`{{user.name}}`
- 支持条件渲染：`{{#if condition}}...{{/if}}`

## 错误处理

### 邮件发送失败处理:

1. 记录错误日志
2. 重试机制（最多 3 次）
3. 通知管理员（连续失败）
4. 降级策略（使用备用模板）

### 常见错误类型:

- `invalid_email`: 邮箱格式错误
- `blocked_email`: 邮箱被拉黑
- `template_not_found`: 模板不存在
- `rate_limit_exceeded`: 超过频率限制
- `service_unavailable`: 邮件服务不可用

## 前端使用示例

### 发送欢迎邮件:

```typescript
const sendWelcomeEmail = async (email: string, userName: string) => {
  const response = await fetch("/api/emails/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: email,
      template: "welcome",
      subject: "Welcome to AnividAI",
      variables: {
        user_name: userName,
        login_url: "https://anivid.ai/auth/signin",
      },
    }),
  });

  const data = await response.json();
  return data;
};
```

### 发送订阅感谢邮件:

```typescript
const sendSubscriptionThankYou = async (
  email: string,
  planName: string,
  credits: number,
) => {
  await fetch("/api/emails/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: email,
      template: "subscription-thank-you",
      subject: "Thank You for Your Subscription",
      variables: {
        user_name: userName,
        plan_name: planName,
        credits: credits,
        billing_portal_url:
          "https://anivid.ai/api/subscriptions/billing-portal",
      },
    }),
  });
};
```

## 相关服务

- **Service Layer**: `src/services/email.ts` - 邮件发送服务
- **Integration**: Resend API（邮件服务提供商）
- **Templates**: `public/emails/` - 邮件模板目录

## 监控与日志

### 发送统计:

- 总发送量
- 成功率
- 失败率
- 平均发送时间

### 日志记录:

```typescript
{
  email_id: "msg_xxx",
  to: "user@example.com",
  template: "welcome",
  status: "sent",
  sent_at: "2025-10-30T10:00:00.000Z",
  error: null
}
```

## 变更历史

- 2025-11-12 v1.0 首次创建邮件服务 API 文档
- 2026-01-30 v1.1 根据新定价模型更新订阅感谢邮件变量 (FEAT-email-v2)
- 2026-01-31 v1.2 补齐订阅权益变量（OC/World/图片/视频上限）(FEAT-email-v2)
- 2026-01-31 v1.3 订阅权益以定价页文案为单一事实来源并输出HTML列表 (FEAT-email-v2)
