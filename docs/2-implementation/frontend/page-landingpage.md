# Landing Page - 首页前端设计

Related: [FEAT-homepage-optimization](../features/feature-homepage-optimization.md)

## 概览

将ShipAny模板的通用SaaS首页重构为AnividAI专用的AI动漫艺术生成品牌首页，通过左右分栏布局和交互式功能卡片展示，提升用户体验和转化率。

## 页面结构

### 核心布局组件

**页面文件**: `src/app/[locale]/(default)/page.tsx`
**组件层次**:
```
LandingPage
├── HeaderNav (复用 src/components/blocks/header)
├── HeroSection (重构 src/components/blocks/hero/index.tsx)
│   ├── HeroContent (左侧内容)
│   └── FeatureCards (右侧动画卡片)
├── AnimeStylesGallery (新增组件)
├── FeaturesSection (复用 src/components/blocks/feature/index.tsx)
├── CommunityShowcase (新增组件)  
├── FAQSection (复用现有FAQ组件)
├── CTASection (复用现有CTA组件)
└── Footer (复用 src/components/blocks/footer)
```

## 核心组件设计

### 1. Hero Section 重构
**组件路径**: `src/components/blocks/hero/index.tsx`

**布局特性**:
- 桌面端左右分栏布局 (50/50比例)
- 左侧品牌信息与CTA按钮
- 右侧功能卡片展开动画
- 背景使用 `/public/hero_bg.gif`

**状态管理**:
```typescript
interface HeroState {
  cardsExpanded: boolean;
  currentCardIndex: number;
  animationPhase: 'initial' | 'expanding' | 'expanded';
}
```

**响应式设计**:
- Desktop (≥1024px): 左右分栏
- Tablet (768-1023px): 上下堆叠
- Mobile (<768px): 垂直堆叠，动画简化

### 2. 功能卡片动画组件
**组件路径**: `src/components/blocks/hero/feature-cards.tsx`

**交互逻辑**:
- 初始状态：3张卡片层叠显示
- 鼠标悬停/点击：卡片展开为弧形排列
- 每张卡片代表核心功能：文字生成、图片编辑、风格转换

**动画参数**:
```css
.feature-cards .card {
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center bottom;
}

.feature-cards .card.expanded:nth-child(1) {
  transform: translateY(-60px) rotate(-15deg);
}
.feature-cards .card.expanded:nth-child(2) {
  transform: translateY(-40px) rotate(0deg);
}
.feature-cards .card.expanded:nth-child(3) {
  transform: translateY(-60px) rotate(15deg);
}
```

### 3. Anime Styles Gallery
**组件路径**: `src/components/blocks/anime-gallery/index.tsx`

**功能特性**:
- 6种动漫风格展示
- 鼠标悬停预览效果
- 点击跳转到对应风格生成页面
- 懒加载图片优化

### 4. Features Section 重构 (交错布局)
**组件路径**: `src/components/blocks/feature/index.tsx`

**设计思路**:
- 复用现有 `FeatureShowcase` 架构，避免重复开发
- 左右交错布局展示三大核心功能
- 响应式设计：桌面端左右布局，移动端上下堆叠

**布局模式**:
- Feature 1 (文字生成): media-right (左文右图)
- Feature 2 (图片编辑): media-left (左图右文)  
- Feature 3 (风格转换): media-right (左文右图)

**复用架构**:
- **主体组件**: `src/components/anime-showcase/FeatureShowcase.tsx`
- **媒体展示**: `src/components/anime-showcase/AIMediaDisplay.tsx`  
- **演示图片**: DemoImage组件 + BeforeAfterDemo交互组件
- **国际化**: 扩展 `src/i18n/pages/landing/` 翻译文件

**内容配置**:
- 每个功能包含：标签、标题、描述、特性列表、CTA按钮
- 媒体类型：静态演示图 + 前后对比动画
- 演示资源存放：`/features/` 目录

### 5. Community Showcase
**组件路径**: `src/components/blocks/community/index.tsx`

**展示逻辑**:
- 6张用户作品网格展示
- 图片懒加载
- 鼠标悬停放大效果
- 点击查看大图模态框

## 数据管理

### API集成
- **风格数据**: 从 `src/configs/parameters/styles.json` 读取


### 状态提供者
```typescript
// src/providers/landing-page-provider.tsx
interface LandingPageContext {
  heroAnimation: HeroAnimationState;
  galleryImages: AnimeStyle[];
  featuredArtworks: CommunityArtwork[];
}
```

## 国际化设计

### 文案结构
**英文**: `src/i18n/pages/landing/en.json`

```json
{
  "hero": {
    "title": "Create Stunning AI Anime Artwork",
    "subtitle": "Transform your ideas into beautiful anime art with AI power",
    "cta_primary": "Start Creating Free",
    "cta_secondary": "View Gallery →",
    "tip": "",
  },
  "features": {
    "text_to_anime": {
      "title": "Text to Anime Generation",
      "description": "Transform simple text descriptions into stunning anime artwork with advanced AI technology"
    },
    "image_editing": {
      "title": "Intelligent Image Editing", 
      "description": "Edit and enhance images with AI-powered tools - remove objects, change backgrounds, adjust lighting"
    },
    "style_conversion": {
      "title": "Anime Style Conversion",
      "description": "Convert any photo into beautiful anime style artwork while preserving the original essence"
    }
  }
}
```

### 多语言切换
- 路由基于locale: `/en`, `/zh`
- 动态文案加载: `useTranslations('landing')`
- 图片本地化: 根据语言加载对应示例图

## 性能优化

### 加载策略
- **Hero背景GIF**: 预加载处理
- **Gallery图片**: Intersection Observer懒加载
- **Community作品**: 渐进式加载
- **动画**: GPU加速的CSS transform

### 代码分割
```typescript
// 动态导入大型组件
const AnimeGallery = dynamic(() => import('@/components/blocks/anime-gallery'), {
  ssr: false,
  loading: () => <GallerySkeleton />
});
```

### 缓存优化
- 静态资源CDN缓存
- API响应缓存 (SWR/React Query)
- 图片Next.js Image组件优化

## 用户交互流程

### 转化路径设计
1. **Hero CTA** → 注册页面 (`/auth/signup`)
2. **Gallery样式** → 对应生成页面 (`/generate?style=xxx`)
3. **Features演示** → 功能页面 (`/text-to-image`, `/image-edit`, `/style-transfer`)
4. **Community作品** → 社区页面 (`/community`)

### 事件追踪
```typescript
// 关键交互追踪
trackEvent('hero_cta_click', { position: 'primary' });
trackEvent('feature_card_expand', { card_type: 'text_to_anime' });
trackEvent('gallery_style_click', { style: 'studio_ghiblio' });
```

## 主题集成

### 颜色系统
- 继承ShipAny主题配色
- 支持Dark/Light主题切换
- 使用CSS变量: `var(--primary)`, `var(--secondary)`

### 动画配置
```css
:root {
  --animation-duration-fast: 0.2s;
  --animation-duration-normal: 0.3s;
  --animation-duration-slow: 0.6s;
  --animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
}
```

## 相关文档链接

- [Hero Section重构设计](component-landingpage-hero.md)
- [功能卡片动画组件](component-feature-cards.md) （待决策是否增加）
- [动漫风格画廊组件](component-anime-gallery.md)
- [社区展示组件](component-community-showcase.md)

## 组件复用关系

**Features Section** 主要复用现有组件架构：
- `src/components/anime-showcase/FeatureShowcase.tsx` - 核心展示逻辑
- `src/components/anime-showcase/AIMediaDisplay.tsx` - 媒体展示适配
- `src/components/blocks/feature/` - 具体功能组件实现

## 变更历史

- 2025-09-12 FEAT-homepage-optimization Features Section交错布局设计整合，删除重复文档
- 2025-09-12 FEAT-homepage-optimization 前端设计文档创建