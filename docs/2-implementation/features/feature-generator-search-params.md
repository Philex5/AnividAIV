# 各大生成器 Search Params 实现记录

## 概述

记录各个生成器页面对 URL search parameters 的处理方式，用于实现页面间参数传递和状态恢复。

## 1. OC Maker (`/oc-maker`)

**文件位置**: `src/app/[locale]/(default)/oc-maker/page.tsx`

### 支持的 Search Params

- `character_uuid` - 加载指定角色进行编辑
  - 验证：用户必须是该角色的拥有者
  - 用途：从角色详情页进入编辑模式
- `remix_from` - 基于指定角色创建副本（fork）
  - 验证：检查 `allow_remix` 权限或角色拥有者
  - 用途：从社区或其他用户的角色创建变体

### 处理逻辑

```typescript
// URL参数解析
const characterId = urlParams?.character_uuid as string | undefined;
const remixForm = urlParams?.remix_from as string | undefined;

// 权限检查流程
1. 检查用户登录状态
2. 加载角色数据
3. 验证用户权限（编辑者或允许remix）
4. 设置加载模式：edit/remix/new
5. 错误处理：角色不存在、权限不足时显示错误页面
```

### 应用场景

- 从角色详情页点击"编辑"按钮跳转到 OC Maker
- 从社区页面或分享链接 fork 他人角色

## 2. AI 动漫生成器 (`/ai-anime-generator`)

**文件位置**: `src/app/[locale]/(default)/ai-anime-generator/page.tsx`

### 支持的 Search Params

- `gen_image_id` - 直接加载指定的生成图片
  - 验证：UUID 格式验证, gen_type='anime'
  - 用途：从历史记录或分享链接直接查看结果
- `ref_image_url` - 预填充参考图片 URL
  - 类型：字符串 URL
  - 用途：从其他页面传递参考图片
  - 兼容：`image_url`（历史参数名）
- `character_uuid` - 预选角色
  - 验证：UUID 格式验证
  - 用途：跳转到生成器并预选该角色

### 处理逻辑

```typescript
// 参数提取与验证
const genImageId =
  typeof resolvedSearchParams.gen_image_id === "string"
    ? resolvedSearchParams.gen_image_id
    : undefined;
const refImageUrl =
  typeof resolvedSearchParams.ref_image_url === "string"
    ? resolvedSearchParams.ref_image_url
    : typeof resolvedSearchParams.image_url === "string"
      ? resolvedSearchParams.image_url
      : undefined;
const characterUuid =
  typeof resolvedSearchParams.character_uuid === "string"
    ? resolvedSearchParams.character_uuid
    : undefined;

// UUID 验证函数
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// gen_type 验证（在组件的 loadReuseData 函数中）
// 验证 gen_type 是否为 'anime'
if (!validateGenerationType(imageData.gen_type, IMAGE_GEN_TYPES.ANIME)) {
  // 显示错误提示，清空 URL 参数
  toast.error("This image was generated in another generator...");
  router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  return;
}

// characterUuid 处理（在组件的 useEffect + selectCharacter 中）
// 未登录时触发登录；登录后自动选中角色
if (!isLoggedIn) {
  setPendingOperation("character");
  setShowSignModal(true);
  return;
}

if (characterUuid && isValidUUID(characterUuid)) {
  selectCharacter(characterUuid);
  // 仅在成功执行选中后标记已处理，避免登录后被误跳过
  processedParamsRef.current.characterUuid = characterUuid;
}

// refImageUrl 处理（在组件 useEffect 中）
// 兼容已编码 URL（decodeURIComponent）并校验 http/https 协议
// 当前模型不支持参考图时，自动切换到首个支持参考图的模型
if (refImageUrl) {
  const normalizedUrl = safeDecodeAndValidateUrl(refImageUrl);
  if (normalizedUrl) {
    if (!supportsReferenceImage) {
      switchToFirstReferenceSupportedModel();
    }
    setReferenceImages((prev) => [...prev, normalizedUrl]);
  }
}
```

### 应用场景

- 从我的作品页面点击作品进入生成器查看
- 从角色页面点击"生成动漫"跳转
- 分享生成结果给其他人查看

## 3. AI 视频生成器 (`/ai-anime-video-generator`)

**文件位置**: `src/app/[locale]/(default)/ai-anime-video-generator/page.tsx`

### 支持的 Search Params

- `gen_video_id` - 直接加载指定的生成视频
  - 验证：UUID 格式验证,gen_type='anime_video'
  - 用途：从历史记录或分享链接直接查看结果
- `character_uuid` - 预选角色
  - 验证：UUID 格式验证
  - 用途：从角色页面跳转到视频生成器并预选该角色
- `ref_image_url` - 预选参考图片 URL
  - 类型：字符串 URL
  - 用途：从其他页面传递参考图片 URL

### 处理逻辑

```typescript
// 参数提取（与动漫生成器相同模式）
const genVideoId = typeof resolvedSearchParams.gen_video_id === "string" ? resolvedSearchParams.gen_video_id : undefined;
const characterUuid = typeof resolvedSearchParams.character_uuid === "string" ? resolvedSearchParams.character_uuid : undefined;
const refImageUrl = typeof resolvedSearchParams.ref_image_url === "string" ? resolvedSearchParams.ref_image_url : undefined;

// 传递到组件时进行二次验证
characterUuid={characterUuid && isValidUUID(characterUuid) ? characterUuid : undefined}
refImageUrl={refImageUrl}

// gen_type 验证（在组件的 loadReuseData 函数中）
// 验证 gen_type 是否为 'video'
if (!validateGenerationType(videoData.gen_type, VIDEO_GEN_TYPES.VIDEO)) {
  // 显示错误提示，清空 URL 参数
  toast.error("This video was generated in another generator...");
  router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  return;
}
```

### 应用场景

- 从我的作品页面点击视频进入生成器查看
- 从角色页面点击"制作动画"跳转
- 从角色头像直接生成该角色的视频

## 4. AI 手办生成器 (`/ai-action-figure-generator`)

**文件位置**: `src/app/[locale]/(default)/ai-action-figure-generator/page.tsx`

### 支持的 Search Params

- `gen_image_id` - 直接加载指定的生成图片
  - 验证：UUID 格式验证, gen_type='action_figure'
  - 用途：从历史记录或分享链接直接查看结果
- `character_uuid` - 预选角色
  - 验证：UUID 格式验证
  - 用途：从角色页面跳转到手办生成器并预选该角色

### 处理逻辑

```typescript
// 参数提取（简化版，无需 ref_image 参数）
const genImageId =
  typeof resolvedSearchParams.gen_image_id === "string"
    ? resolvedSearchParams.gen_image_id
    : undefined;
const characterUuid =
  typeof resolvedSearchParams.character_uuid === "string"
    ? resolvedSearchParams.character_uuid
    : undefined;

// UUID 验证（标准正则）
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// gen_type 验证（在组件的 loadReuseData 函数中）
// 验证 gen_type 是否为 'action_figure'
if (
  !validateGenerationType(imageData.gen_type, IMAGE_GEN_TYPES.ACTION_FIGURE)
) {
  // 显示错误提示，清空 URL 参数
  toast.error("This image was generated in another generator...");
  router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  return;
}

// characterUuid 处理（在组件的 selectCharacter 函数中）
// 自动选中角色（通过 CharacterSelector），请求时会自动带上立绘图片
if (characterUuid && isValidUUID(characterUuid)) {
  setSelectedOCUuid(characterUuid); // 自动选中角色
  setReferenceSource("oc"); // 使用 OC 作为参考图来源
}
```

### 应用场景

- 从我的作品页面点击作品进入生成器查看
- 从角色页面点击"生成手办"跳转

## 5. AI 贴纸生成器 (`/ai-sticker-generator`)

**文件位置**: `src/app/[locale]/(default)/ai-sticker-generator/page.tsx`

### 支持的 Search Params

- `gen_image_id` - 直接加载指定的生成图片
  - 验证：UUID 格式验证, gen_type='sticker'
  - 模式：**describe&ref** - 使用`text_with_reference`模式，填入对应图片作为参考图
  - 用途：从历史记录或分享链接直接查看结果，并复用生成参数
- `character_uuid` - 预选角色
  - 验证：UUID 格式验证
  - 模式：**oc** - 使用`oc_character`模式，直接选中对应 OC
  - 用途：从角色页面跳转到贴纸生成器并预选该角色

### 处理逻辑

```typescript
// 参数提取
const genImageId =
  typeof resolvedSearchParams.gen_image_id === "string"
    ? resolvedSearchParams.gen_image_id
    : undefined;
const characterUuid =
  typeof resolvedSearchParams.character_uuid === "string"
    ? resolvedSearchParams.character_uuid
    : undefined;

// UUID 验证（标准正则）
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// gen_type 验证（在组件的 loadReuseData 函数中）
// 验证 gen_type 是否为 'sticker'
if (!validateGenerationType(imageData.gen_type, IMAGE_GEN_TYPES.STICKER)) {
  // 显示错误提示，清空 URL 参数
  toast.error("This image was generated in another generator...");
  router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  return;
}

// 处理复用数据加载（StickerTool.tsx:422-455）
// 加载成功后填充：
// - 模板（template_id）
// - 用户补充描述（user_prompt）
// - 模型（model_id）
// - 在右侧展示复用图片
// 注意：不自动填充参考图，需要用户手动选择

// characterUuid 处理（StickerTool.tsx:457-484）
// 自动选中角色（通过 CharacterSelector），并切换到 OC 模式
if (characterUuid && isValidUUID(characterUuid)) {
  setSelectedOCUuid(characterUuid); // 自动选中角色
  setReferenceSource("oc"); // 使用 OC 作为参考图来源
  setInputMode("oc_character"); // 切换到 OC 角色模式

  // 自动清理 URL 中的 character_uuid 参数
  const currentUrl = new URL(window.location.href);
  if (currentUrl.searchParams.has("character_uuid")) {
    currentUrl.searchParams.delete("character_uuid");
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  }
}

// 生成后 URL 重置（StickerTool.tsx:503-519）
const currentUrl = new URL(window.location.href);
const paramsToReset = ["gen_image_id", "character_uuid"];
paramsToReset.forEach((param) => {
  if (currentUrl.searchParams.has(param)) {
    currentUrl.searchParams.delete(param);
  }
});
if (hasParamsToReset) {
  router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
}
```

### 应用场景

- 从我的作品页面点击作品进入生成器查看
- 从角色页面点击"生成贴纸"跳转

### 实现细节

**gen_image_id 复用流程**（StickerTool.tsx:183-317）：

1. 调用 API 获取图片详情 `/api/generation/image/${imageId}`
2. 验证 `gen_type === 'sticker'`，类型不匹配则提示错误并清空 URL
3. 填充生成参数：模板、用户描述、模型
4. 在右侧面板展示复用图片
5. 标记已处理，避免重复加载

**character_uuid 自动选中流程**（StickerTool.tsx:319-339）：

1. 检查登录状态，未登录触发登录流程
2. 调用 `selectCharacter()` 函数自动选中角色
3. 切换输入模式为 `oc_character`
4. 清理 URL 中的 `character_uuid` 参数

**与手办生成器的差异**：

- 完全复用 ActionFigureTool 的实现模式
- 仅 `gen_type` 不同（"sticker" vs "action_figure"）
- 输入模式支持更丰富：text_only、text_with_reference、oc_character
- 复用数据不自动填充参考图，保持用户选择权

## 5. Linking 组件配置

**文件位置**: `docs/2-implementation/frontend/component-linking.md` (第130-153行)

### OC Maker 按钮配置示例

```typescript
ocMakerConfig(characterUuid: string) => ({
  name: 'oc-maker',
  orientation: 'vertical',
  buttons: [
    {
      label: 'Animate It',
      type: 'single',
      href: `/ai-anime-video-generator?character_uuid=${characterUuid}`,
      variant: 'primary',
    },
    {
      label: 'Studio Tools',
      type: 'list',
      variant: 'default',
      listItems: [
        { label: 'ai action figure generator', href: `/ai-action-figure-generator?character_uuid=${characterUuid}` },
      ],
    },
  ],
})
```

### 应用场景

- 在角色详情页底部显示相关操作的按钮组
- "Animate It" 直接跳转到视频生成器并预选该角色
- "Studio Tools" 下拉列表提供其他生成工具入口

## 7. 共同模式与规范

### UUID 验证规范

所有生成器使用统一的 UUID 验证正则表达式：

```typescript
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
```

### gen_type 验证规范

**背景**: 为防止用户在错误的生成器中使用不匹配类型的 `gen_image_id`/`gen_video_id`,各生成器需要验证加载的生成物的 `gen_type` 是否匹配。

**实现位置**: `src/lib/generation-type-validator.ts`

**支持的 gen_type 类型**:

图片生成 (generation_images):

- `anime` - AI 动漫生成器
- `action_figure` - AI 手办生成器
- `avatar` - OC Maker 角色头像
- `character` - OC Maker 角色全身图

视频生成 (generation_videos):

- `video` - AI 视频生成器

**验证流程**:

1. 组件在 `loadReuseData()` 函数中获取 API 响应
2. 使用 `validateGenerationType(actualType, expectedType)` 验证类型
3. 验证失败时:
   - 使用 `toast.error()` 显示友好错误提示
   - 使用 `getGeneratorName()` 获取正确的生成器名称
   - 清空 URL 中的 `gen_image_id`/`gen_video_id` 参数
   - 终止数据加载流程

**代码示例**:

```typescript
// 导入验证工具
import {
  validateGenerationType,
  IMAGE_GEN_TYPES,
  getGeneratorName,
} from "@/lib/generation-type-validator";

// 在 loadReuseData 中验证
if (!validateGenerationType(imageData.gen_type, IMAGE_GEN_TYPES.ANIME)) {
  const actualGenType = imageData.gen_type || "unknown";
  const correctGeneratorName = getGeneratorName(actualGenType);

  toast.error(
    `This image was generated in ${correctGeneratorName}. Please use the correct generator to reuse its parameters.`,
  );

  // 清空 URL 参数
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.delete("gen_image_id");
  router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });

  return;
}
```

**实现文件**:

- AnimeGenerator: `src/components/anime-generator/AnimeGenerator.tsx:651-666`
- ActionFigureTool: `src/components/oc-apps/ActionFigureTool.tsx:211-226`
- VideoGenerator: `src/components/video/VideoGenerator.tsx:464-479`

### 参数传递模式

1. **extract**: 从 `searchParams` 中安全提取参数
2. **validate**: 使用 UUID 正则验证格式
3. **sanitize**: 无效参数转换为 `undefined`
4. **propagate**: 将验证后的参数传递给子组件

### 登录状态处理

所有生成器遵循相同模式：

- 已登录：显示全屏工具体验（无营销内容）
- 未登录：显示完整营销页面 + 工具区域

### URL 重置优化机制

#### 问题背景

1. **重复加载问题**：用户刷新页面时，search params 会重新加载数据
2. **参数覆盖风险**：用户生成新内容后，刷新页面可能用旧的 ref 信息覆盖新生成的内容

#### 解决方案

在用户点击"生成"按钮后，立即重置 URL 中的 search params，保持 URL 干净。

#### 实现方式

**代码模式**：

```typescript
// 在生成函数开始时检查并重置 URL
const currentUrl = new URL(window.location.href);
const paramsToReset = ["gen_video_id", "ref_image_url", "character_uuid"];
let hasParamsToReset = false;
paramsToReset.forEach((param) => {
  if (currentUrl.searchParams.has(param)) {
    currentUrl.searchParams.delete(param);
    hasParamsToReset = true;
  }
});
if (hasParamsToReset) {
  console.log("Resetting URL search params after generate button click");
  router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
}
```

**应用位置**：

1. **AnimeGenerator**: `handleGenerate` 函数
2. **VideoGenerator**: `submit` 函数
3. **ActionFigureTool**: `handleGenerate` 函数

#### 优势

1. **用户体验友好**：
   - 用户点击生成后，URL 立即清理
   - 避免用户刷新页面时的意外行为
   - 不影响生成结果的展示

2. **技术安全性**：
   - 防止重复数据加载
   - 避免参数状态污染
   - 保持组件状态一致性

3. **代码复用性**：
   - 所有生成器使用相同的重置模式
   - 统一的参数列表管理
   - 一致的错误处理机制

## 8. 变更历史

- 2025-11-07 初始文档创建 - 记录四大生成器 search params 实现
- 2025-11-07 优化更新 - 统一 ref_image_url 命名，添加生成后 URL 重置机制
- 2025-11-07 统一命名 - 将所有 `ref_image_uuid` 修改为 `ref_image_url`，保持参数命名一致性
- 2025-11-08 新增 gen_type 验证 - 添加 gen_type 类型验证机制，防止在错误的生成器中复用参数
  - 新建共享验证工具 `src/lib/generation-type-validator.ts`
  - 在三个生成器组件中实现 gen_type 验证逻辑
  - 更新文档说明验证规范和实现细节
- 2025-11-27 完善 character_uuid 角色代入功能 - 修复三大生成器页面的 character_uuid 参数传递和组件实现
  - 修复 ai-anime-generator、ai-action-figure-generator、ai-sticker-generator 页面，传递 characterUuid 参数
  - 更新 AnimeGenerator、ActionFigureTool、StickerTool 组件接口和实现

  **实现方案差异**：
  - **AnimeGenerator**：使用 useEffect + selectCharacter 自动选中角色，登录态下执行并清理 URL 参数
  - **ActionFigureTool/StickerTool**：使用 selectCharacter 自动选中角色，通过 CharacterSelector 组件处理，请求时自动带上立绘图片

  - 添加 characterUuid 的 useEffect 处理逻辑，包括登录状态检查和参数验证
  - 完善文档，添加 ai-sticker-generator 的 character_uuid 参数说明，并说明三种不同的实现方案

- 2025-12-02 完善贴纸生成器 Search Params 文档 - 详细记录贴纸生成器对 gen_image_id 和 character_uuid 参数的实现
  - **gen_image_id**：使用 describe&ref 模式，加载复用数据（模板、用户描述、模型）并在右侧展示图片
  - **character_uuid**：使用 oc 模式，自动选中对应 OC 并切换到 oc_character 输入模式
  - 更新实现细节说明，包括复用流程、自动选中流程和与手办生成器的差异
  - 强调 StickerTool 完全复用 ActionFigureTool 的实现模式，仅 gen_type 不同
- 2026-02-06 修复 ai-anime-generator 登录后 character_uuid 生效问题
  - 根因：未登录时提前标记 `processedParamsRef.current.characterUuid`，导致登录后自动选中被跳过
  - 修复：仅在登录态执行 `selectCharacter(characterUuid)` 后再标记为已处理
- 2026-02-13 修复 ai-anime-generator `ref_image_url` 参数兼容性
  - 兼容 `ref_image_url` 的 URL 编码值（自动 decode 并校验）
  - 当前模型不支持参考图时，自动切换到支持参考图的模型，避免参考图被清空
  - 对齐 ai-anime-video-generator 的参数提取模式，兼容 `image_url` 参数名
