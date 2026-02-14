# FEAT-promotion-surfaces: 宣传 Banner 与侧边栏活动卡片

Related: [PRD.md](../../1-specs/PRD.md)

## 1. 背景与目标

为新功能/权益提供统一的站内宣传位，覆盖：

- 首页顶部全宽 Banner（位于 `header` 上方）
- App 内页 Header 内嵌 Banner（位于左侧 logo 与右侧签到/用户区之间）
- App Sidebar 底部宣传卡片（位于折叠按钮上方，侧栏折叠时隐藏）

目标是通过全局国际化字段进行统一配置，避免硬编码文案与链接，同时保证移动端可读性与低干扰展示。

## 2. 验收标准

- [ ] `header` 新增可关闭宣传 Banner，展示字段来自全局 i18n：`icon + text + link`。
- [ ] `app-header` 新增内嵌可关闭宣传 Banner，位置在 logo 与签到区之间。
- [ ] 两个 Banner 右侧均有 `x` 按钮，关闭后本地持久化，不重复展示。
- [ ] 小屏字体自动缩小，文本溢出时启用滚动查看。
- [ ] `app-sidebar` 新增宣传卡片，位置在折叠/展开按钮上方；侧栏折叠时不展示。
- [ ] 侧边栏卡片字段来自全局 i18n：`image + text + link`。
- [ ] 样式符合现有主题体系，不引入 3D 阴影与重干扰动效。

## 3. 当前方案

### 3.1 配置来源

统一使用全局国际化配置 `src/i18n/messages/{locale}.json`：

- `promotions.banner.icon`
- `promotions.banner.text`
- `promotions.banner.link`
- `promotions.sidebar_card.image`
- `promotions.sidebar_card.text`
- `promotions.sidebar_card.link`

### 3.2 组件拆分

- `src/components/blocks/promotion/promotion-banner.tsx`
  - 负责 Banner 展示、关闭状态持久化（`localStorage`）、小屏溢出滚动。
- `src/components/blocks/promotion/promotion-sidebar-card.tsx`
  - 负责侧边栏活动卡片展示，支持配置背景图与跳转链接。

### 3.3 接入位置

- 首页 Header：`src/components/blocks/header/index.tsx`
  - Banner 置于 nav 之上，全宽展示。
- App Header：`src/components/blocks/app-header/index.tsx`
  - 增加左侧 logo，并在中间区域嵌入 Banner。
- App Sidebar：`src/components/blocks/app-sidebar/index.tsx`
  - 将底部区域改为 `mt-auto` 容器，卡片在折叠按钮上方，折叠状态隐藏。

### 3.4 响应式与交互

- 小屏 Banner 文案使用更小字号。
- 当文案超出可视区域时，自动启用滚动动画。
- 关闭动作仅影响当前设备本地状态，不影响服务端配置。

## 4. 影响清单

- 前端组件
  - `src/components/blocks/header/index.tsx`
  - `src/components/blocks/app-header/index.tsx`
  - `src/components/blocks/app-sidebar/index.tsx`
  - `src/components/blocks/promotion/promotion-banner.tsx`
  - `src/components/blocks/promotion/promotion-sidebar-card.tsx`
- 国际化
  - `src/i18n/messages/en.json`
  - `src/i18n/messages/ja.json`
- 样式
  - `src/app/globals.css`（新增 Banner 跑马灯 keyframes）

## 5. 测试要点

- Banner/卡片配置缺失字段时不渲染，避免空壳 UI。
- Banner 关闭后刷新页面不再显示。
- 小屏下文案溢出时可滚动阅读，且不遮挡右侧关闭按钮。
- Sidebar 折叠状态下卡片隐藏，展开恢复显示。

## 6. 变更历史

- 2026-02-12 FEAT-promotion-surfaces 初始化方案并完成首版实现（影响：Header/AppHeader/AppSidebar/i18n）。
