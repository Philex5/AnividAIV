# 前端页面：AI Action Figure Generator

**Related**: [feature-oc-apps](../features/feature-studio-tools.md)

## 页面信息

- **路由**：`/ai-action-figure-generator`
- **文件路径**：`src/app/[locale]/(default)/ai-action-figure-generator/page.tsx`
- **类型**：服务器端渲染页面（RSC）+ 客户端交互组件
- **权限**：公开访问（未登录可浏览，登录后可生成）
- **国际化配置**：`src/i18n/pages/ai-action-figure-generator/en.json`

## 页面目标

为用户提供专业的 AI 手办图生成工具，支持：

1. 选择预设手办模板（决定姿势、风格、材质）
2. 提供参考素材（上传图片 OR 选择 OC 角色）
3. 可选补充描述文本
4. 一键生成专业手办效果图

## 页面结构

### 布局模式（登录态判断）

```tsx
// 伪代码结构
{
  user ? (
    // 已登录：全屏工具区
    <ActionFigureTool user={user} />
  ) : (
    // 未登录：营销+工具组合
    <>
      <ActionFigureTool />
      <Introduction />
      <Benefits />
      <HowToUseSection />
      <ActionFigureExamplesGallery />
      <FAQ />
      <CTASection />
    </>
  );
}
<AppFooter />;
```

## 核心组件设计

### 1. ActionFigureTool（主工具组件）

**文件位置**：`src/components/oc-apps/ActionFigureTool.tsx`

**功能职责**：

- 集成所有生成参数控制
- 管理生成状态（idle / processing / completed / error）
- 调用生成 API 并轮询结果
- 展示生成结果画廊

**状态管理**：

```typescript
interface ActionFigureToolState {
  // 模板选择
  selectedTemplate: Template | null;

  // 参考图来源（二选一）
  referenceSource: "upload" | "oc";
  uploadedImageUrl?: string;
  selectedOC?: Character;

  // 用户补充描述
  userPrompt: string;

  // 生成参数
  model: string;
  batchSize: number;
  visibilityLevel: "public" | "private";

  // 生成状态
  generationStatus: "idle" | "processing" | "completed" | "error";
  generationUuid?: string;
  results?: GeneratedImage[];
  errorMessage?: string;
}
```

**布局结构（左右分栏）**：

```
┌──────────────────────────┬────────────────────────────────────┐
│ 左侧：参数面板           │ 右侧：示例画廊/结果展示             │
│ (固定宽度 400-480px)     │ (占据剩余空间)                     │
├──────────────────────────┼────────────────────────────────────┤
│ 1. 模板选择区             │                                    │
│   TemplateSelectorGrid   │  【未登录状态】                    │
│   [模板1] [模板2]        │  ┌──────────────────────────────┐ │
│   [模板3] [模板4]        │  │ ActionFigureExamplesGallery   │ │
│                          │  │ 瀑布流展示示例手办图           │ │
│ 2. 参考图输入区（二选一） │  │ - 点击图片 → 一键复用参数     │ │
│   [Upload] [Select OC]   │  │ - 底部渐变效果               │ │
│   ReferenceImageUpload   │  │ - 无限滚动加载               │ │
│   或 CharacterSelector   │  └──────────────────────────────┘ │
│                          │                                    │
│ 3. 可选补充描述           │                                    │
│   Textarea: "details..." │                                    │
│                          │  【已登录状态】                    │
│ 4. 生成参数               │  ┌──────────────────────────────┐ │
│   Model: [Selector]      │  │ 生成前：说明文字占位           │ │
│   Batch: [1-4]           │  │ "Select a template and         │ │
│   Visibility: [Switch]   │  │  provide reference..."         │ │
│                          │  ├──────────────────────────────┤ │
│ 5. 操作按钮               │  │ 生成中：ProcessingState       │ │
│   [Generate] (XX MC)     │  │ - 进度条                      │ │
│                          │  │ - 动画提示                    │ │
│                          │  ├──────────────────────────────┤ │
│                          │  │ 完成后：CompletedResults      │ │
│                          │  │ - 瀑布流展示结果图             │ │
│                          │  │ - 点击 → ImagePreviewDialog   │ │
│                          │  │ - 下载/分享/收藏按钮           │ │
│                          │  └──────────────────────────────┘ │
└──────────────────────────┴────────────────────────────────────┘
```

**响应式布局**：

- **桌面端（≥1024px）**：左右分栏，左侧固定 400-480px，右侧自适应
- **平板端（768-1023px）**：左侧收窄至 360px，右侧压缩
- **移动端（<768px）**：改为上下堆叠，参数面板在上，示例/结果在下

### 2. TemplateSelectorGrid（模板选择器）

**文件位置**：`src/components/oc-apps/TemplateSelectorGrid.tsx`

**Props**：

```typescript
interface TemplateSelectorGridProps {
  templates: Template[];
  selectedId?: string;
  onSelect: (template: Template) => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  aspect_ratio: string;
  prompt: string;
}
```

**UI 设计**：

- **布局**：2列网格（在 400px 面板内），每卡片约 180×220px
- **卡片结构**：
  ```
  ┌────────────┐
  │ [缩略图]   │ ← 模板效果预览
  ├────────────┤
  │ Classic    │ ← 模板名称（加粗）
  │ Standing   │
  └────────────┘
  ```
- **选中态**：蓝色边框 `border-2 border-primary`
- **Hover 态**：卡片轻微上浮效果 `hover:translate-y-[-2px]`

**加载逻辑**：

```typescript
useEffect(() => {
  async function fetchTemplates() {
    const res = await fetch("/api/oc-apps/action-figure/templates");
    const data = await res.json();
    setTemplates(data.templates);
  }
  fetchTemplates();
}, []);
```

### 3. ActionFigureExamplesGallery（示例画廊）

**文件位置**：`src/components/oc-apps/action-figure/ExamplesGallery.tsx`

**功能特性**：

- **瀑布流布局**：复用 `WaterfallGallery` 组件逻辑
- **示例配置**：从 `src/configs/gallery/action-figure-examples.json` 读取
- **一键复用参数**：

  ```typescript
  function handleExampleClick(example: Example) {
    // 填充参数到左侧面板
    setSelectedTemplate(example.template_id);
    setUploadedImageUrl(example.reference_image_url);
    setUserPrompt(example.user_prompt || "");

    // 滚动到顶部，聚焦参数面板
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  ```

**示例配置结构**：

```json
{
  "version": "1.0.0",
  "examples": [
    {
      "uuid": "example-001",
      "image_url": "https://r2.anividai.com/examples/action-figure-001.webp",
      "template_id": "classic-standing",
      "reference_image_url": "https://...",
      "user_prompt": "add cape",
      "width": 768,
      "height": 1024,
      "alt": "Classic standing action figure example"
    }
  ]
}
```

**瀑布流配置**：

- **桌面端（右侧面板）**：2列
- **移动端（全宽）**：2列（更紧凑）
- **图片懒加载**：`loading="lazy"`
- **底部渐变遮罩**：引导用户注册/登录

### 4. 右侧面板状态管理

**组件位置**：在 `ActionFigureTool` 内部实现

**状态枚举**：

```typescript
type RightPanelState =
  | { type: "examples" } // 未登录：示例画廊
  | { type: "idle" } // 已登录，未生成：提示文案
  | { type: "processing"; uuid: string } // 生成中
  | { type: "completed"; results: Image[] } // 完成
  | { type: "error"; message: string }; // 失败
```

**渲染逻辑**：

```tsx
function RightPanel({ state, user }: RightPanelProps) {
  // 未登录：始终显示示例画廊
  if (!user) {
    return <ActionFigureExamplesGallery onExampleClick={handleExampleClick} />;
  }

  // 已登录：根据生成状态切换
  switch (state.type) {
    case "idle":
      return (
        <div className="flex items-center justify-center h-full text-center p-8">
          <div>
            <h3 className="text-xl font-semibold mb-2">Ready to Create</h3>
            <p className="text-muted-foreground">
              Select a template and provide reference to generate your action
              figure
            </p>
          </div>
        </div>
      );

    case "processing":
      return <ProcessingState generationUuid={state.uuid} />;

    case "completed":
      return (
        <CompletedResults
          results={state.results}
          onImageClick={handleImagePreview}
        />
      );

    case "error":
      return (
        <div className="flex items-center justify-center h-full p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Generation Failed</AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        </div>
      );
  }
}
```

### 5. 参考图切换逻辑

**组件位置**：在 `ActionFigureTool` 内部实现

**UI 交互**：

```tsx
<div className="flex gap-4 mb-4">
  <Button
    variant={referenceSource === "upload" ? "default" : "outline"}
    onClick={() => setReferenceSource("upload")}
  >
    Upload Image
  </Button>
  <Button
    variant={referenceSource === "oc" ? "default" : "outline"}
    onClick={() => setReferenceSource("oc")}
  >
    Select OC Character
  </Button>
</div>;

{
  referenceSource === "upload" && (
    <ReferenceImageUpload
      onUploadComplete={(url) => setUploadedImageUrl(url)}
    />
  );
}

{
  referenceSource === "oc" && (
    <CharacterSelector onSelect={(character) => setSelectedOC(character)} />
  );
}
```

**校验逻辑**：

- 生成前检查是否已提供参考图：`uploadedImageUrl || selectedOC?.avatar_url`
- 未提供时显示错误：`toast.error("Please provide a reference image or select a character")`

### 6. 图片预览弹窗（完全复用）

**组件复用**：`ImagePreviewDialog`

- **位置**：`src/components/anime-generator/ImagePreviewDialog.tsx`
- **触发条件**：点击已生成的结果图片
- **功能**：
  - 全屏查看原图
  - 下载按钮
  - 收藏按钮（如已实现）
  - 分享按钮
  - 左右切换（多图时）
  - ESC 键 / 点击遮罩关闭

**调用方式**：

```tsx
const [previewImage, setPreviewImage] = useState<Image | null>(null);

function handleImagePreview(image: Image) {
  setPreviewImage(image);
}

return (
  <>
    <CompletedResults
      results={generatedImages}
      onImageClick={handleImagePreview}
    />

    {previewImage && (
      <ImagePreviewDialog
        image={previewImage}
        allImages={generatedImages}
        onClose={() => setPreviewImage(null)}
      />
    )}
  </>
);
```

详细设计参考：`docs/2-implementation/frontend/component-preview-image-dialog.md`

### 7. Prompt 构建逻辑

**在前端构造最终 prompt**（提交前）：

```typescript
function buildFinalPrompt(): string {
  if (!selectedTemplate) return "";

  let prompt = selectedTemplate.prompt;

  // 注入 OC 特征（如选择了 OC）
  if (selectedOC) {
    prompt += `, featuring ${selectedOC.name}`;

    if (selectedOC.appearance_features) {
      prompt += `, character traits: ${selectedOC.appearance_features}`;
    }
  }

  // 注入用户补充描述
  if (userPrompt.trim()) {
    prompt += `, ${userPrompt.trim()}`;
  }

  return prompt;
}
```

### 8. API 调用与状态轮询

**调用生成 API**：

```typescript
async function handleGenerate() {
  setGenerationStatus("processing");

  try {
    const response = await fetch("/api/anime-generation/create-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: buildFinalPrompt(),
        model_id: selectedModel,
        aspect_ratio: selectedTemplate.aspect_ratio,
        counts: batchSize,
        reference_image_urls: selectedOC
          ? [selectedOC.avatar_url]
          : [uploadedImageUrl],
        character_uuids: selectedOC ? [selectedOC.uuid] : undefined,
        gen_type: "action-figure",
        visibility_level: visibilityLevel,
      }),
    });

    const data = await response.json();
    setGenerationUuid(data.generation_uuid);

    // 开始轮询状态
    pollGenerationStatus(data.generation_uuid);
  } catch (error) {
    setGenerationStatus("error");
    setErrorMessage(error.message);
  }
}
```

**状态轮询**（复用现有 hook）：

```typescript
import { useGenerationPolling } from "@/hooks/useGenerationPolling";

const { status, results, error } = useGenerationPolling(generationUuid);

useEffect(() => {
  if (status === "completed") {
    setGenerationStatus("completed");
    setResults(results);
  } else if (status === "failed") {
    setGenerationStatus("error");
    setErrorMessage(error);
  }
}, [status, results, error]);
```

## 复用组件清单

| 组件名称              | 路径                                                       | 用途               | 是否需要修改              |
| --------------------- | ---------------------------------------------------------- | ------------------ | ------------------------- |
| CharacterSelector     | `src/components/anime-generator/CharacterSelector.tsx`     | OC 角色选择        | 否，直接复用              |
| ReferenceImageUpload  | `src/components/anime-generator/ReferenceImageUpload.tsx`  | 图片上传           | 否，直接复用              |
| ModelSelectorWithIcon | `src/components/anime-generator/ModelSelectorWithIcon.tsx` | 模型选择           | 否，直接复用              |
| ProcessingState       | `src/components/anime-generator/ProcessingState.tsx`       | 生成中动画         | 否，直接复用              |
| CompletedResults      | `src/components/anime-generator/CompletedResults.tsx`      | 结果画廊（瀑布流） | 否，直接复用              |
| ImagePreviewDialog    | `src/components/anime-generator/ImagePreviewDialog.tsx`    | 图片预览弹窗       | 否，完全复用              |
| WaterfallGallery      | `src/components/anime-generator/WaterfallGallery.tsx`      | 瀑布流布局逻辑     | 作为 ExamplesGallery 基础 |

## 新增组件清单

| 组件名称                    | 路径                                                       | 用途                           |
| --------------------------- | ---------------------------------------------------------- | ------------------------------ |
| ActionFigureTool            | `src/components/oc-apps/ActionFigureTool.tsx`              | 主工具组件（左右分栏容器）     |
| TemplateSelectorGrid        | `src/components/oc-apps/TemplateSelectorGrid.tsx`          | 模板选择器                     |
| ActionFigureExamplesGallery | `src/components/oc-apps/action-figure/ExamplesGallery.tsx` | 示例画廊（右侧面板未登录状态） |

## 营销组件

### 1. Introduction

**位置**：`src/components/oc-apps/action-figure/Introduction.tsx`

- 标题：AI Action Figure Generator
- 副标题：Turn your anime characters into professional figure designs
- 关键词落地：action figure, anime figure, collectible design

### 2. Benefits

**位置**：复用 `src/components/anime-page/Benefits.tsx`，传入配置

- 6个价值点卡片（从国际化配置读取）
- 图标 + 标题 + 描述

### 3. HowToUseSection

**位置**：复用 `src/components/anime-page/HowToUseSection.tsx`

- 4步图文流程：
  1. Select Template
  2. Provide Reference
  3. Customize Details
  4. Generate & Download

### 4. ActionFigureExamplesGallery

**位置**：`src/components/oc-apps/action-figure/ExamplesGallery.tsx`

- 瀑布流展示示例手办图
- 点击示例 → 可跳转复用参数（URL参数传递）

### 5. FAQ

**位置**：复用 `src/components/anime-page/AnimeFAQ.tsx`

- 配置化问题列表（国际化配置）

### 6. CTASection

**位置**：复用 `src/components/anime-page/CTASection.tsx`

- 按钮：Start Creating Now

## 国际化配置结构

**文件**：`src/i18n/pages/ai-action-figure-generator/en.json`

```json
{
  "metadata": {
    "title": "AI Action Figure Generator | Create Anime Collectibles",
    "description": "Transform your anime characters into professional action figure designs...",
    "keywords": "ai action figure, anime figure generator, collectible design"
  },
  "tool": {
    "selectTemplate": "Select Figure Template",
    "provideReference": "Provide Reference",
    "uploadImage": "Upload Image",
    "selectOC": "Select OC Character",
    "additionalPrompt": "Additional Details (Optional)",
    "generate": "Generate Figure",
    "creditsCost": "Cost: {credits} credits"
  },
  "introduction": {
    "title": "AI Action Figure Generator",
    "subtitle": "Professional anime figure designs powered by AI",
    "description": "..."
  },
  "benefits": [...],
  "howToUse": [...],
  "faq": [...]
}
```

## 响应式设计要点

### 桌面端（≥1024px）

- **左右分栏布局**（flex 或 grid）

  ```css
  .action-figure-tool {
    display: flex;
    height: 100vh;
    gap: 24px;
  }

  .left-panel {
    width: 480px;
    flex-shrink: 0;
    overflow-y: auto;
    padding: 24px;
  }

  .right-panel {
    flex: 1;
    overflow-y: auto;
    background: var(--muted);
  }
  ```

- **模板网格**：2列
- **示例/结果画廊**：2列瀑布流

### 平板端（768px-1023px）

- **继续左右分栏**，但左侧收窄
  ```css
  .left-panel {
    width: 360px;
  }
  ```
- **模板网格**：2列（更紧凑间距）
- **示例/结果画廊**：2列

### 移动端（<768px）

- **改为上下堆叠布局**

  ```css
  .action-figure-tool {
    display: block;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    height: auto;
  }
  ```

- **模板网格**：2列（紧凑卡片）
- **示例/结果画廊**：2列
- **固定底部生成按钮**（悬浮）
  ```css
  .generate-button-mobile {
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    z-index: 50;
  }
  ```

### 滚动行为优化

- **左侧面板**：独立滚动，保持参数面板始终可访问
- **右侧面板**：独立滚动，画廊可无限加载
- **移动端**：整体滚动，生成按钮固定在底部

## SEO 优化

### Metadata（服务器端生成）

```typescript
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations("ai-action-figure-generator");

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    keywords: t("metadata.keywords"),
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL}/ai-action-figure-generator`,
    },
    openGraph: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      images: ["/og-action-figure.jpg"],
    },
  };
}
```

### 结构化数据（Schema.org）

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "AI Action Figure Generator",
  "description": "...",
  "applicationCategory": "Design Tool",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

## 错误处理

| 错误场景     | 处理方式                                                            |
| ------------ | ------------------------------------------------------------------- |
| 未选择模板   | Toast提示："Please select a template"                               |
| 未提供参考图 | Toast提示："Please provide a reference image or select a character" |
| 积分不足     | Toast提示："Insufficient credits. Please purchase more." + 跳转链接 |
| 生成失败     | 显示错误信息 + "Try Again" 按钮                                     |
| 网络超时     | 显示重试按钮，保留已输入参数                                        |

## 性能优化

- **模板配置缓存**：首次加载后存入 `localStorage`，有效期 24 小时

  ```typescript
  const CACHE_KEY = "action-figure-templates";
  const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

  async function loadTemplates() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    }

    const res = await fetch("/api/oc-apps/action-figure/templates");
    const data = await res.json();

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data,
        timestamp: Date.now(),
      })
    );

    return data;
  }
  ```

- **图片懒加载**：示例画廊与结果画廊均使用 `loading="lazy"`
- **防抖处理**：用户补充描述输入防抖 300ms
- **状态轮询优化**：采用指数退避策略（1s → 2s → 4s → 最大 10s）
- **虚拟滚动**：示例画廊超过 50 张图片时启用虚拟滚动
- **图片预加载**：模板缩略图在首屏加载时预加载

## 与动漫生成器差异对比

| 特性                   | 动漫生成器         | 手办生成器        |
| ---------------------- | ------------------ | ----------------- |
| **布局**               | 左右分栏           | 左右分栏（相同）  |
| **风格选择**           | ✓ 多种风格         | ✗ 由模板决定      |
| **比例选择**           | ✓ 多种比例         | ✗ 由模板决定      |
| **场景选择**           | ✓ 可选场景         | ✗ 模板包含        |
| **动作选择**           | ✓ 可选动作         | ✗ 模板包含        |
| **模板系统**           | ✗ 无               | ✓ 核心功能        |
| **参考图来源**         | 仅上传             | 上传 OR OC        |
| **右侧面板（未登录）** | 示例画廊           | 示例画廊（相同）  |
| **右侧面板（已登录）** | 说明→结果          | 说明→结果（相同） |
| **图片预览**           | ImagePreviewDialog | 完全复用          |

**关键差异总结**：

1. **模板系统**：手办生成器的核心差异，模板决定姿势、风格、比例
2. **参数简化**：移除风格/场景/动作选择器，通过模板预设
3. **参考图扩展**：新增 OC 角色选择入口，自动使用角色头像

## 测试要点

- [ ] **布局响应式**：桌面/平板/移动端左右分栏/堆叠切换正常
- [ ] **模板选择**：点击模板卡片，选中态高亮，参数自动更新
- [ ] **参考图切换**：上传/OC 选项互斥，切换时清空对方数据
- [ ] **OC 选择**：选择 OC 后，avatar_url 正确传递到 API
- [ ] **Prompt 构建**：模板 + OC 特征 + 用户补充，顺序与格式正确
- [ ] **示例复用**：点击示例图片，参数正确填充到左侧面板
- [ ] **生成状态轮询**：processing → completed 过渡流畅
- [ ] **结果展示**：瀑布流布局正常，图片比例正确
- [ ] **图片预览**：点击结果图片，ImagePreviewDialog 弹出，功能完整
- [ ] **移动端固定按钮**：生成按钮始终可见且可点击
- [ ] **国际化**：所有文案使用配置，切换语言正常
- [ ] **错误处理**：积分不足/生成失败/网络错误提示清晰
- [ ] **SEO metadata**：title/description/keywords 正确渲染
- [ ] **性能**：模板配置缓存生效，图片懒加载正常

## 变更历史

- 2025-10-31 v1.1 调整布局为左右分栏（与动漫生成器一致），完全复用 ImagePreviewDialog，增强示例画廊交互
- 2025-10-31 v1.0 创建 AI Action Figure Generator 前端设计文档
