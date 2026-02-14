# Page: Roadmap 路线图 (page-roadmap)

**Related**: [PRD.md](../../1-specs/PRD.md) | [ui-ux-design.md](../../1-specs/ui-ux-design.md)

## 概览

Roadmap 页面是一个由数据驱动（Data-driven）的动态页面，旨在展示 AnividAI 的里程碑、当前进展及未来规划。页面通过解析配置文件并结合国际化资源，实现灵活的功能展示。

## 数据驱动架构

### 1. 配置文件
- **路径**: `src/configs/roadmap/timeline.json`
- **结构**: 
  - `hero`: 包含 `title` 和 `subtitle` 的多语言配置 (`en`, `ja`)。
  - `status_labels`: 状态标识（`completed`, `in-progress`, `planned`）的多语言映射。
  - `timeline`: 
    - `period`: 时间点名称（如 "2025 Q4"）。
    - `status`: 状态标识。
    - `phase_name`: 阶段名称的多语言配置（如 "Phase 1: The Studio Foundation"）。
    - `items`: 该阶段下的功能列表。
      - `id`: 功能 ID。
      - `cover_url`: 封面图路径。
      - `title`: 功能标题的多语言配置。
      - `desc`: 功能描述的多语言配置。

### 2. 国际化映射
- **逻辑**: 
  - 现在直接从 `timeline.json` 中根据当前 `locale` 取值（`en` 或 `ja`）。
  - 这种方式减少了对外部 i18n JSON 文件的依赖，使路线图的规划与翻译可以在同一个配置文件中集中管理。

## 页面结构

### 1. Hero Section
- 品牌核心 Slogan 与背景装饰动画，文案取自 `timelineConfig.hero`。

### 2. Dynamic Timeline (动态时间轴)
- **渲染逻辑**: 遍历 `timeline.json` 中的 `timeline` 数组。
- **阶段卡片**: 每个阶段包含周期展示、状态标签以及**阶段名称 (Phase Name)**。
- **功能单元 (Feature Unit)**:
  - **Cover**: `cover_url` 经过处理，支持响应式加载。
  - **Text**: 直接取自 `item.title[lang]` 和 `item.desc[lang]`。
  - **Badges**: 支持根据配置显示 `Hot`, `New`, `Alpha`, `Beta` 等徽章。

## UI 交互与视觉规范

### 1. 视觉主题
- **动漫氛围**: 使用柔和的渐变（Mascot Pink / Warm Orange）和背景光晕。
- **卡片设计**: 磨砂玻璃效果（`backdrop-blur`），配合 `shadow-[8px_8px_0px_0px]` 的硬阴影风格。

### 2. 交互动效
- **Scroll reveal**: 每个阶段随页面滚动依次滑入。
- **Progressive Lighting**: 侧边时间轴线条随滚动进度逐渐点亮。
- **Hover interaction**: 鼠标悬停卡片时，封面图轻微放大，文字颜色呈现主题色。

## 核心代码实现建议 (RSC)

```tsx
// src/app/[locale]/(default)/roadmap/page.tsx
import timelineConfig from "@/configs/roadmap/timeline.json";

export default function RoadmapPage() {
  const t = useTranslations('roadmap');

  return (
    <main>
      <Hero />
      <div className="timeline-container">
        {timelineConfig.timeline.map((group) => (
          <TimelineSection key={group.period}>
            <PeriodHeader 
              title={group.period} 
              statusText={t(`periods.${group.status}`)} 
            />
            <div className="grid">
              {group.items.map((item) => (
                <FeatureCard 
                  key={item.id}
                  title={t(`items.${item.id}.title`)}
                  desc={t(`items.${item.id}.desc`)}
                  coverUrl={item.cover_url}
                  badge={item.badge}
                />
              ))}
            </div>
          </TimelineSection>
        ))}
      </div>
    </main>
  );
}
```

## 响应式适配规格

- **Desktop (≥1024px)**: 双栏交错或垂直线性排列，右侧展示详细内容。
- **Tablet (768px-1023px)**: 单列布局，卡片保持网格状。
- **Mobile (<768px)**: 垂直堆叠，减小内边距，封面图比例调整为适合窄屏。

## 变更历史

- 2026-02-06 FEAT-ROADMAP 路线图更新：同步 PRD 最新规划，引入多语言直接配置与 Phase Name 展示。
- 2026-01-23 FEAT-ROADMAP 架构重构：改为配置驱动模式，支持 2026 年规划动态解析。
