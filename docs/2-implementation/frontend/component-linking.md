Related: FIX-character-linking

# LinkingComponent 组件文档

## 概述

LinkingComponent 是一个联动链接组件，用于在创作结果预览和详情页中快速跳转到相关创作功能。组件支持两种按钮类型（单按钮/下拉列表）和两种布局方向（水平/垂直），并在移动端自动适配触控操作。

## 组件结构

### 核心文件

- **类型定义**: `src/types/components/linking.ts`
  - MainButton: 主按钮类型（single/list）
  - LinkButton: 子按钮项类型
  - LinkingComponentProps: 组件属性
  - SceneConfig: 场景配置类型

- **组件实现**: `src/components/ui/linking.tsx`
  - LinkingComponent: 主组件
  - linkingVariants: 布局变体
  - MainButtonItem: 单个按钮项渲染

- **场景配置**: `src/components/ui/linking.config.ts`
  - animeGenerationConfig: 动漫生成场景
  - ocMakerConfig: OC创作场景
  - characterDetailConfig: 角色详情场景
  - createLinkingConfig: 通用配置创建
  - sceneConfigMap: 场景映射

## 类型系统

### 按钮类型

```typescript
// 单个按钮或列表触发器
type MainButton = {
  label: string; // 按钮文本
  type: "single" | "list"; // 按钮类型
  href?: string; // 单按钮跳转链接
  listItems?: LinkButton[]; // 列表项
  variant?: ButtonVariant; // 按钮样式
  className?: string; // 自定义类名
  lucideIcon?: LucideIcon; // Lucide 图标(用于 icon-only 模式)
  tooltip?: string; // Tooltip 提示文字(用于 icon-only 模式)
};

// 子按钮项
type LinkButton = {
  label: string; // 文本
  href: string; // 跳转链接
  variant?: ButtonVariant; // 样式
  icon?: ReactNode; // 可选图标
  className?: string; // 自定义类名
};

// 组件属性
type LinkingComponentProps = {
  orientation: "horizontal" | "vertical"; // 布局方向
  buttons: MainButton[]; // 按钮配置
  displayMode?: "default" | "icon-only"; // 显示模式
  className?: string; // 自定义类名
};
```

### 场景类型

```typescript
// 支持四种预定义场景
type SceneConfig = {
  name:
    | "anime-generation"
    | "oc-maker"
    | "character-detail"
    | "community-detail";
  orientation: "horizontal" | "vertical";
  buttons: MainButton[];
};
```

## 布局与样式

### 布局变体

```typescript
const linkingVariants = cva(
  "linking-component flex", // 显式启用 flex
  {
    variants: {
      orientation: {
        horizontal: "flex-row items-center gap-1.5",
        vertical: "flex-col gap-1.5",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  },
);
```

### 响应式设计

- **桌面端** (`>= 768px`): 使用传入的 orientation 参数
- **移动端** (`< 768px`): 强制切换为 `vertical`
- 切换逻辑通过 `useMemo` 在客户端执行

```typescript
const effectiveOrientation = React.useMemo(() => {
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    return "vertical";
  }
  return orientation;
}, [orientation]);
```

## 使用场景

### 1. 动漫生成结果 (anime-generation)

**位置**: `src/components/anime-generator/ImagePreviewDialog.tsx:425`

**配置**:

```typescript
animeGenerationConfig(imageUuid: string, imageUrl?: string) => ({
  name: 'anime-generation',
  orientation: 'horizontal',
  buttons: [
    {
      label: 'Animate It',
      type: 'single',
      href: `/ai-anime-video-generator?ref_image_url=${imageUuid}`,
      variant: 'default',
    },
    ...(imageUrl ? [{
      label: 'Reference to Image',
      type: 'single',
      href: `/ai-anime-generator?ref_image_url=${encodeURIComponent(imageUrl)}`,
      variant: 'default',
    }] : []),
  ],
})
```

**UI表现**: 两个按钮（"Animate It" + "Reference to Image"），水平排列
**使用场景**: 图片预览弹窗左下角

- "Animate It": 快速将静态图转为动态视频
- "Reference to Image": 将当前图片作为参考图，跳转到动漫生成页面进行新创作

**参数说明**:

- `imageUuid`: 必需，图片的UUID标识符，用于视频生成引用
- `imageUrl`: 可选，图片的URL地址，用于作为动漫生成的参考图

### 2. OC创作成功 (oc-maker)

**位置**: `src/components/oc-maker/CharacterSuccessDialog.tsx:264`

**配置来源**: `src/components/ui/linking.config.ts:41` - `ocMakerConfig()`

**按钮组合**: Animate It + Role in Video + Chat + Studo Tools下拉 (4个按钮)

**显示模式**: `icon-only` - 使用纯图标模式

**使用场景**: 角色创建成功弹窗右侧，垂直排列

**图标配置**:

- Animate It: `Wand2` 图标，tooltip: "Animate your character"
- Role in Video: `Video` 图标，tooltip: "Create video with your character"
- Chat: `MessageCircle` 图标，tooltip: "Chat with your character"
- Studo Tools: `AppWindow` 图标，tooltip: "More character apps"

**使用示例**:

```tsx
<LinkingComponent {...ocMakerConfig(character.uuid)} displayMode="icon-only" />
```

### 3. 角色详情页 (character-detail)

**位置**: `src/components/character-detail/ActionBar.tsx:308`

**配置来源**: `src/components/ui/linking.config.ts:72` - `characterDetailConfig()`

**按钮组合**: Make Anime Art + Role in Video + Chat + Studo Tools下拉 (4个按钮)

**使用场景**: 角色详情页操作栏，仅所有者可见

### 4. 社区详情弹窗 (community-detail)

**状态**: 已移除 linking 组件

**说明**:

- **Image 类型**: 不再显示 linking 组件
- **OC 类型**: Chat 按钮已集成到 `src/components/community/detail/OcDetailContent.tsx` 中的操作按钮区域

**当前实现**:

- Chat 按钮位于 OC 详情弹窗的 Remix 按钮右侧
- 使用 `t.chatButton` 国际化配置
- 主题配色：使用 `outline` 变体，与 Detail 按钮保持一致

## 交互特性

### 下拉列表 (Popover)

- **触发方式**: 点击主按钮
- **位置策略**:
  - 水平布局: `side="bottom"`, 下拉显示
  - 垂直布局: `side="right"`, 右拉显示
- **对齐方式**: `align="start"`, 左对齐触发器
- **关闭行为**: 点击外部区域自动关闭

### 键盘导航

- **Enter/Space**: 展开/收起下拉
- **Escape**: 关闭当前展开项
- **ArrowDown**: 聚焦到下拉列表第一个项

```typescript
const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
  switch (event.key) {
    case "Enter":
    case " ":
      event.preventDefault();
      handleToggle(index);
      break;
    case "Escape":
      setExpandedIndex(null);
      break;
    case "ArrowDown":
      if (expandedIndex === index) {
        event.preventDefault();
        // 聚焦到第一个列表项
        const firstItem = document.querySelector(
          `[data-linking-list="${index}"] [data-linking-item]:first-of-type`,
        );
        firstItem?.focus();
      }
      break;
  }
};
```

### 无障碍支持

- **ARIA 属性**: `aria-expanded`, `aria-haspopup`
- **焦点管理**:
  - 展开时聚焦到下拉内容
  - 关闭时回到触发按钮
- **语义化标签**: 使用 `<a>` 标签保证链接语义

## 样式规范

### 尺寸规范

- **按钮高度**: `h-7` (28px)
- **最小宽度**: `min-w-[90px]`
- **内边距**: `px-2.5 py-1.5` (10px 6px)
- **字体大小**: `text-xs`

### 主题适配

- **无硬编码颜色**: 完全依赖主题系统
- **边框样式**: `border-border/60`
- **背景**: `bg-card`
- **阴影**: `shadow-md`

### 间距系统

- **水平布局**: 按钮间距 `gap-1.5` (6px)
- **垂直布局**: 按钮间距 `gap-1.5` (6px)
- **列表项内边距**: `px-2.5 py-1.5`

## 样式与布局修复历史

### 2025-11-04 FIX-character-linking

**问题**: 角色详情页 Linking 按钮"排列混乱、视觉拥挤"

**解决方案**:

1. 容器启用 `flex` 并通过变体控制 `horizontal/vertical` 方向，使方向类真正生效
2. 移除组件外层多余的边框与内边距，避免与父级 ActionBar 双重边框叠加
3. 列表触发按钮（Popover Trigger）不再在纵向模式下强制 `w-full`，避免单个按钮异常横向拉伸
4. 角色详情页场景配置改为 `horizontal`，移动端在组件内部通过 `window.innerWidth < 768` 自动切换为纵向，保证触控面积与可读性

**受影响文件**:

- `src/components/ui/linking.tsx:42` - linkingVariants 变体定义
- `src/components/ui/linking.config.ts:1` - 场景配置文件

**可视与交互要点**:

- 桌面端：按钮横向排列、间距统一，Studo Tools 下拉正常贴靠触发器
- 移动端：自动纵向堆叠，保证单手操作与易点按
- 无颜色硬编码，沿用 Button 主题配色与状态样式

## 当前实现状态

### 场景配置

支持 **3 种场景**：

1. **anime-generation** (`src/components/ui/linking.config.ts:16`)
   - 按钮：Animate It + Reference to Image (1-2个，imageUrl存在时显示第二个)
   - 布局：horizontal
   - 参数：需要传递 `imageUuid` 和可选的 `imageUrl`

2. **oc-maker** (`src/components/ui/linking.config.ts:40`)
   - 按钮：Animate It + Role in Video + Chat + Studo Tools下拉 (4个)
   - 布局：vertical

3. **character-detail** (`src/components/ui/linking.config.ts:78`)
   - 按钮：Make Anime Art + Role in Video + Chat + Studo Tools下拉 (4个)
   - 布局：horizontal

### 核心功能

- **Chat 按钮**: 跳转到 `/chat/[uuid]`
- **社区弹窗**: 已移除 linking 组件，Chat 按钮集成到 OC 详情内容组件
- **配置差异**:
  - oc-maker 和 character-detail 场景保持 4 个按钮的完整功能
  - community-detail 场景不再使用 linking 组件
  - OC 详情弹窗中的 Chat 按钮使用 `outline` 主题变体

### 工具函数

- **createLinkingConfig** (`src/components/ui/linking.config.ts:156`): 通用配置创建，支持动态参数
- **getAvailableScenes** (`src/components/ui/linking.config.ts:179`): 获取所有场景列表
- **sceneConfigMap** (`src/components/ui/linking.config.ts:187`): 场景配置映射表

## 扩展说明

### 添加新场景

1. **类型定义** (`src/types/components/linking.ts`):
   - 在 `SceneConfig['name']` 中添加新场景名

2. **场景配置** (`src/components/ui/linking.config.ts`):
   - 创建新配置函数
   - 导出到 `getAvailableScenes()`
   - 添加到 `sceneConfigMap`

3. **使用组件**:

   ```typescript
   import { LinkingComponent } from "@/components/ui/linking";
   import { createLinkingConfig } from "@/components/ui/linking.config";

   <LinkingComponent {...createLinkingConfig('new-scene', { param: 'value' })} />
   ```

### 通用配置创建

**文件**: `src/components/ui/linking.config.ts:156` - `createLinkingConfig()`

**支持场景**: anime-generation, oc-maker, character-detail

**说明**: community-detail 场景已不再使用 linking 组件

## 变更历史

### 2025-11-07 FEAT-use-as-reference

**更新内容**:

- 在 `anime-generation` 场景中新增 "Reference to Image" 按钮
- 允许用户将当前图片作为参考图，跳转到 `/ai-anime-generator?ref_image_url={image_url}` 进行新创作
- 更新了 `animeGenerationConfig` 函数以支持可选的 `imageUrl` 参数
- 当提供 `imageUrl` 时，按钮数组会动态扩展为 2 个按钮；否则只显示 1 个按钮
- 更新了 `createLinkingConfig` 和 `sceneConfigMap` 以支持新参数
- 更新了 `ImagePreviewDialog` 中的使用示例，传递 `imageUrl` 参数
- 更新了 `linking.example.tsx` 中的示例代码以展示新功能

**受影响文件**:

- `src/components/ui/linking.config.ts:16-38` - animeGenerationConfig 函数
- `src/components/ui/linking.config.ts:146-170` - createLinkingConfig 函数
- `src/components/ui/linking.config.ts:180-195` - sceneConfigMap
- `src/components/anime-generator/ImagePreviewDialog.tsx:425` - 使用位置
- `src/components/ui/linking.example.tsx` - 示例代码

**技术要点**:

- 使用展开运算符 `...(imageUrl ? [...] : [])` 实现条件渲染
- 使用 `encodeURIComponent()` 确保 URL 参数正确编码
- 保持向后兼容：`imageUrl` 为可选参数，不传递时不影响现有功能

### 2025-11-09 FEAT-linking-icon-mode

**更新内容**:

1. **新增 icon-only 显示模式**
   - 添加 `displayMode` 属性支持 `'default'` 和 `'icon-only'` 两种模式
   - icon-only 模式下渲染纯图标按钮，透明背景，无边框
   - 支持 Tooltip 提示，提升用户体验

2. **修复文字颜色问题**
   - 移除所有硬编码的 `text-white` 样式
   - 下拉列表项使用主题颜色 `text-popover-foreground`
   - hover 状态使用 `bg-accent` 和 `text-accent-foreground`
   - 确保在浅色和暗色模式下都清晰可读

3. **集成 Lucide 图标**
   - 为 ocMakerConfig 添加 Lucide 图标配置
   - Animate It: `Wand2` 图标
   - Role in Video: `Video` 图标
   - Chat: `MessageCircle` 图标
   - Studo Tools: `AppWindow` 图标

4. **CharacterSuccessDialog 应用 icon-only 模式**
   - 在角色创建成功弹窗中使用纯图标模式
   - 提供更简洁的视觉体验

**受影响文件**:

- `src/types/components/linking.ts` - 添加 `displayMode`、`lucideIcon`、`tooltip` 类型
- `src/components/ui/linking.tsx` - 实现 icon-only 模式渲染逻辑
- `src/components/ui/linking.config.ts` - 为 ocMakerConfig 添加图标和 tooltip
- `src/components/oc-maker/CharacterSuccessDialog.tsx:264` - 应用 icon-only 模式

**样式规范 (icon-only 模式)**:

- 按钮样式: `variant="ghost"`, `size="icon"`
- 尺寸: `h-10 w-10 rounded-full`
- 颜色: `bg-transparent hover:bg-accent`
- 图标颜色: `text-muted-foreground hover:text-primary`
- 图标尺寸: `h-5 w-5`
- 容器间距: `gap-2` (比默认模式更宽松)
- 无边框和卡片背景

**技术要点**:

- 使用 `TooltipProvider` 包裹 icon-only 模式组件
- 下拉列表功能在 icon-only 模式下仍然保留
- 使用 `sr-only` 类为图标按钮添加无障碍文本
- 完全依赖主题系统，无颜色硬编码
