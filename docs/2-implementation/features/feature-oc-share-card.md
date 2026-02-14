# OC 炫酷分享卡片生成方案 (FEAT-OC-SHARE-CARD)

**Related**:
- PRD：`docs/1-specs/PRD.md`
- OC 系统重构：`docs/2-implementation/features/feature-oc-rebuild.md`
- 任务列表：`docs/3-operations/tasks/tasks-feature-oc-rebuild.md`

## 1. 背景与目标

### 背景
目前的 OC 分享形式较为单一（仅为基础图片或详情页链接），缺乏视觉冲击力和社交传播的“仪式感”。

### 目标
- **极高颜值**：采用 3D 悬浮卡片 + 响应式档案布局。
- **高分享欲**：模拟“珍稀角色卡”或“角色档案”的视觉观感。
- **自动化生成**：基于角色的 `modules` 数据、`theme_color` 及所属世界的视觉元素自动渲染。

## 2. 视觉设计理念 (Design Philosophy)

### 2.1 3D 悬浮立绘 (Left Side)
- **卡片容器**：复用首页 `oc-apps-bento.tsx` 的 3D 卡片样式，包含卡片悬浮感。
- **特效**：增加全息闪光 (Holographic Flash) 和边框发光 (Border Shine)。
- **稀有度**：右上角标注角色稀有度（如 SSR）。

### 2.2 结构化档案 (Right Side)
- **层级清晰**：从基本信息到性格标签，再到核心技能与背景故事，采用模块化布局。
- **动态主题**：优先使用 `world.theme_color`，若无则使用角色头发颜色或默认橘色 (#FF8C00) 兜底。

## 3. 详细布局规划 (Layout Specification)

### 3.1 整体结构 (Container: 1200x630 或 1080x1350)
采用水平分栏布局：
- **左侧 (40%)**：3D 悬浮立绘卡片，以相同的悬浮观感放置。
- **右侧 (60%)**：角色详细档案数据。

### 3.2 右侧数据映射
1.  **Header**: `[OC Name]` (左对齐) | `[World: World Name]` (右对齐)。
2.  **Quick Info**: `[Gender Icon] [Species Icon] [🎂 Age] [Role]`。
3.  **Tags**: `[Personality Tags]` 以 Badge 样式排列。
4.  **Core Data**:
    - **雷达图/技能区**：`[Radar Chart]` | `Skills (Skill Icon + Skill Name + Star Rating)`。
5.  **Biography**: `[Life Story / Main Background Story]` 使用优雅的排版展示角色背景。

## 4. 技术实现路径 (Technical Stack)

### 4.1 渲染引擎：Satori (@vercel/og)
- **国际化**：所有参数名（如 Age, Gender, World 等）必须进行国际化配置，不准硬编码。
- **字体加载**：需加载支持多语言的字体以确保导出图片不乱码。

### 4.2 逻辑处理
- **颜色兜底**：
  ```typescript
  const themeColor = character.world?.theme_color || 
                     character.modules?.appearance?.hair_color || 
                     "#FF8C00";
  ```
- **SVG 生成**：雷达图使用原生 SVG 在 Satori 中构建。

## 5. 开发计划 (Roadmap)

### 第一阶段：基础设施 (Phase 1)
- [ ] 创建国际化配置文件：`src/i18n/pages/oc-share-card/` (en/ja)。
- [ ] 搭建基础渲染路由：`app/api/og/character/[uuid]/route.tsx`。

### 第二阶段：UI 还原 (Phase 2)
- [ ] 实现左侧 3D 悬浮卡片 Satori 兼容版（使用 `tw` 属性）。
- [ ] 构建右侧档案布局，映射图标系统。
- [ ] 编写 SVG 雷达图与星级评分组件。

### 第三阶段：集成与优化 (Phase 3)
- [ ] 接入实际数据模型，实现颜色动态注入。
- [ ] 图片缓存至 R2 存储。
- [ ] 在详情页增加“分享卡”预览与下载功能。

## 6. 变更历史
- 2026-01-20 FEAT-OC-SHARE-CARD 方案初始化。
- 2026-01-30 优化布局：引入 3D 悬浮卡片样式，重构右侧档案布局，强化国际化与动态主题。