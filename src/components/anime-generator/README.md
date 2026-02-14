# 图像上传组件优化文档

## 更新内容

### 1. 新增组件

#### ArtworkGalleryDialog (`/src/components/anime-generator/ArtworkGalleryDialog.tsx`)

用于从用户已有艺术作品中选择图片的对话框组件。

**特性：**
- 从用户的艺术作品列表中获取图片
- 支持分页浏览（每页20张）
- 支持多选（根据场景限制最大选择数量）
- 响应式网格布局（桌面端4列，平板3列，移动端2列）
- 左下角显示选中图片预览
- 右下角确认/取消按钮
- 排除 full_body、character、avatar 类型的图片

**参数：**
```typescript
interface ArtworkGalleryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedImages: string[];
  onConfirm: (imageUrls: string[]) => void;
  maxSelect?: number; // 默认5张
}
```

### 2. 组件更新

#### ReferenceImageUpload (`/src/components/anime-generator/ReferenceImageUpload.tsx`)

**新增功能：**
1. 在相机按钮旁边添加了画廊按钮（ImagesIcon）
2. 点击画廊按钮弹出 ArtworkGalleryDialog
3. 支持从已有艺术作品中选择图片
4. 使用系统级国际化配置

**按钮说明：**
- 相机图标：上传新图片（原有功能）
- 图片堆叠图标：从画廊选择（新增功能）

### 3. 国际化更新

在 `/src/i18n/messages/en.json` 中新增了 `artworkGallery` 配置：

```json
{
  "artworkGallery": {
    "title": "Select from My Artworks",
    "empty": "No artworks found. Create some artworks first!",
    "selectedCount": "{count}/{max} selected",
    "noSelection": "No images selected",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "pagination": {
      "previous": "Previous",
      "next": "Next",
      "page": "Page {page} of {total}"
    }
  }
}
```

## 使用方法

### 在 AnimeGenerator 中使用

```tsx
<ReferenceImageUpload
  value={referenceImages}
  onChange={setReferenceImages}
  disabled={isGenerating}
  pageData={pageData}
  maxImages={5} // 最多5张
/>
```

### 在 ActionFigureTool 中使用

```tsx
<ReferenceImageUpload
  value={uploadedImageUrl ? [uploadedImageUrl] : []}
  onChange={(urls) => setUploadedImageUrl(urls[0] || "")}
  disabled={rightPanelState.type === "processing"}
  pageData={pageData}
  maxImages={1} // 手办只能选择1张
/>
```

## 响应式设计

- **桌面端 (>1200px)**: 4列网格
- **平板端 (768px-1200px)**: 3列网格
- **移动端 (<768px)**: 2列网格

## 设计细节

### 对话框布局
```
┌─────────────────────────────────────┐
│ Dialog Title: Select from My Artworks │
├─────────────────────────────────────┤
│                                     │
│  [Grid of Images - Scrollable]      │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐               │
│  │▓▓│ │  │ │  │ │  │  (▓▓ = selected)│
│  └──┘ └──┘ └──┘ └──┘               │
│  ┌──┐ ┌──┘ ┌──┐ ┌──┐               │
│  │  │ │▓▓│ │  │ │  │               │
│  └──┘ └──┘ └──┘ └──┘               │
│                                     │
│  [Pagination Controls]              │
├─────────────┬───────────────────────┤
│ Preview     │  Cancel  Confirm     │
│ [0][0][0]   │  (2/5)               │
│ +1          │                       │
└─────────────┴───────────────────────┘
```

### 选择机制
- 点击图片可切换选择状态
- 已选满时，无法选择更多
- 选中的图片显示绿色勾选标记
- 显示选中数量和最大限制

### 交互反馈
- 悬停时图片边框高亮
- 点击时立即反馈选择状态
- 禁用状态下按钮灰化
- 加载时显示加载图标

## API 集成

画廊对话框使用 `/api/artworks` 端点获取用户的艺术作品：

```
GET /api/artworks?type=image&tab=mine&page={page}&limit=20
```

返回格式：
```json
{
  "success": true,
  "data": {
    "artworks": [...],
    "pagination": {
      "page": 1,
      "totalPages": 5,
      "total": 100
    }
  }
}
```

## 错误处理

- 网络错误：显示错误消息
- 认证错误：自动关闭对话框
- 空数据：显示"暂无艺术作品"提示
- 加载状态：显示加载图标

## 可扩展性

组件设计支持以下扩展：
1. 支持不同类型过滤（目前只显示图片类型）
2. 支持搜索功能（可扩展）
3. 支持自定义每页数量
4. 支持不同选择模式（单选/多选）

## 注意事项

1. 确保用户已登录才能使用画廊功能
2. 对话框会自动过滤掉 full_body、character、avatar 类型的图片
3. 最大选择数量取决于调用方传入的 maxSelect 参数
4. 选择后会自动替换当前选中的图片，而不是追加
