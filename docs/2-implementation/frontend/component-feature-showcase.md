# FeatureShowcase Component 设计规格

Related: FEAT-ai-anime-generator-page

## 组件概述

FeatureShowcase是AI动漫生成器页面的核心展示组件，专门展示AI生成技术特性和多样化风格，采用左右分栏的布局方式，支持AI生成相关多媒体内容的自适应展示。

## 设计要求

### 布局结构

```tsx
<FeatureShowcase>
  <FeatureSection variant="media-right">
    <FeatureContent>
      <title>AI智能提示词增强</title>
      <description>AI驱动的提示词优化，智能补全动漫生成关键词</description>
      <features>...</features>
      <cta>立即体验</cta>
    </FeatureContent>
    <MediaDisplay type="generation-demo" src="ai-prompt-enhancement.gif" />
  </FeatureSection>

  <FeatureSection variant="media-left">
    <MediaDisplay type="style-gallery" src={aiStyleSamples} />
    <FeatureContent>
      <title>多样化AI动漫风格</title>
      <description>从宫崎骏美学到现代漫画，AI精通各种动漫风格</description>
      <features>...</features>
      <cta>查看所有风格</cta>
    </FeatureContent>
  </FeatureSection>

  <FeatureSection variant="media-right">
    <FeatureContent>
      <title>闪电般AI生成</title>
      <description>AI在3-10秒内生成专业级动漫图片</description>
      <features>...</features>
      <cta>开始创作</cta>
    </FeatureContent>
    <MediaDisplay type="style-sample" src="ai-generation-result.png" />
  </FeatureSection>
</FeatureShowcase>
```

### 响应式设计

- **桌面端 (≥1024px)**: 左右分栏布局，媒体区域占40%，内容区域占60%
- **平板端 (768-1023px)**: 上下堆叠，媒体区域在上，内容区域在下
- **移动端 (<768px)**: 垂直堆叠，全宽显示

### 样式规范

```scss
.feature-showcase {
  padding: 4rem 0;

  .feature-section {
    margin-bottom: 6rem;

    &:last-child {
      margin-bottom: 0;
    }

    @media (min-width: 1024px) {
      display: grid;
      grid-template-columns: 3fr 2fr; // 内容:媒体 = 3:2
      gap: 4rem;
      align-items: center;

      &.media-left {
        grid-template-columns: 2fr 3fr; // 媒体:内容 = 2:3

        .feature-content {
          order: 2;
        }

        .media-display {
          order: 1;
        }
      }
    }

    @media (max-width: 1023px) {
      .feature-content {
        text-align: center;
        margin-bottom: 2rem;
      }
    }
  }
}
```

## MediaDisplay组件规格

### 接口定义

```tsx
interface AIMediaDisplayProps {
  type: "generation-demo" | "style-sample" | "style-gallery";
  src?: string;
  sources?: AIMediaSource[];
  alt: string;
  className?: string;
  autoPlay?: boolean;
  interval?: number;
  controls?: boolean;
}

interface AIMediaSource {
  url: string;
  alt: string;
  caption?: string;
  styleType?: string;
  aiModel?: string;
}
```

### 实现逻辑

```tsx
const AIMediaDisplay: React.FC<AIMediaDisplayProps> = ({
  type,
  src,
  sources,
  alt,
  autoPlay = true,
  interval = 3000,
  ...props
}) => {
  switch (type) {
    case "generation-demo":
      return (
        <div className="ai-media-display generation-demo-container">
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
      );

    case "style-sample":
      return (
        <div className="ai-media-display style-sample-container">
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
      );

    case "style-gallery":
      return (
        <AIStyleCarousel
          styleImages={sources}
          autoPlay={autoPlay}
          interval={interval}
          className="ai-media-display style-carousel-container"
        />
      );

    default:
      return null;
  }
};
```

## AdaptiveCarousel组件规格

### 功能特性

- 自动轮播功能
- 手动导航控制
- 响应式图片展示
- 无限循环轮播
- 平滑过渡动效

### 接口定义

```tsx
interface AIStyleCarouselProps {
  styleImages: AIMediaSource[];
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  showStyleLabels?: boolean;
  className?: string;
}
```

### 实现架构

```tsx
const AIStyleCarousel: React.FC<AIStyleCarouselProps> = ({
  styleImages,
  autoPlay = true,
  interval = 3000,
  showDots = true,
  showArrows = true,
  showStyleLabels = true,
  className
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(autoPlay)

  // 自动播放逻辑
  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % styleImages.length)
    }, interval)

    return () => clearInterval(timer)
  }, [isPlaying, interval, styleImages.length])

  return (
    <div className={cn("ai-style-carousel", className)}>
      <div className="carousel-container">
        <div
          className="carousel-track"
          style={{
            transform: `translateX(-${currentIndex * 100}%)`,
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))'
            transition: 'transform 0.5s ease-in-out'
          }}
        >
          {styleImages.map((styleImage, index) => (
            <div key={index} className="carousel-slide">
              <img
                src={styleImage.url}
                alt={styleImage.alt}
                loading="lazy"
                className="w-full h-auto rounded-lg"
              />
              {showStyleLabels && styleImage.styleType && (
                <div className="style-label absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-sm">
                  {styleImage.styleType}
                </div>
              )}
              {styleImage.caption && (
                <p className="carousel-caption">{styleImage.caption}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {showArrows && (
        <>
          <button
            className="carousel-arrow carousel-prev"
            onClick={() => setCurrentIndex(prev =>
              prev === 0 ? styleImages.length - 1 : prev - 1
            )}
          >
            ←
          </button>
          <button
            className="carousel-arrow carousel-next"
            onClick={() => setCurrentIndex(prev =>
              (prev + 1) % styleImages.length
            )}
          >
            →
          </button>
        </>
      )}

      {showDots && (
        <div className="carousel-dots">
          {styleImages.map((_, index) => (
            <button
              key={index}
              className={cn(
                "carousel-dot",
                index === currentIndex && "active"
              )}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

## 国际化支持

### 文本内容结构

```json
// src/i18n/pages/ai-generator/en.json
{
  "ai_feature_showcase": {
    "ai_prompt_enhancement": {
      "title": "AI-Powered Prompt Enhancement",
      "description": "Advanced AI optimization for perfect anime generation prompts",
      "features": [
        "Neural prompt enhancement",
        "Intelligent anime keyword completion",
        "Style-specific AI suggestions",
        "Professional anime terminology library"
      ],
      "cta": "Try AI Enhancement"
    },
    "diverse_ai_styles": {
      "title": "Diverse AI Anime Styles",
      "description": "From Studio Ghiblio aesthetics to american comics - AI masters them all",
      "features": [
        "AI-generated Studio Ghiblio aesthetic",
        "Neural 3D cartoon rendering",
        "AI watercolor painting style",
        "Machine learning manga art"
      ],
      "cta": "Explore AI Styles"
    },
    "lightning_ai_generation": {
      "title": "Fast AI Generation",
      "description": "Professional anime artwork generated by AI in 3-10 seconds",
      "features": [
        "Ultra-fast AI generation (3-10s)",
        "AI batch processing support",
        "Mobile-optimized AI tools",
        "Real-time AI preview"
      ],
      "cta": "Start AI Creation"
    }
  }
}
```

## 性能优化

### 图片优化

- WebP格式优先，PNG fallback
- 响应式图片尺寸
- 懒加载实现
- 预加载关键图片

### 动画性能

- CSS Transform优化
- GPU加速
- 减少重排重绘
- 合理的transition时长

### 代码分割

- 组件级代码分割
- 动态import
- 预加载策略

## 使用示例

```tsx
// 在AI动漫生成器页面中使用
const AIAnimeGeneratorPage = () => {
  return (
    <>
      <AnimeGenerator />
      <AIFeatureShowcase />
      <AICommunityGallery />
      <AIHowToUseSection />
      <AIAnimeFAQ />
    </>
  );
};

// AI FeatureShowcase配置
const aiFeatureData = [
  {
    id: "ai_prompt_enhancement",
    variant: "media-right",
    media: {
      type: "generation-demo",
      src: "/ai-features/prompt-enhancement-demo.gif",
      alt: "AI prompt enhancement demo",
    },
  },
  {
    id: "diverse_ai_styles",
    variant: "media-left",
    media: {
      type: "style-gallery",
      sources: [
        {
          url: "/ai-styles/ghiblio-ai-sample.png",
          alt: "AI Studio Ghiblio style",
          styleType: "Studio Ghiblio",
          aiModel: "SDXL",
        },
        {
          url: "/ai-styles/pixar-ai-sample.png",
          alt: "AI Pixar 3D style",
          styleType: "Pixar 3D",
          aiModel: "SDXL",
        },
        {
          url: "/ai-styles/watercolor-ai-sample.png",
          alt: "AI Watercolor style",
          styleType: "Watercolor",
          aiModel: "SDXL",
        },
      ],
    },
  },
  {
    id: "lightning_ai_generation",
    variant: "media-right",
    media: {
      type: "style-sample",
      src: "/ai-features/fast-generation-result.png",
      alt: "Fast AI generation result",
    },
  },
];
```

## 测试要点

### 功能测试

- 各种媒体类型正确展示
- 轮播功能正常工作
- 响应式布局适配
- 国际化文本显示

### 性能测试

- 图片加载性能
- 动画流畅度
- 内存使用情况
- 移动端适配

### 兼容性测试

- 主流浏览器兼容
- 移动端设备适配
- 图片格式fallback
- 网络条件适应

## 相关代码文件

- `src/components/anime-showcase/FeatureShowcase.tsx`
- `src/components/anime-showcase/AIMediaDisplay.tsx`
- `src/components/anime-showcase/AIStyleCarousel.tsx`
