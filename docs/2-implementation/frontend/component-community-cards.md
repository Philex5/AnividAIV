# Component: Community Cards

Related: FEAT-community

状态：已实现

## 1. 目标与范围

- 目标：定义社区页的三类作品预览卡片（OC/Image/Video）与通用详情弹窗的结构、Props 契约、交互、响应式与无障碍规范，复用 ShipAny 现有 UI 能力，避免重复造轮子。
- 不含：后端实现与真实 API 调用代码；仅定义前端组件结构与数据契约、错误与空态处理规范。

## 2. 组件清单与文件路径（计划）

- 预览卡片
  - `src/components/community/ArtworkCard.tsx`（通用壳，按 type 分派三类具体卡片）
  - `src/components/community/cards/ImageCard.tsx`
  - `src/components/community/cards/OcCard.tsx`
  - `src/components/community/cards/VideoCard.tsx`
  - Skeleton
    - `src/components/community/cards/CardSkeleton.tsx`

- 详情弹窗（左媒体 / 右信息面板，上方悬浮 Close 按钮）
  - `src/components/community/detail/ArtworkDetailModal.tsx`（通用壳 + 路由联动）
  - `src/components/community/detail/ImageDetailPanel.tsx`
  - `src/components/community/detail/OcDetailPanel.tsx`（含 Overview/Traits 双面信息，参考 Flippable 思路拆面）
  - `src/components/community/detail/VideoDetailPanel.tsx`
  - 子块
    - `src/components/community/detail/AuthorBar.tsx`（右侧信息面板顶部 Sticky：左作者、右社交）
    - `src/components/community/detail/SocialActions.tsx`（Like/Fav/Share/More）

- 列表与无限滚动（页面侧实现，本文仅说明契合点）
  - `src/components/community/InfiniteLoader.tsx`（可选，若页面复用全局已有则不新建）

依赖复用：

- UI：`src/components/ui/{card,button,badge,skeleton,avatar,tooltip}.tsx`
- 媒体：`next/image`，`<video preload="metadata">`
- Toast：`sonner`
- 存储 URL：`src/lib/r2-utils.ts`
- i18n：页面级 `src/i18n/pages/community/en.json`

## 3. 数据契约（前端最小字段）

仅列前端渲染所需的最小集合，具体 API 契约见 `docs/2-implementation/api/community.md`（后续补）。

```ts
// 作品基础预览
export type ArtworkType = "oc" | "image" | "video";

export interface AuthorBrief {
  id: string;
  name: string;
  avatar: string; // r2-utils 构造的可访问 URL
}

export interface ArtworkStats {
  likes: number;
  views: number;
  comments: number;
}

export interface ArtworkPreview {
  id: string;
  type: ArtworkType;
  title: string;
  cover_url: string;
  media_urls?: string[]; // oc 多图预览或视频备用源
  author: AuthorBrief;
  stats: ArtworkStats;
  tags?: string[];
  meta?: {
    duration?: number; // seconds, for video
    resolution?: string; // e.g. 1080p
    oc_traits?: string[]; // 关键设定词条
  };
}

// 详情数据（在 preview 基础上扩展）
export interface ArtworkDetail extends ArtworkPreview {
  description?: string;
  prompt?: string;
}
```

错误与默认值：一律英文，如 `"Failed to load artworks"`, `"No results found"`。

## 4. 交互设计

- 打开详情：点击卡片打开弹窗；URL 追加 `?artwork=ID`，浏览器返回关闭（不刷新列表）。
- 右侧信息面板顶部 Sticky Header：
  - 左侧：`[avatar] username`
  - 右侧：`[Like] [Fav] [Share] [⋮]`
  - 桌面与移动均为水平左右分布；滚动时保持可见，并在滚动后加轻阴影。
- Close 按钮：圆形悬浮，位于弹窗右上角，绝对定位，不占布局高度；支持 Esc 关闭。
- 点赞/收藏：乐观更新，失败回滚并 toast 英文错误；按钮禁用态与 loading 反馈。
- 分享：复制链接（`/community/[type]/[id]`），成功/失败 toast。
- 视频预览：桌面 hover 静音短预览（限时）；移动端点击播放。
- 无限滚动：IntersectionObserver 触底加载；Skeleton 占位；失败可局部重试。

## 5. 响应式与布局

- 列表栅格（页面侧）：≥1536px 5列 / ≥1280px 4列 / ≥1024px 3列 / ≥768px 2列 / <768px 1列。
- 卡片媒体：自适应容器，`object-cover`；桌面优先视觉 16:9，移动端允许更高竖图以提升观感。
- 详情弹窗：
  - 桌面：左侧媒体、右侧信息面板（独立滚动）；右上角悬浮 Close。
  - 移动：上下堆叠；信息面板顶部 Sticky Header 保持水平左右分布。

## 6. 无障碍（A11y）

- 卡片与主要按钮可键盘聚焦；Enter 打开详情；Esc 关闭。
- 图标按钮提供 `aria-label`；焦点可见（使用主题焦点样式）。
- 图片含 `alt`；视频控件具可达性（如需要显示原生 controls）。

## 7. 文案与国际化（页面级 + 系统级）

统一使用页面级 i18n：`src/i18n/pages/community/en.json`。示例 keys：

- actions.like, actions.fav, actions.share, actions.more, actions.copyLink
- labels.duration, labels.resolution
- oc.useThis, oc.tabs.overview, oc.tabs.traits
- states.loading, states.noResults, states.loadFailed, states.retry

组件内严禁硬编码中文或英文：

- 页面/操作类文案从页面级 keys 读取（`src/i18n/pages/community/en.json`）。
- 通用要素（模型/风格/种族/配饰等）名称显示从系统级 i18n 获取（`src/i18n/messages/en.json`），使用传入的 code 进行映射。
- **例外**：OC 卡片左上角 "OC" 徽章为硬编码，因其是类型标识而非业务文案。

## 8. 组件结构与 Props（概要）

```tsx
// 通用卡片壳：按 type 分派
<ArtworkCard data={preview} onOpen={openDetail} onLike={...} onFav={...} />

// Image 卡片核心区域（伪代码）
<Card>
  <CardMedia>
    <Image src={cover_url} alt={title} fill />
  </CardMedia>
  <CardBody>
    <Title />
    <AuthorBrief />
    <StatsCompact />
    <InlineActions />
  </CardBody>
</Card>

// Video 卡片：封面+时长角标，桌面 hover 预览（静音）

// OC 卡片：支持 1~3 张轮播预览，右下主按钮 “Use OC”

// 详情弹窗
<ArtworkDetailModal id={artworkId} type={type} onClose={...}>
  <LeftMedia />
  <RightPanel>
    <AuthorBar />   // 左作者、右社交（sticky）
    <MetaBlocks />
    {type==='oc' ? <OcTabs/> : null}
  </RightPanel>
</ArtworkDetailModal>
```

关键 Props（摘要）：

- `ArtworkCard`
  - `data: ArtworkPreview`
  - `onOpen(id: string)`: 打开详情
  - `onLike(id: string)`, `onFav(id: string)`：返回 Promise 以支持乐观回滚
- `ArtworkDetailModal`
  - `id: string`，`type: ArtworkType`
  - `onClose(): void`

## 9. 状态管理与错误处理

- 列表与分页：由页面容器负责；卡片只消费数据与派发交互事件。
- 点赞/收藏：组件内部做乐观 UI，失败使用英文 toast 并回滚数值/状态。
- 媒体加载错误：降级占位图/错误块（英文提示）。

## 10. 主题与样式规范

- 统一使用现有 UI 组件与主题 token（参考 `src/components/ui/button.tsx`）。
- 禁止硬编码颜色；圆角/阴影与卡片族保持一致。
- 右侧信息面板 Sticky Header 高度建议 ~56px；滚动产生轻阴影。
- Close 悬浮按钮：主题化尺寸与交互态（hover/focus/active）。

## 11. 性能与加载策略

- 图片：`next/image` with lazy; 优先首屏资源。
- 视频：`preload="metadata"`，hover 预览限时与节流；移动端仅点击播放。
- 列表：按需批次渲染与 Skeleton 占位；IntersectionObserver 触底加载。

## 12. 依赖与复用

- 依赖：Next.js 15 / React 19 / Tailwind / Shadcn UI / sonner
- URL 构造：`src/lib/r2-utils.ts`（避免在组件内拼接）
- 国际化：仅 `src/i18n/pages/community/en.json`

## 13. 测试要点（组件级）

- 打开/关闭详情弹窗（点击、Enter、Esc）与 URL 同步
- Sticky 头部在滚动中的可见性与阴影变化
- 点赞/收藏：乐观更新与失败回滚
- 分享：复制链接成功/失败 toast
- 视频 hover 预览仅桌面启用
- 媒体加载错误占位与无障碍属性（alt/aria-label）

## 14. 影响清单（实现文件，计划）

- Frontend（本文件覆盖）
  - `src/components/community/ArtworkCard.tsx`
  - `src/components/community/cards/{ImageCard,OcCard,VideoCard,CardSkeleton}.tsx`
  - 页面侧（另文档）：`src/app/[locale]/(default)/community/page.tsx`

- i18n（页面级）
  - `src/i18n/pages/community/en.json`

- API（另文档）
  - `docs/2-implementation/api/community.md`

## 15. 变更历史

- 2025-10-22 FEAT-community 初版：卡片与详情弹窗设计、Props 契约、交互与响应式规范。
- 2025-01-24 FEAT-community 完成卡片、Skeleton、详情弹窗与社交操作组件首版实现
- 2025-10-25 FEAT-community 视觉优化：新增类型光晕边框（OC 暖黄/Video 金黄/其他粉色）；移除 OC 卡片右上角 "Use this OC" 按钮；OC 卡片左上角徽章改为显示 "OC"
- 2026-02-09 FEAT-video-preview-unify：新增 `src/hooks/useVideoPreviewLoad.ts` 与 `src/components/community/cards/ArtworkVideoMedia.tsx`，统一 community / my-creations / OCCreations 三处视频卡片的首屏加载、懒加载与 hover 预览行为；移除重复视频状态与 Observer 逻辑，统一错误/占位表现并避免非视口 metadata 请求。
