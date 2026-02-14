# My Creations 页面设计文档

## 页面概述

目标：创建一个统一的创作管理入口，整合角色（Characters）和作品（Artworks）管理功能，为用户提供一站式的个人创作内容浏览、筛选和管理体验。

## 页面信息

- **路由**：`/[locale]/(default)/my-creations`
- **文件路径**：
  - 服务端页面：`src/app/[locale]/(default)/my-creations/page.tsx`
  - 客户端组件：`src/app/[locale]/(default)/my-creations/client.tsx`
- **访问权限**：仅登录用户可见（需要 `auth()` 校验）
- **国际化文案**：`src/i18n/pages/my-creations/en.json`

## 信息架构与主要模块

### 整体布局结构

```
┌──────────────────────────────────────────────────────────────┐
│                        页面标题区                            │
│ ┌─────────────────┐ ┌─────────────────────────────────────┐ │
│ │ My Creations   │ │ CTA: + Create Character / + Generate │ │
│ └─────────────────┘ └─────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                        主 Tab 切换                           │
│ ┌─────────────────┐ ┌─────────────────────────────────────┐ │
│ │ Characters      │ │ Artworks                            │ │
│ └─────────────────┘ └─────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                     Tab 内容区域                             │
│                                                              │
│ Characters Tab:                                              │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 子 Tab: [My OCs] [Favorites]                            │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ Characters Grid / Empty State / Loading                 │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │ │
│ │ │  Card        │ │  Card        │ │  Card        │      │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                              │
│ Artworks Tab:                                               │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ [Search □□□] [Filters ⌄]                               │ │
│ │ 子 Tab: [All] [Images] [Videos] [Audio]                │ │
│ ├────────────────────────────────────────────────────────┤ │
│ │ Artworks Grid / Empty State / Loading                  │ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │ │
│ │ │  Card        │ │  Card        │ │  Card        │      │ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘      │ │
│ └────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│                      底部统计信息                           │
│ Characters: 12 total | Favorites: 5                        │
│ Artworks: 45 total | Images: 30 | Videos: 10 | Audio: 5   │
└──────────────────────────────────────────────────────────────┘
```

## 功能模块详细说明

### 1. 主 Tab 切换区域

- **Characters Tab**：
  - 展示用户创建的角色和收藏的角色
  - 继承 `my-characters` 页面的所有功能
  - 子 Tab：My OCs（我创建的角色）和 Favorites（收藏的角色）

- **Artworks Tab**：
  - 展示用户创作的作品和收藏的作品
  - 继承 `my-artworks` 页面的所有功能
  - 子 Tab：All、Images、Videos、Audio
  - 包含搜索框和筛选器

### 2. Characters Tab 模块

#### 布局结构
- 顶部子 Tab 切换（My OCs / Favorites）
- 卡片网格展示区域
- 底部统计信息

#### 数据与交互
- **My OCs 子 Tab**：
  - API：`GET /api/oc-maker/characters?page=1&limit=50`
  - 字段：`uuid, name, gender, personality_tags, avatar_url, profile_image_url, extended_attributes, created_at`
  - 状态管理：独立缓存，避免重复请求
  - 空态：展示"还没有角色，去创建一个吧"
  - 卡片组件：`FlippableCharacterCard`，点击跳转 `/characters/[uuid]`

- **Favorites 子 Tab**：
  - API：`GET /api/oc-maker/characters?favorite=true&page=1&limit=50`
  - 需要后端支持 `favorite=true` 参数（参考 `my-characters` 文档说明）
  - 字段与 My OCs 相同，额外关注 `favorited` 标记
  - 空态：展示"还没有收藏的角色，去社区探索吧"

#### 响应式设计
- 桌面端：3 列网格（`lg:grid-cols-3`）
- 平板端：2 列网格（`sm:grid-cols-2`）
- 手机端：1 列网格（`grid-cols-1`）

### 3. Artworks Tab 模块

#### 布局结构
- 顶部搜索和筛选区域
- 子 Tab 切换（All / Images / Videos / Audio）
- 卡片网格展示区域
- 底部统计信息

#### 数据与交互
- **搜索与筛选**：
  - 搜索框：实时搜索，支持 URL 参数持久化
  - 筛选器：模型、风格、时间范围（移动端折叠为 Drawer）
  - URL Query：可分享同样视图

- **内容类型子 Tab**：
  - All：展示所有类型的作品
  - Images：仅展示图片作品
  - Videos：仅展示视频作品
  - Audio：仅展示音频作品

- **列表 API**：`GET /api/artworks?type=&tab=&q=&page=`
  - 字段：`uuid, type, thumbnail_url, video_url, model_id, style, created_at, gen_type`
  - 社区数据：`like_count, favorite_count, visibility_level, liked, favorited`
  - 分页：`next_cursor`（用于无限滚动）

#### 卡片操作（仅限"我的"作品）
- 左侧操作：
  - Like：点赞/取消点赞，调用 `/api/community/artworks/[uuid]/like`
  - Favorite：收藏/取消收藏，调用 `/api/community/artworks/[uuid]/favorite`
  - Share：复制分享链接到剪贴板
- 右侧操作：
  - 可见性切换（Globe/Lock 图标），调用 `/api/community/artworks/[uuid]/visibility`
- **重要**：收藏标签页的作品仅显示社区统计，无底部操作按钮

#### 卡片预览
- 点击卡片进入预览弹窗
- 图片预览：复用 `@src/components/anime-generator/ImagePreviewDialog.tsx`
- 视频预览：复用 `@src/components/video/VideoPreviewDialog.tsx`
- 预览中操作：Download（下载）、Delete（删除）

#### 加载与状态
- 骨架屏（Skeleton） + Lazy image loading
- 无限滚动（Infinity Scroll）优先
- 空态：提供"去生成"快捷入口
- 错误态：展示错误信息与"Retry"按钮

## 页面级状态管理

### 全局状态结构
```typescript
interface PageState {
  activeMainTab: 'characters' | 'artworks';

  // Characters Tab 状态
  characters: {
    activeSubTab: 'mine' | 'favorites';
    mine: CharacterData[];
    favorites: CharacterData[];
    loading: {
      mine: boolean;
      favorites: boolean;
    };
    error: {
      mine: string | null;
      favorites: string | null;
    };
  };

  // Artworks Tab 状态
  artworks: {
    activeSubTab: 'all' | 'images' | 'videos' | 'audio';
    data: ArtworkData[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    filters: ArtworkFilters;
    nextCursor: string | null;
  };
}
```

### Tab 切换逻辑
- 切换主 Tab 时，保留当前子 Tab 的数据缓存
- 首次进入子 Tab 时才触发数据加载
- 使用独立的缓存策略，避免重复请求

## 国际化文案

### 文案文件路径
`src/i18n/pages/my-creations/en.json`

### 建议键位结构
```json
{
  "title": "My Creations",
  "description": "Manage your characters and artworks in one place",

  "mainTabs": {
    "characters": "Characters",
    "artworks": "Artworks"
  },

  "characters": {
    "tabs": {
      "mine": "My OCs",
      "favorites": "Favorites"
    },
    "emptyMine": "No characters yet",
    "emptyMineCta": "Create your first character",
    "emptyFavorites": "No favorite characters",
    "emptyFavoritesCta": "Explore community characters",
    "total": "Total characters",
    "favorites": "Favorite characters"
  },

  "artworks": {
    "tabs": {
      "all": "All",
      "images": "Images",
      "videos": "Videos",
      "audio": "Audio"
    },
    "searchPlaceholder": "Search artworks...",
    "filters": "Filters",
    "empty": "No artworks yet",
    "emptyCta": "Create your first artwork",
    "loadingMore": "Loading more artworks...",
    "total": "Total artworks",
    "stats": {
      "images": "Images",
      "videos": "Videos",
      "audio": "Audio"
    }
  },

  "actions": {
    "createCharacter": "+ Create Character",
    "generateArtwork": "+ Generate Artwork",
    "retry": "Retry"
  }
}
```

## 组件复用策略

### 现有组件复用
- **UI 基础组件**：`src/components/ui/` 下的现有组件
  - `button.tsx`, `card.tsx`, `tabs.tsx`, `dropdown-menu.tsx`, `select.tsx`, `input.tsx`, `skeleton.tsx`, `sheet.tsx`

- **专用组件**：
  - `src/components/character-detail/FlippableCharacterCard.tsx` - 角色卡片
  - `src/components/anime-generator/ImagePreviewDialog.tsx` - 图片预览
  - `src/components/video/VideoPreviewDialog.tsx` - 视频预览
  - `src/components/user-showcase-flat/ArtworkFlatCard.tsx` - 作品卡片（参考实现）

### 新建组件
- `src/components/creations/MyCreationsClient.tsx` - 主客户端组件
- `src/components/creations/CharactersSection.tsx` - Characters Tab 内容区
- `src/components/creations/ArtworksSection.tsx` - Artworks Tab 内容区
- `src/components/creations/CreationsStats.tsx` - 底部统计组件

## API 依赖

### Characters 相关 API
- 角色列表：`GET /api/oc-maker/characters`
- 支持参数：`page`, `limit`, `favorite`（需后端支持）

### Artworks 相关 API
- 作品列表：`GET /api/artworks`
- 支持参数：`type`, `tab`, `q`, `page`
- 点赞：`POST/DELETE /api/community/artworks/[uuid]/like`
- 收藏：`POST/DELETE /api/community/artworks/[uuid]/favorite`
- 可见性：`PUT /api/community/artworks/[uuid]/visibility`
- 删除：`DELETE /api/artworks/[uuid]`（待建）

## 权限与路由

- 仅登录用户可访问，未登录重定向到登录页
- 删除/分享需验证所有权与权限
- URL 参数持久化：搜索词、筛选条件、主/子 Tab 状态

## 性能优化

- **懒加载**：图片和视频懒加载
- **缓存策略**：独立 Tab 数据缓存，避免重复请求
- **骨架屏**：加载时展示骨架屏，提升用户体验
- **无限滚动**：Artworks Tab 使用无限滚动，减少页面刷新
- **预加载**：鼠标悬停时预加载预览数据

## 响应式设计

### 断点设置
- `xl`：桌面端大屏
- `lg`：桌面端常规
- `md`：平板端
- `sm`：手机端横屏
- `xs`：手机端竖屏

### 布局适配
- **Characters 网格**：
  - `xl: 4列` → `lg: 3列` → `md: 2列` → `sm: 1-2列` → `xs: 1列`
- **Artworks 网格**：
  - `xl: 4列` → `lg: 3列` → `md: 2列` → `sm: 1-2列` → `xs: 1列`
- **筛选器**：
  - 桌面端：行内展示
  - 移动端：折叠为 Drawer/Sheet

## 涉及文件清单

### 前端页面
- `src/app/[locale]/(default)/my-creations/page.tsx` - 服务端页面
- `src/app/[locale]/(default)/my-creations/client.tsx` - 客户端交互逻辑
- `src/components/creations/MyCreationsClient.tsx` - 主客户端组件
- `src/components/creations/CharactersSection.tsx` - Characters Tab 组件
- `src/components/creations/ArtworksSection.tsx` - Artworks Tab 组件
- `src/components/creations/CreationsStats.tsx` - 统计信息组件
- `src/i18n/pages/my-creations/en.json` - 国际化文案

### 类型定义
- `src/types/pages/my-creations.ts` - 页面级类型定义

### API 依赖
- `src/app/api/oc-maker/characters/route.ts` - 角色列表接口
- `src/app/api/artworks/route.ts` - 作品列表接口
- `src/app/api/community/artworks/[uuid]/like/route.ts` - 点赞接口
- `src/app/api/community/artworks/[uuid]/favorite/route.ts` - 收藏接口
- `src/app/api/community/artworks/[uuid]/visibility/route.ts` - 可见性接口

## 开发优先级

### Phase 1：基础结构搭建
- [ ] 创建页面文件和基础布局
- [ ] 实现主 Tab 切换功能
- [ ] 集成 Characters Tab（复用 my-characters）
- [ ] 集成 Artworks Tab（复用 my-artworks）
- [ ] 添加国际化文案

### Phase 2：功能完善
- [ ] 实现搜索和筛选功能
- [ ] 添加无限滚动
- [ ] 完善错误处理和空态
- [ ] 优化响应式布局

### Phase 3：体验优化
- [ ] 添加骨架屏动画
- [ ] 实现数据预加载
- [ ] 性能优化
- [ ] 添加加载状态指示

## 测试要点

### 主路径测试
- 页面加载和主 Tab 切换
- Characters Tab：My OCs / Favorites 子 Tab 切换和数据加载
- Artworks Tab：All / Images / Videos / Audio 子 Tab 切换和筛选
- 搜索功能：输入搜索词，实时更新列表
- 筛选功能：选择筛选条件，列表实时更新
- 无限滚动：滚动到底部自动加载更多内容

### 边界情况测试
- 无数据时的空态展示
- 网络错误时的错误态处理
- 搜索无结果时的提示
- 快速切换 Tab 时的数据加载状态
- 移动端筛选器 Drawer 的打开/关闭

### 回归测试
- URL 参数持久化：刷新页面保持当前视图
- 权限验证：未登录用户重定向
- 响应式布局：不同屏幕尺寸下的布局正确性

## 与现有页面的关系

### 复用关系
- **my-creations** ← **my-characters**：
  - 完全复用 Characters Tab 的功能和组件
  - 复用数据结构、API 调用、状态管理逻辑
  - 复用 `FlippableCharacterCard` 组件

- **my-creations** ← **my-artworks**：
  - 完全复用 Artworks Tab 的功能和组件
  - 复用搜索、筛选、分页逻辑
  - 复用作品卡片组件和操作按钮

### 路由导航
- `my-characters` 页面：保留，作为独立页面存在
- `my-artworks` 页面：保留，作为独立页面存在
- `my-creations` 页面：新增，作为统一入口
- 侧边栏导航：添加"Creations"入口，指向 `my-creations`

## 变更历史

- 2026-01-23 FEAT-my-creations 新增 My Creations 页面设计文档（整合 Characters 和 Artworks 管理功能）
