# My Creations Feature 文档

Related: FEAT-my-creations

## 背景与目标

当前系统存在两个独立的页面：`my-characters` 和 `my-artworks`，用户需要在不同页面间切换来管理不同类型的创作内容。为了提供更统一的用户体验，减少页面跳转，需要创建一个整合页面 `my-creations`，将角色和作品管理统一到一个页面中。

本功能旨在创建一个统一的创作管理入口，整合现有的角色（Characters）和作品（Artworks）管理功能，为用户提供一站式的个人创作内容浏览、筛选和管理体验。

## 验收标准

- [x] 实现主 Tab 切换：Characters, Artworks 和 Worlds
- [x] 实现 Worlds 子 Tab：My Worlds 和 Favorites
- [ ] 实现 Artworks 子 Tab：All、Images、Videos、Audio
- [ ] 完整迁移 `my-characters` 页面的所有功能
- [ ] 完整迁移 `my-artworks` 页面的所有功能
- [x] 实现 Worlds 管理功能（列表、搜索、删除）
- [ ] 响应式设计，支持桌面端和移动端
- [ ] 所有文本使用国际化配置
- [ ] 搜索和筛选功能正常工作
- [ ] 无限滚动功能正常工作
- [ ] 删除 `my-characters` 和 `my-artworks` 页面文件
- [ ] 更新侧边栏导航，添加 Creations 入口

## 系统级流程

### 页面结构流程
```
用户访问 /my-creations
    ↓
验证登录状态（未登录重定向到登录页）
    ↓
加载默认视图（Characters Tab → My OCs）
    ↓
用户可以：
    - 切换主 Tab（Characters / Artworks / Worlds）
    - 切换子 Tab
    - 搜索和筛选内容
    - 查看详情/预览
    - 执行操作（点赞、收藏、删除等）
```

### 数据加载流程
```
1. 首次加载 Characters → My OCs
   - 调用 GET /api/oc-maker/characters
   - 展示角色卡片网格

2. 切换到 Favorites
   - 调用 GET /api/oc-maker/characters?favorite=true
   - 展示收藏的角色

3. 切换到 Artworks Tab
   - 调用 GET /api/artworks
   - 展示作品网格

4. 切换到 Worlds Tab
   - 调用 GET /api/worlds?creator_uuid={user_uuid}
   - 展示用户创建的世界
```

## 影响清单

### API 契约
- 角色列表接口：`docs/2-implementation/api/oc-maker.md`
- 作品列表接口：`docs/2-implementation/api/README.md`
- 世界列表接口：`docs/2-implementation/api/worlds.md`

### 前端页面
- 页面设计文档：`docs/2-implementation/frontend/page-my-creations.md`

### 组件复用
- 角色卡片：`src/components/character-detail/FlippableCharacterCard.tsx`
- 作品卡片：`src/components/user-showcase-flat/ArtworkFlatCard.tsx`
- 世界卡片：`src/components/worlds/WorldCard.tsx`
- 图片预览：`src/components/anime-generator/ImagePreviewDialog.tsx`
- 视频预览：`src/components/video/VideoPreviewDialog.tsx`

### 页面路由
- 新增：`src/app/[locale]/(default)/my-creations/page.tsx`
- 新增：`src/app/[locale]/(default)/my-creations/client.tsx`
- 新增组件：`src/components/creations/CharactersSection.tsx`
- 新增组件：`src/components/creations/ArtworksSection.tsx`
- 新增组件：`src/components/creations/WorldsSection.tsx`
- 移除：`src/app/[locale]/(default)/my-characters/`
- 移除：`src/app/[locale]/(default)/my-artworks/`

### 国际化
- 新增：`src/i18n/pages/my-creations/en.json`
- 移除：`src/i18n/pages/my-characters/`
- 移除：`src/i18n/pages/my-artworks/`

### 导航配置
- 侧边栏：`src/components/blocks/app-sidebar/index.tsx`
- 页面标题：`src/configs/page-titles.json`

## 测试要点

### 主路径测试
1. 页面加载和 Tab 切换
   - 首次访问自动加载 Characters → My OCs
   - 主 Tab 切换正常（Characters ↔ Artworks）
   - 子 Tab 切换正常
   - 数据加载状态正确显示

2. 搜索功能
   - 输入搜索词，列表实时更新
   - URL 参数持久化
   - 清空搜索词，显示原始列表

3. 筛选功能
   - 选择筛选条件，列表实时更新
   - 多个筛选条件同时生效
   - 重置筛选条件

4. 无限滚动
   - 滚动到底部自动加载更多
   - 无更多数据时停止加载
   - 加载中显示骨架屏

### 边界情况测试
1. 空态处理
   - 无数据时展示空态
   - 空态文案正确
   - CTA 按钮可点击

2. 错误处理
   - 网络错误显示错误信息
   - 错误信息可点击重试
   - 恢复后正常加载

3. 权限验证
   - 未登录用户重定向到登录页
   - 无权限操作不显示

### 回归测试
1. 响应式布局
   - 桌面端（xl, lg）布局正确
   - 平板端（md）布局正确
   - 移动端（sm, xs）布局正确

2. 导航持久化
   - 刷新页面保持当前 Tab
   - 浏览器前进后退正常

3. 性能测试
   - 页面加载时间 < 2s
   - Tab 切换响应时间 < 500ms
   - 无限滚动流畅

## 开发计划

### Phase 1：基础搭建
- [ ] 创建页面文件结构
- [ ] 实现基础布局和主 Tab 切换
- [ ] 创建客户端组件框架
- [ ] 添加国际化文案文件

### Phase 2：功能迁移
- [ ] 迁移 Characters Tab 完整功能
- [ ] 迁移 Artworks Tab 完整功能
- [ ] 实现搜索和筛选
- [ ] 实现无限滚动

### Phase 3：优化和清理
- [ ] 性能优化（懒加载、骨架屏）
- [ ] 响应式优化
- [ ] 移除 my-characters 页面文件
- [ ] 移除 my-artworks 页面文件
- [ ] 更新侧边栏导航
- [ ] 更新页面标题配置

## 变更历史

- 2026-01-23 FEAT-my-creations 新增 My Creations 功能，整合 Characters 和 Artworks 管理（影响：前端页面、路由、导航）
- 2026-01-24 FEAT-my-creations 在 My Creations 中新增 Worlds Tab，整合世界管理（影响：前端页面、WorldCard 组件）
