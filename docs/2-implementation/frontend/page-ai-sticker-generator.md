# 前端页面：AI Sticker Generator

**Related**: [feature-oc-apps](../features/feature-studio-tools.md) | [AI Action Figure Generator](page-ai-action-figure-generator.md)

## 页面信息

- **路由**：`/ai-sticker-generator`
- **文件路径**：`src/app/[locale]/(default)/ai-sticker-generator/page.tsx`
- **类型**：服务器端渲染页面（RSC）+ 客户端交互组件
- **权限**：公开访问（未登录可浏览，登录后可生成）
- **国际化配置**：`src/i18n/pages/ai-sticker-generator/en.json`
- **模板配置**：`src/configs/prompts/oc-apps/sticker-templates.json`

## 页面目标

为用户提供专业的 AI 贴纸生成工具，支持：

1. 选择预设贴纸模板（决定风格、色彩、构图）
2. 两种输入模式：
   - **Common 模式**：文本描述 + 可选参考图
   - **Character 模式**：OC 角色 + 快捷选项（动作、表情等）
3. 可选补充描述文本
4. 一键生成可爱贴纸图

## 页面结构

### 布局模式（登录态判断）

```tsx
// 伪代码结构 - 与 Action Figure Generator 100%一致
{
  user ? (
    // 已登录：全屏工具区
    <StickerTool user={user} />
  ) : (
    // 未登录：营销+工具组合
    <>
      <StickerTool />
      <Introduction />
      <Benefits />
      <HowToUseSection />
      <StickerExamplesGallery />
      <FAQ />
      <CTASection />
    </>
  );
}
<AppFooter />;
```

## 核心组件设计

### 1. StickerTool（主工具组件）

**文件位置**：`src/components/oc-apps/StickerTool.tsx`

**功能职责**：
- 集成所有生成参数控制
- 支持两种输入模式切换（Common | Character）
- 管理生成状态（idle / processing / completed / error）
- 调用生成 API 并轮询结果
- 展示生成结果画廊

**状态管理**：

```typescript
interface StickerToolState {
  // 模板选择
  selectedTemplate: StickerTemplate | null;

  // 输入模式切换
  inputMode: "common" | "character";

  // Common 模式参数
  commonText: string;
  commonReferenceImage?: string;

  // Character 模式参数
  selectedOC?: Character;
  quickActions: string[]; // 快捷选项：动作、表情等
  characterCaption?: string;

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

**布局结构（左右分栏）- 与 Action Figure 一致**：

```
┌──────────────────────────┬────────────────────────────────────┐
│ 左侧：参数面板           │ 右侧：示例画廊/结果展示             │
│ (固定宽度 400-480px)     │ (占据剩余空间)                     │
├──────────────────────────┼────────────────────────────────────┤
│ 1. Model: [Selector]     │                                    │
│                          │  ┌──────────────────────────────┐ │
│                          │  │ StickerExamplesGallery       │ │
│                          │  │ 瀑布流展示示例贴纸图          │ │
│ 2. 模式切换              │  │ - 点击图片 → 一键复用参数    │ │
│   [Common] [Character]   │  │ - 底部渐变效果              │ │
│                          │  │ - 无限滚动加载              │ │
│ 3. 参数输入区            │  └──────────────────────────────┘ │
│   根据模式动态渲染       │                                    │
│                          │  【已登录状态】                    │
│ 4. 生成参数               │  ┌──────────────────────────────┐ │
│   TemplateSelectorCompact│  │ 生成前：说明文字占位          │ │
│  │  │ "Select a template and        │ │
│   Visibility: [Switch]   │  │  provide reference..."        │ │
│    Batch:  1-4(取决于模型支持)├──────────────────────────────┤ │
│ 5. 操作按钮               │  │ 生成中：ProcessingState      │ │
│   [Generate] (XX MC)     │  │ - 进度条                     │ │
│                          │  │ - 动画提示                   │ │
│                          │  ├──────────────────────────────┤ │
│                          │  │ 完成后：CompletedResults    │ │
│                          │  │ - 瀑布流展示结果图           │ │
│                          │  │ - 点击 → ImagePreviewDialog │ │
│                          │  │ - 下载/分享/收藏按钮         │ │
│                          │  └──────────────────────────────┘ │
└──────────────────────────┴────────────────────────────────────┘
```

### 2. 模式切换组件

**组件位置**：在 `StickerTool` 内部实现

**UI 设计**：

```tsx
<div className="flex gap-2 mb-6 border-b">
  <button
    className={`px-4 py-2 font-medium ${
      inputMode === "common"
        ? "text-primary border-b-2 border-primary"
        : "text-muted-foreground"
    }`}
    onClick={() => setInputMode("common")}
  >
    Common
  </button>
  <button
    className={`px-4 py-2 font-medium ${
      inputMode === "character"
        ? "text-primary border-b-2 border-primary"
        : "text-muted-foreground"
    }`}
    onClick={() => setInputMode("character")}
  >
    Character
  </button>
</div>
```

**Common 模式**：

```tsx
// 输入文本框
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Text Description
  </label>
  <textarea
    className="w-full p-3 border rounded-lg"
    placeholder="Describe your sticker..."
    rows={3}
    value={commonText}
    onChange={(e) => setCommonText(e.target.value)}
  />
</div>

// 可选参考图上传
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Reference Image *
  </label>
  <ReferenceImageUpload
    onUploadComplete={(url) => setCommonReferenceImage(url)}
  />
</div>
```

**Character 模式**：

```tsx
// OC 角色选择（必选）
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Select Character *
  </label>
  <CharacterSelector
    onSelect={(character) => setSelectedOC(character)}
  />
</div>

// 快捷选项（多选）
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Quick Actions (Select any)
  </label>
  <div className="grid grid-cols-2 gap-2">
    {[
      "Happy",
      "Sad",
      "Excited",
      "Surprised",
      "Angry",
      "Peace",
      "Running",
      "Dancing",
      "Waving",
      "Pointing",
    ].map((action) => (
      <button
        key={action}
        className={`p-2 border rounded-lg text-sm ${
          quickActions.includes(action)
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted"
        }`}
        onClick={() => {
          setQuickActions((prev) =>
            prev.includes(action)
              ? prev.filter((a) => a !== action)
              : [...prev, action]
          );
        }}
      >
        {action}
      </button>
    ))}
  </div>
</div>

// 可选 caption
<div className="mb-4">
  <label className="block text-sm font-medium mb-2">
    Additional Caption (Optional)
  </label>
  <input
    type="text"
    className="w-full p-3 border rounded-lg"
    placeholder="Add a caption..."
    value={characterCaption}
    onChange={(e) => setCharacterCaption(e.target.value)}
  />
</div>
```

### 3. TemplateSelectorCompact（模板选择器）

**文件位置**：`src/components/oc-apps/TemplateSelectorCompact.tsx`
**复用级别**：100% 复用 Action Figure 的组件，无需修改

**加载逻辑**：

```typescript
useEffect(() => {
  async function fetchTemplates() {
    const res = await fetch("/api/oc-apps/sticker/templates");
    const data = await res.json();
    setTemplates(data.templates);
  }
  fetchTemplates();
}, []);
```

**Sticker 模板配置结构**：

```json
{
  "version": "1.0.0",
  "templates": [
    {
      "id": "chibi_cute",
      "name": "Chibi Cute",
      "description": "Super cute chibi sticker with big eyes and small body",
      "thumbnail": "/imgs/sticker_templates/sticker-template-1.webp",
      "aspect_ratio": "1:1",
      "prompt": "Create a super cute chibi style sticker..."
    },
    {
      "id": "minimal_line",
      "name": "Minimal Line Art",
      "description": "Simple line art sticker with flat design, transparent background",
      "thumbnail": "/imgs/sticker_templates/sticker-template-2.webp",
      "aspect_ratio": "1:1",
      "prompt": "Create a minimalist line art style sticker..."
    }
    // ... 共 6 个模板
  ]
}
```

### 4. StickerExamplesGallery（示例画廊）

**文件位置**：`src/components/oc-apps/sticker/ExamplesGallery.tsx`

**功能特性**：

- **瀑布流布局**：复用 `WaterfallGallery` 组件逻辑
- **示例配置**：从 `src/configs/gallery/sticker-examples.json` 读取(图片使用R2后缀地址)
- **一键复用参数**：

```typescript
function handleExampleClick(example: StickerExample) {
  // 填充参数到左侧面板
  setSelectedTemplate(example.template_id);
  setCommonText(example.text || "");
  setCommonReferenceImage(example.reference_image_url || undefined);
  setInputMode(example.mode || "common");

  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: "smooth" });
}
```

**示例配置结构**：

```json
{
  "version": "1.0.0",
  "examples": [
    {
      "uuid": "sticker-example-001",
      "image_url": "/examples/sticker-001.webp",
      "template_id": "chibi_cute",
      "mode": "common",
      "text": "Cute cat sticker",
      "reference_image_url": "https://...",
      "width": 512,
      "height": 512,
      "alt": "Cute cat chibi sticker example"
    }
  ]
}
```

### 5. Prompt 构建逻辑

**在 StickerTool 内部实现**：

```typescript
function buildFinalPrompt(): string {
  if (!selectedTemplate) return "";

  let prompt = selectedTemplate.prompt;

  if (inputMode === "common") {
    // Common 模式：文本 + 可选参考图
    if (commonText.trim()) {
      prompt += `, ${commonText.trim()}`;
    }
  } else {
    // Character 模式：角色 + 快捷选项
    if (selectedOC) {
      prompt += `, featuring ${selectedOC.name}`;

      if (selectedOC.appearance_features) {
        prompt += `, character traits: ${selectedOC.appearance_features}`;
      }

      if (quickActions.length > 0) {
        prompt += `, ${quickActions.join(", ")}`;
      }

      if (characterCaption?.trim()) {
        prompt += `, ${characterCaption.trim()}`;
      }
    }
  }

  return prompt;
}
```

**验证逻辑**：

```typescript
function validateInput(): boolean {
  if (!selectedTemplate) {
    toast.error("Please select a template");
    return false;
  }

  if (inputMode === "common") {
    if (!commonText.trim() && !commonReferenceImage) {
      toast.error("Please provide text description or reference image");
      return false;
    }
  } else {
    if (!selectedOC) {
      toast.error("Please select a character");
      return false;
    }
  }

  return true;
}
```

### 6. API 调用与状态轮询

**调用生成 API**：

```typescript
async function handleGenerate() {
  if (!validateInput()) return;

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
        reference_image_urls:
          inputMode === "character" && selectedOC
            ? [selectedOC.avatar_url]
            : commonReferenceImage
            ? [commonReferenceImage]
            : undefined,
        character_uuids:
          inputMode === "character" && selectedOC
            ? [selectedOC.uuid]
            : undefined,
        gen_type: "sticker",
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

## 复用组件清单

| 组件名称              | 路径                                                       | 用途               | 是否需要修改         |
| --------------------- | ---------------------------------------------------------- | ------------------ | -------------------- |
| CharacterSelector     | `src/components/anime-generator/CharacterSelector.tsx`     | OC 角色选择        | 否，直接复用         |
| ReferenceImageUpload  | `src/components/anime-generator/ReferenceImageUpload.tsx`  | 图片上传           | 否，直接复用         |
| ModelSelectorWithIcon | `src/components/anime-generator/ModelSelectorWithIcon.tsx` | 模型选择           | 否，直接复用         |
| ProcessingState       | `src/components/anime-generator/ProcessingState.tsx`       | 生成中动画         | 否，直接复用         |
| CompletedResults      | `src/components/anime-generator/CompletedResults.tsx`      | 结果画廊（瀑布流） | 否，直接复用         |
| ImagePreviewDialog    | `src/components/anime-generator/ImagePreviewDialog.tsx`    | 图片预览弹窗       | 否，完全复用         |
| WaterfallGallery      | `src/components/anime-generator/WaterfallGallery.tsx`      | 瀑布流布局逻辑     | 作为 ExamplesGallery 基础 |

## 新增组件清单

| 组件名称              | 路径                                                       | 用途                           |
| --------------------- | ---------------------------------------------------------- | ------------------------------ |
| StickerTool           | `src/components/oc-apps/StickerTool.tsx`                  | 主工具组件（左右分栏容器）     |
| TemplateSelectorCompact | `src/components/oc-apps/TemplateSelectorCompact.tsx`      | 模板选择器（100%复用）         |
| StickerExamplesGallery | `src/components/oc-apps/sticker/ExamplesGallery.tsx`     | 示例画廊（右侧面板未登录状态） |

## 营销组件

### 1. Introduction

**位置**：`src/components/oc-apps/sticker/Introduction.tsx`

- 标题：AI Sticker Generator
- 副标题：Create adorable anime stickers from text or characters
- 关键词落地：sticker, kawaii, cute emoji, chat sticker

### 2. Benefits

**位置**：复用 `src/components/anime-page/Benefits.tsx`，传入配置

- 6个价值点卡片（从国际化配置读取）
- 图标 + 标题 + 描述（针对贴纸场景定制）

### 3. HowToUseSection

**位置**：复用 `src/components/anime-page/HowToUseSection.tsx`

- 4步图文流程：
  1. Select Sticker Template
  2. Choose Input Mode (Common/Character)
  3. Add Details
  4. Generate & Download

### 4. StickerExamplesGallery

**位置**：`src/components/oc-apps/sticker/ExamplesGallery.tsx`

- 瀑布流展示示例贴纸图
- 点击示例 → 可跳转复用参数（URL参数传递）

### 5. FAQ

**位置**：复用 `src/components/anime-page/AnimeFAQ.tsx`

- 配置化问题列表（国际化配置）

### 6. CTASection

**位置**：复用 `src/components/anime-page/CTASection.tsx`

- 按钮：Start Creating Stickers

## 国际化配置结构

**文件**：`src/i18n/pages/ai-sticker-generator/en.json`

```json
{
  "metadata": {
    "title": "AI Sticker Generator | Create Kawaii Stickers",
    "description": "Transform your ideas and characters into adorable anime stickers...",
    "keywords": "ai sticker generator, kawaii stickers, cute emoji, chat stickers"
  },
  "tool": {
    "selectTemplate": "Select Sticker Template",
    "mode": {
      "common": "Common",
      "character": "Character"
    },
    "common": {
      "textPlaceholder": "Describe your sticker...",
      "referenceOptional": "Reference Image (Optional)"
    },
    "character": {
      "selectCharacter": "Select Character *",
      "quickActions": "Quick Actions (Select any)",
      "captionPlaceholder": "Add a caption..."
    },
    "generate": "Generate Sticker",
    "creditsCost": "Cost: {credits} credits"
  },
  "introduction": {
    "title": "AI Sticker Generator",
    "subtitle": "Create adorable anime stickers from text or characters",
    "description": "..."
  },
  "benefits": [...],
  "howToUse": [...],
  "faq": [...]
}
```

## 模板系统详细设计

### 贴纸模板

**位置**：`src/configs/prompts/oc-apps/sticker-templates.json`


## 与 Action Figure Generator 差异对比

| 特性                   | Action Figure         | Sticker Generator                |
| ---------------------- | --------------------- | -------------------------------- |
| **模板系统**           | ✓ 6种手办模板         | ✓ 6种贴纸模板                    |
| **输入模式**           | 仅上传/OC 二选一      | ✓ Common/Character 双模式       |
| **快捷选项**           | ✗ 无                  | ✓ Character模式支持多选动作表情 |
| **比例**               | 多种比例（3:4等）     | 固定 1:1（正方形）              |
| **营销文案**           | 手办专业展示          | 可爱风格、聊天表情              |
| **模板内容**           | 姿势、场景、材质      | 风格、色彩、构图                |
| **参考图处理**         | 必选（二选一）        | Common模式：可选                |
| **OC 角色使用**        | 注入 prompt + 立绘作为最后一张参考图   |  注入 prompt + 快捷选项 + caption，立绘作为最后一张参考图 |

**核心差异总结**：

1. **双模式设计**：Sticker 增加了 Common 模式，支持纯文本生成，门槛更低
2. **快捷选项系统**：Character 模式提供动作、表情等预设选项，提升交互体验
3. **模板风格导向**：贴纸模板聚焦于视觉风格（可爱、简约、像素等），而非构图
4. **场景定位不同**：贴纸更偏向娱乐和社交，Action Figure 更偏向专业设计

## API 设计

### 新增接口

- ✅ `GET /api/oc-apps/sticker/templates`
  - 用途：获取贴纸模板配置
  - Auth：不需要
  - 位置：`src/app/api/oc-apps/sticker/templates/route.ts`
  - Response：直接返回 `sticker-templates.json` 内容

### 复用接口

- ✅ `POST /api/anime-generation/create-task`
  - 增补 `gen_type: "sticker"` 字段
  - 其他参数与 Action Figure 一致

## 性能优化

与 Action Figure Generator 保持一致：

- **模板配置缓存**：首次加载后存入 `localStorage`，有效期 24 小时
- **图片懒加载**：示例画廊与结果画廊均使用 `loading="lazy"`
- **防抖处理**：文本输入防抖 300ms
- **状态轮询优化**：采用指数退避策略
- **虚拟滚动**：示例画廊超过 50 张图片时启用
- **模板缩略图预加载**：首屏加载时预加载

## 错误处理

| 错误场景             | 处理方式                                                              |
| -------------------- | --------------------------------------------------------------------- |
| 未选择模板           | Toast提示："Please select a template"                                 |
| Common模式无输入     | Toast提示："Please provide text description or reference image"       |
| Character模式未选角  | Toast提示："Please select a character"                                |
| 积分不足             | Toast提示："Insufficient credits. Please purchase more." + 跳转链接   |
| 生成失败             | 显示错误信息 + "Try Again" 按钮                                       |
| 网络超时             | 显示重试按钮，保留已输入参数                                          |

## SEO 优化

### Metadata（服务器端生成）

```typescript
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations("ai-sticker-generator");

  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
    keywords: t("metadata.keywords"),
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_WEB_URL}/ai-sticker-generator`,
    },
    openGraph: {
      title: t("metadata.title"),
      description: t("metadata.description"),
      images: ["/og-sticker.jpg"],
    },
  };
}
```

### 结构化数据（Schema.org）

```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "AI Sticker Generator",
  "description": "Create adorable anime stickers from text or characters",
  "applicationCategory": "Design Tool",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}
```

## 测试要点

- [ ] **模式切换**：Common 和 Character 模式切换正常，参数互不影响
- [ ] **模板选择**：点击模板卡片，选中态高亮，参数自动更新（1:1 比例）
- [ ] **Common 模式**：文本输入和参考图上传功能正常，可单独或组合使用
- [ ] **Character 模式**：角色选择必填，快捷选项可多选，caption 可选
- [ ] **Prompt 构建**：
  - Common：模板 + 文本（可选）+ 参考图（可选）,**区分纯文本格式和文本描述+参考图（可选）模式的prompt模板**
  - Character：模板 + 角色特征 + 快捷选项 + caption（可选）
- [ ] **快捷选项交互**：点击选中/取消，选中态视觉反馈正确
- [ ] **输入验证**：两种模式的必填项验证正确
- [ ] **示例复用**：点击示例图片，模式参数正确填充
- [ ] **生成状态轮询**：processing → completed 过渡流畅
- [ ] **结果展示**：瀑布流布局正常，1:1 比例显示正确
- [ ] **图片预览**：点击结果图片，ImagePreviewDialog 弹出，功能完整
- [ ] **响应式布局**：桌面/平板/移动端切换正常
- [ ] **国际化**：所有文案使用配置，切换语言正常
- [ ] **SEO metadata**：title/description/keywords 正确渲染
- [ ] **性能**：模板配置缓存生效，图片懒加载正常

## 变更历史

- 2025-11-26 FEAT-oc-apps 新增 AI Sticker Generator（完全复用 Action Figure 架构，增加 Common/Character 双模式、快捷选项系统、6种贴纸风格模板）
- 2025-11-26 文档创建，参考 Action Figure Generator 设计
