**Related**: 会员系统（Membership System）

# API 契约：Membership

## 当前版本
- Version: v1.0
- Auth: Required
- Errors: 统一英文

## 接口列表

### 1. 获取会员状态
- **Endpoint**: `GET /api/membership/status`
- **用途**: 获取用户当前会员等级、权益及状态信息
- **Auth**: Required
- **文件位置**: `src/app/api/membership/status/route.ts`
- **Request**: 无参数
- **Response**:
  ```json
  {
    "data": {
      "level": "pro",
      "display_name": "Pro Member",
      "badge_url": "/imgs/icons/members/pro_member_badge.webp",
      "monthly_credits": 10000,
      "features": [
        "unlimited_generation",
        "priority_queue",
        "no_watermark",
        "advanced_models",
        "commercial_use"
      ],
      "limits": {
        "oc_creation": 50,
        "chat_messages_per_day": 1000,
        "video_generation_per_day": 100
      },
      "subscription": {
        "is_active": true,
        "expired_at": "2025-12-01T00:00:00.000Z",
        "days_left": 20,
        "auto_renew": true
      }
    }
  }
  ```
- **错误**:
  - `no auth` (401)
  - `get membership status failed` (500)

## 会员等级体系

### Free 会员
- **level**: `free`
- **display_name**: Free Member
- **monthly_credits**: 300 MC
- **features**:
  - 基础图片生成
  - 基础聊天功能
  - 社区浏览
  - 水印生成结果

### Basic 会员
- **level**: `basic`
- **display_name**: Basic Member
- **monthly_credits**: 3000 MC
- **features**:
  - Free 所有功能
  - 无水印生成
  - 更快生成速度
  - 高级模型访问（部分）

### Plus 会员
- **level**: `plus`
- **display_name**: Plus Member
- **monthly_credits**: 10000 MC
- **features**:
  - Basic 所有功能
  - 优先队列
  - 全部高级模型
  - 商业使用授权
  - 更多 OC 创建限额

### Pro 会员
- **level**: `pro`
- **display_name**: Pro Member
- **monthly_credits**: 30000 MC
- **features**:
  - Plus 所有功能
  - 最高优先级
  - 无限 OC 创建
  - API 访问权限
  - 专属客服支持

## 会员权益配置

配置文件位置: `src/configs/membership/membership-config.json`

```json
{
  "levels": {
    "free": {
      "display_name": "Free Member",
      "monthly_credits": 300,
      "limits": {
        "oc_creation": 5,
        "chat_messages_per_day": 50,
        "video_generation_per_day": 3
      }
    },
    "basic": { ... },
    "plus": { ... },
    "pro": { ... }
  }
}
```

## 会员状态判定规则

```typescript
// 伪代码
function getMembershipLevel(user) {
  // 1. 检查是否有活跃订阅
  const activeSubscription = getActiveSubscription(user)
  if (activeSubscription) {
    return activeSubscription.plan_level
  }

  // 2. 默认为 free
  return 'free'
}

function isSubscriptionActive(subscription) {
  return subscription.status === 'active'
    && subscription.current_period_end > now()
}
```

## 积分激活机制

### 订阅激活积分
- 订阅成功后，立即激活当月积分
- 每月续费时，自动激活新的积分包
- 积分有效期：1年

### 积分过期规则
- 订阅取消后，剩余积分保留到过期日期
- 订阅激活的积分有效期为 1 年
- 一次性购买的积分有效期为 1 年

## 相关服务

- **Service Layer**: `src/services/membership.ts` - 会员状态管理
- **Service Layer**: `src/services/credit.ts` - 积分管理
- **Model Layer**: `src/models/user.ts` - 用户数据模型
- **Model Layer**: `src/models/order.ts` - 订单数据模型
- **Config**: `src/configs/membership/membership-config.json` - 会员配置

## 前端使用示例

```typescript
// 获取会员状态
const { data } = await fetch('/api/membership/status')
const membership = data

// 判断是否有某个功能权限
if (membership.features.includes('unlimited_generation')) {
  // 允许无限生成
}

// 显示会员徽章
<img src={membership.badge_url} alt={membership.display_name} />

// 检查限额
if (user.oc_count < membership.limits.oc_creation) {
  // 允许创建新 OC
}
```

## 变更历史
- 2025-11-12 v1.0 首次创建会员系统 API 文档
