# 用户中心页面设计文档

## 页面基本信息

**Related**: FEAT-user-center  
**文件路径**: `src/app/[locale]/(default)/(console)/user-center/page.tsx`  
**页面类型**: Console页面  
**布局**: 全宽页面布局 + Tab切换布局

## 页面整体结构设计

### 1. 页面布局架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        用户中心页面 (全宽布局)                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    用户信息展示卡片                        │  │
│  │              (头像/用户名/等级/积分)                       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                       Tab导航区                            │  │
│  │        [我的积分|我的订阅|我的订单|危险区域]                  │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                      Tab内容区                             │  │
│  │                   (动态内容切换)                            │  │
│  │                                                            │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 2. 组件层级结构

```typescript
UserCenterPage
├── UserInfoCard              // 用户信息展示卡片
│   ├── Avatar                 // 用户头像
│   ├── UserBasicInfo          // 用户名、等级标识
│   └── CreditsSummary         // 当前积分数
├── TabsContainer            // Tab容器 (使用 @/components/ui/tabs)
│   ├── TabsList              // Tab导航
│   │   ├── TabsTrigger (我的积分)
│   │   ├── TabsTrigger (我的订阅)
│   │   ├── TabsTrigger (我的订单)
│   │   └── TabsTrigger (危险区域)
│   └── TabsContent           // Tab内容
│       ├── MyCreditsTab      // 积分记录 (复用现有组件)
│       ├── MySubscriptionTab // 订阅管理 (新建)
│       ├── MyOrdersTab       // 订单记录 (新建)
│       └── DangerZoneTab     // 危险区域 (新建)
```

### 3. 响应式设计规范

- **桌面端** (≥1024px): 全宽布局，最大宽度1200px居中显示
- **平板端** (768px-1023px): 全宽布局，左右留边距
- **移动端** (<768px): 全宽布局，Tab导航可横向滚动

## 功能模块详细设计

### 1. 用户信息展示卡片 (`UserInfoCard`)

**功能描述**: 页面顶部展示用户基本信息和状态  
**实现位置**: 用户中心页面顶部区域

#### 设计要素

- **用户头像**:
  - 圆形头像，64x64px (桌面端) / 48x48px (移动端)
  - 支持默认头像占位符
  - 点击可跳转到个人设置 (如有)
- **用户基本信息**:
  - 用户名/昵称显示
  - 会员等级标识:
    - Pro会员: `imgs/icons/vip/pro_member_badge.webp`
    - 免费用户: `imgs/icons/vip/free_member_badge.webp`
  - 用户邮箱 (可选显示)
- **积分摘要**:
  - 当前可用积分数
  - 快速充值按钮 (跳转 `/pricing`)

#### 组件接口设计

```typescript
interface UserInfoCardProps {
  user: {
    uuid: string;
    nickname?: string;
    email: string;
    avatar_url?: string;
    is_sub: boolean;
    sub_expired_at?: Date;
  };
  creditBalance: number;
}
```

### 2. Tab1: 我的积分 (`MyCreditsTab`)

**功能描述**: 复用现有的积分记录展示功能  
**复用组件**: `src/app/[locale]/(default)/(console)/my-credits/page.tsx`  
**实现方式**: 将现有页面组件转换为Tab内容组件

#### 复用方案

- 提取现有 `my-credits/page.tsx` 的核心逻辑
- 封装为独立的 `MyCreditsTab` 组件
- 保持现有的分页、筛选、排序功能
- 保持现有的 `TableSlot` 组件结构

### 3. Tab2: 我的订阅 (`MySubscriptionTab`)

**功能描述**: 展示和管理用户的订阅状态  
**实现状态**: 新建组件

#### 功能设计

**有订阅状态显示**:

- 当前订阅计划名称和价格
- 订阅状态 (active/expired/cancelled)
- 当前计费周期: 开始时间 - 结束时间
- 下次续费时间和金额
- 取消订阅按钮
  - 点击弹出确认对话框
  - 说明: "取消后当前周期依然有效，下个周期不再扣费"
  - 确认后调用取消订阅API

**无订阅状态显示**:

- 提示文案: "当前还没有订阅会员"
- "开始订阅" 按钮 (跳转 `/pricing`)
- 订阅计划简介卡片

#### 数据来源

- 从 `users` 表获取: `is_sub`, `sub_expired_at`, `sub_plan_type`
- 从 `orders` 表获取: 有效订阅订单信息

#### API接口需求

```typescript
// 获取用户订阅状态
GET / api / user / subscription - status;

// 取消订阅
POST / api / user / cancel - subscription;
```

### 4. Tab3: 我的订单 (`MyOrdersTab`)

**功能描述**: 展示用户的所有订单记录  
**实现状态**: 新建组件

#### 功能设计

**订单列表展示**:

- 使用 `TableSlot` 组件结构
- 列表字段:
  - 订单编号 (`order_no`)
  - 产品名称 (`product_name`)
  - 订单金额 (`amount`)
  - 订单状态 (`status`) - 已支付/待支付/已取消
  - 创建时间 (`created_at`)
  - 操作 (查看详情/重新支付)

**筛选和排序**:

- 按订单状态筛选
- 按时间范围筛选
- 默认按创建时间倒序

**分页**:

- 每页20条记录
- 支持页码跳转

#### 数据来源

- `orders` 表，筛选当前用户的所有订单

#### API接口需求

```typescript
// 获取用户订单列表
GET /api/user/orders?page=1&limit=20&status=all&timeRange=all

// 获取订单详情
GET /api/user/orders/[order_no]
```

### 5. Tab4: 危险区域 (`DangerZoneTab`)

**功能描述**: 提供账户删除功能  
**实现状态**: 新建组件  
**安全级别**: 高风险操作

#### 功能设计

**删除账户流程**:

1. 警告说明区域
   - 标题: "危险区域" (红色醒目样式)
   - 说明: "以下操作不可逆，请谨慎操作"
   - 删除账户说明: "删除账户将永久删除您的所有数据，包括:"
     - 用户资料和设置
     - 所有AI生成的内容
     - 积分记录和订单历史
     - 角色和对话记录
2. 删除确认流程
   - "删除我的账户" 按钮 (红色危险样式)
   - 点击弹出确认对话框
   - 要求输入用户邮箱确认身份
   - 二次确认: "我了解此操作不可撤销"
   - 最终确认按钮

3. 删除执行
   - 调用删除账户API
   - 显示删除进度
   - 删除完成后自动登出
   - 跳转到首页并显示确认消息

#### 安全措施

- 邮箱验证确认身份
- 多步骤确认流程
- 操作日志记录
- 软删除策略 (可选)

#### API接口需求

```typescript
// 删除用户账户
DELETE /api/user/delete-account
{
  email: string,
  confirmation: string
}
```

## 技术实现方案

### 1. 组件架构

#### 主页面组件结构

```typescript
// src/app/[locale]/(default)/(console)/user-center/page.tsx
export default async function UserCenterPage() {
  const userInfo = await getUserInfo()
  const creditBalance = await getUserCreditBalance(userInfo.uuid)

  return (
    <div className="space-y-6">
      <UserInfoCard user={userInfo} creditBalance={creditBalance} />
      <UserCenterTabs userUuid={userInfo.uuid} />
    </div>
  )
}
```

#### Tab容器组件

```typescript
// src/components/console/user-center/UserCenterTabs.tsx
'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useTranslations } from 'next-intl'

interface UserCenterTabsProps {
  userUuid: string
}

export function UserCenterTabs({ userUuid }: UserCenterTabsProps) {
  const t = useTranslations('user_center')

  return (
    <Tabs defaultValue="credits" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="credits">{t('tabs.my_credits')}</TabsTrigger>
        <TabsTrigger value="subscription">{t('tabs.my_subscription')}</TabsTrigger>
        <TabsTrigger value="orders">{t('tabs.my_orders')}</TabsTrigger>
        <TabsTrigger value="danger">{t('tabs.danger_zone')}</TabsTrigger>
      </TabsList>

      <TabsContent value="credits">
        <MyCreditsTab userUuid={userUuid} />
      </TabsContent>

      <TabsContent value="subscription">
        <MySubscriptionTab userUuid={userUuid} />
      </TabsContent>

      <TabsContent value="orders">
        <MyOrdersTab userUuid={userUuid} />
      </TabsContent>

      <TabsContent value="danger">
        <DangerZoneTab userUuid={userUuid} />
      </TabsContent>
    </Tabs>
  )
}
```

### 2. 状态管理

#### 客户端状态管理

- 使用React useState管理Tab切换状态
- 使用React Query/SWR管理API数据缓存
- 订阅状态更新后刷新相关组件数据

#### 服务端状态获取

- 页面级别的服务端数据预取
- Tab组件级别的客户端数据获取
- 实时数据更新通过API轮询或WebSocket

### 3. API接口设计

#### 新增API路由

```typescript
// 用户订阅状态
/api/ersu / subscription -
  status / api / user / cancel -
  subscription /
    // 用户订单
    api /
    user /
    orders /
    api /
    user /
    orders /
    [order_no] /
    // 账户删除
    api /
    user /
    delete -account;
```

#### 复用现有API

```typescript
// 用户信息
/api/egt -
  user -
  info /
    // 积分相关
    api /
    get -
  user -
  credits;
```

### 4. 国际化配置

#### 新增翻译文件

```json
// src/i18n/pages/user-center/en.json
{
  "title": "User Center",
  "user_info": {
    "current_credits": "Current Credits",
    "recharge": "Recharge",
    "pro_member": "Pro Member",
    "free_member": "Free Member"
  },
  "tabs": {
    "my_credits": "My Credits",
    "my_subscription": "My Subscription",
    "my_orders": "My Orders",
    "danger_zone": "Danger Zone"
  },
  "subscription": {
    "no_subscription": "You haven't subscribed yet",
    "start_subscription": "Start Subscription",
    "current_plan": "Current Plan",
    "next_billing": "Next Billing",
    "cancel_subscription": "Cancel",
    "cancel_confirm": "Are you sure you want to cancel? Current period will remain active."
  },
  "orders": {
    "order_no": "Order No.",
    "product_name": "Product",
    "amount": "Amount",
    "status": "Status",
    "created_at": "Created At",
    "view_details": "View Details"
  },
  "danger_zone": {
    "title": "Danger Zone",
    "warning": "The following operations are irreversible, please be careful",
    "delete_account": "Delete My Account",
    "delete_warning": "Deleting your account will permanently remove all your data",
    "confirm_email": "Please enter your email to confirm",
    "final_confirm": "I understand this action cannot be undone"
  }
}
```

### 5. 权限控制

#### 页面级权限

- 页面级别的用户认证检查
- 未登录用户重定向到 `/auth/signin`

#### 功能级权限

- 订阅管理: 仅对有订阅记录的用户显示取消操作
- 账户删除: 添加额外的身份验证步骤

## UI/UX设计规范

### 1. 视觉设计

#### 色彩方案

- 主色调: 使用系统主题色 (`primary`)
- 成功状态: `success` (绿色系)
- 警告状态: `warning` (橙色系)
- 危险操作: `destructive` (红色系)
- 中性色: `muted`, `muted-foreground`

#### 卡片设计

- 用户信息卡片: 使用 `card` 组件，添加渐变背景
- Tab内容区: 使用 `card` 组件，标准边距和圆角
- 危险区域: 使用红色边框和警告背景色

### 2. 交互设计

#### Tab切换

- 默认激活 "我的积分" Tab
- 平滑切换动画
- 移动端支持滑动切换
- URL状态同步 (可选)

#### 加载状态

- 页面初始加载: 骨架屏
- Tab切换加载: 局部loading spinner
- 数据刷新: 顶部进度条

#### 错误处理

- API错误: Toast通知
- 网络错误: 重试按钮
- 数据为空: 友好的空状态页面

### 3. 响应式适配

#### 移动端优化

- Tab导航: 可横向滚动
- 表格: 卡片式布局替代
- 按钮: 增大点击区域
- 表单: 全宽输入框

#### 平板端适配

- Tab导航: 自适应网格布局
- 内容区域: 合理的最大宽度限制和左右边距
- 整体布局: 响应式容器设计

### 4. 无障碍设计

#### 键盘导航

- Tab组件支持方向键切换
- 焦点管理和高亮显示
- 表单元素的正确tab顺序

#### 屏幕阅读器

- 适当的ARIA标签
- 语义化HTML结构
- 状态变化的屏幕阅读器提示

## 文件结构

### 新增文件清单

```
src/
├── app/[locale]/(default)/(console)/user-center/
│   └── page.tsx                                 # 主页面
├── components/console/user-center/
│   ├── UserInfoCard.tsx                        # 用户信息卡片
│   ├── UserCenterTabs.tsx                      # Tab容器
│   ├── MyCreditsTab.tsx                        # 积分Tab (复用现有逻辑)
│   ├── MySubscriptionTab.tsx                   # 订阅Tab
│   ├── MyOrdersTab.tsx                         # 订单Tab
│   └── DangerZoneTab.tsx                       # 危险区域Tab
├── app/api/user/
│   ├── subscription-status/route.ts            # 订阅状态API
│   ├── cancel-subscription/route.ts            # 取消订阅API
│   ├── orders/route.ts                         # 订单列表API
│   ├── orders/[order_no]/route.ts              # 订单详情API
│   └── delete-account/route.ts                 # 删除账户API
├── i18n/pages/user-center/
│   └── en.json                                  # 国际化配置
└── services/
    ├── subscription.ts                          # 订阅相关服务
    └── account.ts                               # 账户相关服务
```

### 修改文件清单

```
src/i18n/messages/en.json                        # 添加全局翻译
```

## 测试要点

### 1. 功能测试

- [ ] 用户信息正确显示
- [ ] Tab切换正常工作
- [ ] 积分记录正确展示
- [ ] 订阅状态正确显示
- [ ] 订单列表正确展示
- [ ] 取消订阅功能正常
- [ ] 账户删除流程完整

### 2. 响应式测试

- [ ] 桌面端布局正常
- [ ] 平板端适配良好
- [ ] 移动端体验流畅
- [ ] Tab导航在小屏幕下可滚动

### 3. 安全测试

- [ ] 身份验证正常
- [ ] 权限控制生效
- [ ] 敏感操作需要确认
- [ ] API接口安全防护

### 4. 性能测试

- [ ] 页面加载速度
- [ ] Tab切换响应时间
- [ ] 大量数据的分页性能
- [ ] API调用优化

---

**变更历史**:

- 2024-10-29 FEAT-user-center 新增用户中心页面设计文档
