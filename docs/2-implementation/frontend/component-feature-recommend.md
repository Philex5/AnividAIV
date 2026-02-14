# 特性推荐功能

## 功能概述

特性推荐功能用于所有功能页面的营销组件区域，旨在构建内链并引流到其他功能页面，提升用户活跃度和功能探索率。

## 支持页面

以下页面需要集成特性推荐组件：

- `src/app/[locale]/(default)/ai-anime-generator/page.tsx` - AI动漫生成器
- `src/app/[locale]/(default)/ai-video-generator/page.tsx` - AI视频生成器
- `src/app/[locale]/(default)/oc-maker/page.tsx` - OC创作者
- `src/app/[locale]/(default)/chat/page.tsx` - OC聊天
- `src/app/[locale]/(default)/ai-action-figure-generator/page.tsx` - AI手办生成器
- `src/app/[locale]/(default)/ai-sticker-generator/page.tsx` - AI贴纸生成器

## 组件设计

### 布局结构

- **放置位置**：FAQ组件下方、CTA组件上方
- **容器宽度**：全宽容器，居中显示
- **内边距**：垂直方向 `py-12 md:py-16`

### 卡片设计

**单个功能卡片内部结构**（从上到下三段式）：

1. **示例横图**（16:9 比例）
   - 尺寸：320x180px（移动端）/ 400x225px（桌面端）
   - 圆角：`rounded-lg`
   - 阴影：`shadow-sm`

2. **标题区域**
   - 字体大小：`text-lg md:text-xl`
   - 字体重量：`font-semibold`
   - 颜色：主题色
   - 高度：`h-12`（3行文本省略）

3. **描述区域**
   - 字体大小：`text-sm md:text-base`
   - 颜色：`text-muted-foreground`
   - 高度：`h-12`（2行文本省略）

### 徽章设计

- **hot 徽章**
  - 颜色：`bg-red-500`（红色）
  - 位置：卡片左上角
  - 文字：`Hot`

- **new 徽章**
  - 颜色：主题色
  - 位置：卡片左上角
  - 文字：`New`

### Grid 响应式设计

- **大屏**（≥1024px）：4列
- **中屏幕**（768px-1023px）：3列
- **移动端**（<768px）：2列
- **间距**：`gap-4 md:gap-6`

## 数据来源与配置

### 配置文件结构

数据从以下配置文件中获取：

1. **核心功能配置**（需新建）
   - 文件路径：`src/configs/apps/core-features.json`
   - 内容：核心功能列表（AI动漫生成器、AI视频生成器、OC聊天、OC Maker）

2. **Studo Tools配置**（现有）
   - 文件路径：`src/configs/apps/oc-apps.json`
   - 内容：OC应用列表（手办生成器、贴纸生成器、表情包生成器）

**注意：不展示当前页面对应的功能**

### 数据字段设计

每个功能配置包含以下字段：

```typescript
interface FeatureConfig {
  slug: string; // 功能标识符（页面路由）
  name: string; // 功能名称
  kind: "image" | "video" | "chat"; // 功能类型
  i18n_name_key: string; // 国际化标题键
  i18n_desc_key: string; // 国际化描述键
  image: string; // 示例图片路径
  badge?: "hot" | "new"; // 徽章类型
  sort_order: number; // 排序权重
  seo_keywords: string[]; // SEO关键词
}
```

### 展示优先级规则

1. **优先级1**：带有 `badge: 'hot'` 的功能
2. **优先级2**：带有 `badge: 'new'` 的功能
3. **优先级3**：core-features 中的功能
4. **优先级4**：oc-apps 中的其他功能

### 初始分配

- **ai-action-figure-generator**：分配 `hot` 徽章
- **ai-sticker-generator**：分配 `new` 徽章

## 国际化配置

### 字段映射

- **标题**：`i18n_name_key` → 页面级国际化文件
- **描述**：`i18n_desc_key` → 页面级国际化文件

### 需新增的国际化键值

需要在全局或页面级国际化文件中添加：

```json
{
  "feature_recommend": {
    "title": "Discover More Features",
    "subtitle": "Explore other AI-powered creative tools",
    "view_all": "View All"
  },
  "features": {
    "ai_anime_generator": {
      "title": "AI Anime Generator",
      "description": "Create stunning anime art from text prompts"
    },
    "ai_video_generator": {
      "title": "AI Video Generator",
      "description": "Transform your ideas into animated videos"
    }
    // ... 其他功能
  }
}
```

## 交互行为

### 卡片点击

- **行为**：跳转到对应功能页面
- **路径**：根据 `slug` 字段生成 `/[locale]/[slug]`
- **过渡效果**：`transition-all duration-200 hover:scale-105`

### 无障碍支持

- 卡片可聚焦（`focus:outline-none focus:ring-2`）
- 键盘导航支持
- ARIA 标签：`role="link"`, `aria-label="跳转到[功能名称]"`

## 放置位置

**页面布局中的位置**：

```
┌─────────────────────────────────┐
│        页面主体内容               │
├─────────────────────────────────┤
│        FAQ 组件                  │  ← AnimeFAQ / VideoFAQ 等
├─────────────────────────────────┤
│     【特性推荐组件】              │  ← 新增位置
├─────────────────────────────────┤
│        CTA 组件                  │  ← CTASection
├─────────────────────────────────┤
│        Footer                    │
└─────────────────────────────────┘
```

## 性能优化

1. **图片优化**
   - 使用 Next.js Image 组件
   - WebP 格式
   - 懒加载（`loading="lazy"`）

2. **数据缓存**
   - 配置文件使用 `getConfig()` 缓存
   - 客户端数据获取使用 React Query

3. **代码分割**
   - 组件独立打包
   - 动态导入（`dynamic()`）

## 追踪与监控

### 事件追踪

- **展示事件**：`feature_recommend_viewed`
- **点击事件**：`feature_recommend_clicked`
- **参数**：`feature_slug`, `from_page`, `position`

### 指标监控

- 点击率（CTR）
- 转化率（功能使用率）
- 各功能推荐位流量分布

## 未来扩展

1. **个性化推荐**：基于用户历史行为推荐
2. **A/B测试**：不同布局/文案测试
3. **动态排序**：根据转化率动态调整顺序
4. **更多徽章**：如 "Pro"、"限时" 等
5. **视频预览**：hover 时播放短视频预览
