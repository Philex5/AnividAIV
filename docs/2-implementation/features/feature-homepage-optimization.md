# FEAT-homepage-optimization: 首页视觉与交互重构

Related: [PRD.md](../../1-specs/PRD.md)

## 1. 背景与目标

为了提升首页的视觉冲击力和用户转化率，我们将从传统的模块堆叠或“指挥中心”方案转向更具沉浸感的**视频驱动 (Video-First)** 设计。新版首页将强调动态视觉体验，简化功能展示的视觉层级，并优化内容布局以引导用户探索。

## 2. 验收标准

- [ ] **Hero Section**:
  - 全屏或大幅面视频背景（支持占位符）。
  - 核心 CTA 按钮/链接文案：“Start with your first OC”。
  - 视觉风格参考沉浸式设计，强调氛围感。
- [ ] **Features Integration**:
  - 融合原 Hero 的功能展示区与现有 Features 列表。
  - 保留原 Hero 展示区的布局结构，但移除 3D/立体阴影效果，采用更现代的**平面化 (Flat)** 设计。
  - 每个功能模块增加简明的描述文案。
- [ ] **User Showcases**:
  - 移动至 Features 之后。
  - 优化展示卡片样式，去除多余装饰，使其更符合新的平面化 UI 语言。
- [ ] **Benefits**:
  - 新增 "Why Choose AnividAI" 区域，强调核心价值主张。
- [ ] **FAQ**:
  - 新增常见问题解答区域，解决用户疑虑。

## 3. 设计方案

### 3.1 UI 组件结构

- **HeroSection**:
  - **VideoBackground**: 循环播放的高质量生成视频（或占位符）。
  - **Overlay**: 渐变遮罩，保证文字可读性。
  - **PrimaryCTA**: "Start with your first OC" 引导至 `/oc-maker`。
- **FeatureSection**:
  - **Bento Grid Layout**: 采用 3 列非对称栅格系统。
    - **OC Maker**: 占据左侧 2x2 区域，作为视觉中心。
    - **Anime Generator / Video**: 占据右上角垂直排列的两个 1x1 单元格。
    - **Worlds / Chat**: 占据中左侧垂直排列的两个 1x1 单元格。
    - **Studio Tools**: 占据中右侧 2x2 区域，与 OC Maker 形成对角呼应。
    - **Voice / Story**: 底部并排的 1x1 单元格（Coming Soon）。
  - **FlatCards**: 移除 `box-shadow` 和厚重边框，使用轻微的背景色区分或线条分割，强调沉浸式背景。
  - **Content**: Icon + Title + Description + Contextual Action。
- **ShowcaseSection**:
  - **Masonry/Grid**: 瀑布流或网格展示用户作品。
  - **ModernCard**: 沉浸式图片卡片，悬停显示作者与 Prompt 信息。
- **BenefitsSection**:
  - 核心优势列表（如：一致性角色、多模态生成、易用性等）。
- **FAQSection**:
  - 折叠式问答列表 (Accordion)。

### 3.2 交互流程

1. **首屏印象**：用户进入首页，被高质量视频吸引，通过 CTA 直接开启创作。
2. **功能认知**：向下滚动，通过扁平化的特征列表快速了解平台能力。
3. **信任建立**：浏览 User Showcases 看到真实生成效果；通过 Benefits 强化选择理由。
4. **疑虑消除**：FAQ 解决潜在问题。

## 4. 影响清单

### 4.1 核心组件

- `src/components/blocks/hero-video/`: 新增视频 Hero 组件。
- `src/components/blocks/feature-grid/`: 重构 Feature 组件，合并旧 Hero 的展示逻辑。
- `src/components/blocks/showcase-gallery/`: 优化现有的 Showcase 组件。
- `src/app/[locale]/(default)/page.tsx`: 重新编排页面 Section 顺序。

### 4.2 样式与主题

- 调整全局 Card 样式，增加 Flat 变体。
- 优化视频背景的加载与性能（Poster 占位）。

## 5. 任务拆解

1. [ ] 实现 `HeroVideo` 组件，配置视频源与 CTA。
2. [ ] 重构 Features 区域，迁移原 Hero 展示卡片并平面化。
3. [ ] 调整 `UserShowcase` 组件样式与位置。
4. [ ] 开发 `Benefits` 与 `FAQ` 静态展示区块。
5. [ ] 整合至 `page.tsx` 并适配移动端响应式。

## 6. 物料准备清单 (R2 Assets)

为了支持“非对称 Bento 栅格”布局，需要准备以下高质量视觉素材，并上传至 R2 对应路径。所有素材建议使用 WebP 或 H.264 MP4 格式以优化加载。

### 6.1 核心功能素材 (Capabilities)

| 功能模块            | 栅格尺寸 | 资源类型  | 路径建议                                                      | 视觉要求                                                      |
| :------------------ | :------- | :-------- | :------------------------------------------------------------ | :------------------------------------------------------------ |
| **OC Maker**        | 2x2 (XL) | 视频/WebP | `showcases/landingpage-features/feature-ocs-maker.webp`       | 展示角色从设计稿到 3D 渲染或精修海报的演变，强调定制感。      |
| **Anime Generator** | 1x1      | 图片/WebP | `showcases/landingpage-features/feature-anime-generator.webp` | 精美动漫场景图，展示从 Prompt 到高质量画面的生成效果。        |
| **Anime Video**     | 1x1      | 视频/MP4  | `showcases/landingpage-features/feature-video-generator.mp4`  | 3-5 秒的高帧率动漫动作片段（如行走、施法或微表情）。          |
| **Worlds & Lore**   | 1x1      | 图片/WebP | `imgs/features/world-building.webp`                           | 包含互动地图、世界观设定集或漂浮的卷轴元素，强调宏大感。      |
| **Studo Tools**     | 2x2 (XL) | 图片/WebP | `showcases/landingpage-features/feature-oc-apps.webp`         | 综合展示：3D 手办、表情包、周边卡片等实物化/衍生应用效果。    |
| **AI Chat**         | 1x1      | 图片/WebP | `showcases/landingpage-features/feature-chat.webp`            | 带有气泡交互感或角色特写的画面，体现“Memory Core”的情感连接。 |
| **Voice**           | 1x1      | 图片/WebP | `imgs/features/voice-spectrum.webp`                           | (Soon) 抽象声纹频谱、麦克风光晕或角色配音波形图。             |
| **Story**           | 1x1      | 图片/WebP | `imgs/features/story-scroll.webp`                             | (Soon) 类似视觉小说 (VN) 的对话框叠加、漫画分镜或古老羊皮纸。 |

---

## 7. 变更历史

- 2026-01-23 FEAT-homepage-optimization 更新：确立 3 列交错 Bento 栅格布局（OC Maker 2x2 / Studo Tools 2x2），补全 8 大模块物料清单。
- 2026-01-23 FEAT-homepage-optimization 更新：增加非对称网格物料清单，引入 assetLoader 占位机制。
- 2026-01-22 FEAT-homepage-optimization 变更：放弃 Command Bar 方案，转向视频 Hero + 平面化 Feature 的新设计。
- 2026-01-22 FEAT-homepage-optimization 初始化：确定指挥中心设计方案。
