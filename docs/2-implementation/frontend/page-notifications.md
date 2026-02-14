# 系统通知中心页面设计文档

## 页面基本信息

**Related**: FEAT-NOTIFICATIONS  
**页面路径（规划）**: `src/app/[locale]/(default)/(console)/notifications/page.tsx`  
**组件路径（规划）**:  
- `src/components/notifications/NotificationPopover.tsx`  
- `src/components/notifications/NotificationList.tsx`

## 入口与布局

- **Header 入口**: 在 `src/components/blocks/app-header/index.tsx` 右侧区新增铃铛图标。
  - 建议新建子组件: `src/components/notifications/NotificationBell.tsx`
  - 组件职责: 显示未读数量徽标、处理点击打开面板、轮询未读数量
- **入口行为**: 点击打开 `NotificationPopover`，展示最新通知列表与"全部已读/查看全部"按钮。
- **全量页面**: `/notifications` 页面提供完整列表、筛选与分页。

## 页面结构（简化）

```
NotificationsPage
├── Filters (All / Unread)
├── NotificationList
│   ├── NotificationItem
│   └── EmptyState
└── Pagination
```

## 交互细节

- 未读通知左侧显示高亮标记（如小圆点）。
- 点击单条通知：
  - 若有 `action_url`，则跳转并标记已读。
  - 若无 `action_url`，只标记已读。
- “Mark all read” 仅在存在未读时可点。

## 视觉与响应式

- 使用现有主题配色与 `glass-panel` 视觉风格，避免新建硬编码颜色。
- 移动端：Popover 切换为全屏 Drawer（如需），列表保持可滚动。

## i18n

- 页面内文案来自 `src/i18n/pages/notifications/en.json`。
- Header 入口属于全局组件，可使用全局 i18n 文案（若需新增文案，追加到全局消息）。

### 需要新增的翻译 keys

`src/i18n/pages/notifications/en.json`:
```json
{
  "notifications": {
    "title": "Notifications",
    "filter": {
      "all": "All",
      "unread": "Unread"
    },
    "actions": {
      "markAllRead": "Mark all as read",
      "seeAll": "See all"
    },
    "empty": "No notifications yet",
    "error": "Failed to load notifications",
    "retry": "Retry",
    "levels": {
      "info": "Info",
      "success": "Success",
      "warning": "Warning",
      "error": "Error"
    },
    "types": {
      "generation": "Generation",
      "credits": "Credits",
      "subscription": "Subscription",
      "announcement": "Announcement",
      "security": "Security",
      "system": "System"
    }
  }
}
```

全局 i18n (`src/i18n/messages/en.json`) - Header 入口:
```json
{
  "header": {
    "notifications": "Notifications",
    "notificationsEmpty": "No new notifications"
  }
}
```

## 数据映射

- 列表字段：`title`, `content`, `created_at`, `type`, `level`, `action_url`, `action_label`。
- 未读判断：`read_at` 为空视为未读。

## 错误/空态

- 错误：统一英文提示，短文本 + Retry 按钮。
- 空态：提示“暂无通知”。

## 变更历史

- 2026-02-06 FEAT-NOTIFICATIONS Initial proposal.
- 2026-02-06 FEAT-NOTIFICATIONS 补充 i18n keys 详细列表及 Header 组件修改说明。
