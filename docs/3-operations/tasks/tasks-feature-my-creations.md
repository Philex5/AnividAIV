# My Creations 任务卡

## 任务描述

创建 `my-creations` 页面，整合 `my-characters` 和 `my-artworks` 功能，移除过时页面文件。

### 验收标准

1. **页面功能**
   - [ ] 创建 my-creations 页面，支持 Characters 和 Artworks 两个主 Tab
   - [ ] Characters Tab 支持 My OCs 和 Favorites 子 Tab
   - [ ] Artworks Tab 支持 All、Images、Videos、Audio 子 Tab
   - [ ] 完整迁移 my-characters 页面功能（搜索、筛选、卡片展示）
   - [ ] 完整迁移 my-artworks 页面功能（搜索、筛选、卡片操作、无限滚动）
   - [ ] 所有 Tab 支持独立数据缓存

2. **UI/UX**
   - [ ] 响应式设计（桌面端 3-4 列，移动端 1-2 列）
   - [ ] 骨架屏和加载状态
   - [ ] 空态和错误态处理
   - [ ] 无限滚动（Artworks）

3. **国际化**
   - [ ] 创建 my-creations 国际化文案文件
   - [ ] 支持英文和日文

4. **清理工作**
   - [ ] 移除 my-characters 页面文件和国际化
   - [ ] 移除 my-artworks 页面文件和国际化
   - [ ] 更新侧边栏导航，添加 Creations 入口
   - [ ] 更新页面标题配置

### 设计文档
- Feature 文档：`docs/2-implementation/features/feature-my-creations.md`
- 页面设计：`docs/2-implementation/frontend/page-my-creations.md`

### 依赖任务
- 无上游依赖
- 无下游依赖

---

## 子任务 1：创建页面基础结构

### 任务说明
创建 my-creations 页面的基础文件结构和组件框架。

### 验收标准
- [ ] 创建页面文件：page.tsx, client.tsx
- [ ] 创建组件目录：src/components/creations/
- [ ] 创建基础布局：主 Tab 切换功能
- [ ] 创建国际化文案文件

### 涉及文件
- 新增：`src/app/[locale]/(default)/my-creations/page.tsx`
- 新增：`src/app/[locale]/(default)/my-creations/client.tsx`
- 新增：`src/components/creations/MyCreationsClient.tsx`
- 新增：`src/i18n/pages/my-creations/en.json`
- 新增：`src/i18n/pages/my-creations/ja.json`

---

## 子任务 2：实现 Characters Tab

### 任务说明
完整迁移 my-characters 页面的所有功能到 my-creations。

### 验收标准
- [ ] 实现 My OCs 子 Tab
  - [ ] 调用 GET /api/oc-maker/characters
  - [ ] 展示角色网格
  - [ ] 使用 FlippableCharacterCard 组件
- [ ] 实现 Favorites 子 Tab
  - [ ] 调用 GET /api/oc-maker/characters?favorite=true
  - [ ] 展示收藏的角色网格
- [ ] 实现独立数据缓存
- [ ] 实现加载状态和骨架屏
- [ ] 实现空态处理

### 涉及文件
- 新增：`src/components/creations/CharactersSection.tsx`
- 复用：`src/components/character-detail/FlippableCharacterCard.tsx`

---

## 子任务 3：实现 Artworks Tab

### 任务说明
完整迁移 my-artworks 页面的所有功能到 my-creations。

### 验收标准
- [ ] 实现搜索和筛选功能
  - [ ] 搜索框（URL 参数持久化）
  - [ ] 筛选器（移动端 Drawer）
- [ ] 实现子 Tab 切换
  - [ ] All、Images、Videos、Audio
- [ ] 实现作品网格展示
  - [ ] 卡片操作（点赞、收藏、分享、可见性切换）
  - [ ] 使用 ArtworkFlatCard 组件
- [ ] 实现无限滚动
- [ ] 实现预览弹窗
  - [ ] 图片预览（ImagePreviewDialog）
  - [ ] 视频预览（VideoPreviewDialog）

### 涉及文件
- 新增：`src/components/creations/ArtworksSection.tsx`
- 新增：`src/components/creations/ArtworkFilters.tsx`
- 复用：`src/components/user-showcase-flat/ArtworkFlatCard.tsx`
- 复用：`src/components/anime-generator/ImagePreviewDialog.tsx`
- 复用：`src/components/video/VideoPreviewDialog.tsx`

---

## 子任务 4：实现响应式设计和优化

### 任务说明
完善页面的响应式布局和性能优化。

### 验收标准
- [ ] 响应式布局
  - [ ] 桌面端（xl: 4列，lg: 3列）
  - [ ] 平板端（md: 2列）
  - [ ] 移动端（sm: 2列，xs: 1列）
- [ ] 性能优化
  - [ ] 图片懒加载
  - [ ] 骨架屏动画
  - [ ] 缓存策略优化

### 涉及文件
- 修改：`src/components/creations/MyCreationsClient.tsx`
- 修改：`src/components/creations/CharactersSection.tsx`
- 修改：`src/components/creations/ArtworksSection.tsx`

---

## 子任务 5：清理过时页面

### 任务说明
移除 my-characters 和 my-artworks 页面，更新导航。

### 验收标准
- [ ] 移除页面文件
  - [ ] 删除 `src/app/[locale]/(default)/my-characters/`
  - [ ] 删除 `src/app/[locale]/(default)/my-artworks/`
- [ ] 移除国际化文件
  - [ ] 删除 `src/i18n/pages/my-characters/`
  - [ ] 删除 `src/i18n/pages/my-artworks/`
- [ ] 更新导航
  - [ ] 修改 `src/components/blocks/app-sidebar/index.tsx`
  - [ ] 更新 `src/configs/page-titles.json`

### 涉及文件
- 删除：`src/app/[locale]/(default)/my-characters/`
- 删除：`src/app/[locale]/(default)/my-artworks/`
- 删除：`src/i18n/pages/my-characters/`
- 删除：`src/i18n/pages/my-artworks/`
- 修改：`src/components/blocks/app-sidebar/index.tsx`
- 修改：`src/configs/page-titles.json`
- 删除：`docs/2-implementation/frontend/page-my-characters.md`
- 删除：`docs/2-implementation/frontend/page-my-artworks.md`
- 删除：`docs/2-implementation/features/feature-my-characters.md`（如果存在）
- 删除：`docs/2-implementation/features/feature-my-artworks.md`（如果存在）
