# AI动漫生成器页面 前端实现

Related: FEAT-ai-anime-generator-page

## 页面重构概述

对现有的 `src/app/[locale]/(default)/page.tsx` 进行重构，优化AI生成器组件结构，整合AI技术特性展示，优化积分管理流程。

### 新的页面架构

```
  return (
    <div className="min-h-screen bg-background">
      {/* 第1幕：AnimeGenerator - 保持现有功能 */}

      {/* 第2幕：Introduction - 页面介绍 */}

      {/* 第3幕： Benefits - why use ai anime generator */}
      无配图, grid 3x2的卡片，每个卡片一个benefit：包括：icon+title+内容

      {/* 第4幕：HowToUseSection - 使用步骤 */}

      {/* 第5幕：CharacterAnimeGallery - 使用character生成anime的示例*/}
      title
      description
      character选择区域，横向排布avtar（10s轮播）
      下方显示对应character的anime generations，横向排布

      {/* 第6幕：FAQ - 常见问题 */}

    </div>
  );
```

## 组件详情

### 1. AnimeGenerator组件

**位置**: `src/components/anime-generator/AnimeGenerator.tsx`
占满第一页，左右分栏：参数面板|展示面板

根据用户登录状态有不同的显示：

1. 未登录用户：

- 滚动下滑，下方展示所有其他营销组件
- 右侧展示面板显示瀑布流画廊

2. 已登录用户：

- 页面只有这一个组件，不显示下方营销组件
- 显示提升文字占位

#### 瀑布流画廊

**示例图片配置 (`src/configs/gallery/example-gallery.json`)**

```json
{
  "version": "1.0.0",
  "examples": [
    {
      "uuid": "example-001",
      "r2_path": "gallery/anime/image.webp",
      "alt": "SEO优化的图片描述",
      "aspect_ratio": "2:3",
      "width": 512,
      "height": 768,
      "title": "展示标题",
      "parameters": {...}
    }
  ]
}
```

**瀑布流组件 (`src/components/anime-generator/WaterfallGallery.tsx`)**

**核心特性**：

- **瀑布流布局**: CSS columns，响应式（桌面3列，移动端2列）
- **按原比例显示**: 根据 width/height 动态计算
- **占据更多空间**: 减小间隔，充分利用面板空间
- **智能无限滚动**:
  - ≤20张：直接显示全部
  - > 20张：分批加载，首次20张
- **性能优化**:
  - 图片懒加载 (loading="lazy")
  - 滚动防抖
  - 虚拟滚动（大量图片时）
- **底部渐变特效**
- 响应式设计
- 点击图片：触发参数复用

### 2. Introduction组件

**位置**: `src/components/anime-page/Introduction.tsx`
复用 `src/components/oc-maker/Introduction.tsx`
介绍ai anime generator

### 3. Benefits组件 (新建)

**位置**: `src/components/anime-page/Benefits.tsx`

### 4. HowToUseSection组件

**位置**: `src/components/anime-page/HowToUseSection.tsx`
Describe Your Idea(tips: using ai optimizer) -> choose model & styles(不同的模型有不同的优势) -> 设置参数（上传参考图片、设置分辨率、可见度、生成张数等） -> 分享、下载你的work

### 5. CharacterAnimeGallery （新增）

**位置**: `src/components/anime-page/CharacterAnimeGallery.tsx`

展示character及其生成的anime art works

### 6. AnimeFAQ组件

**位置**: `src/components/anime-page/AnimeFAQ.tsx`

### 积分不足跳转逻辑

router.push('/pricing')

## 相关文件清单

### 新增文件

- `src/app/[locale]/(default)/pricing/page.tsx`
- `src/components/anime-page/FeatureShowcase.tsx`（废弃）
- `src/components/anime-page/Benefits.tsx`
- `src/components/anime-page/CharacterAnimeGallery.tsx`
- `src/components/anime-page/MediaDisplay.tsx`
- `src/components/anime-page/AdaptiveCarousel.tsx`
- `src/components/anime-page/CommunityGallery.tsx`（废弃）
- `src/components/anime-page/HowToUseSection.tsx`
- `src/components/anime-page/AnimeFAQ.tsx`
- `src/lib/r2-utils.ts` - R2 存储 URL 工具函数
- `src/configs/gallery/example-gallery.json` - 示例图片配置
- `src/components/anime-generator/WaterfallGallery.tsx` - 瀑布流画廊组件
- `docs/2-implementation/frontend/component-image-preview-dialog.md` -图片预览组件

```

```
