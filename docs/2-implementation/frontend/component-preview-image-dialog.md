图片预览窗口用于承接 AnimeGenerator 结果中「查看详情」需求，点击任意生成结果后在对话框内展示完整图片、元信息及操作区。本文档已与当前实现对齐，并补充简图说明。

## 组件位置

- UI 组件：`src/components/anime-generator/ImagePreviewDialog.tsx`
- 使用入口：`src/components/anime-generator/AnimeGenerator.tsx` 在结果图片点击后挂载该对话框

## 简图

布局简图（大屏左右分栏）：

```text
┌──────────────────────────────────────────────────────────────┐
│ Dialog Header: title                                         │
├──────────────────────────────────────────────────────────────┤
│ 左侧（三段）：                     │     右侧：信息与操作区       │
│  • 上：Badge（右对齐）             │  • Create New / Share / 可见性 │
│  • 中：图片预览（自适应）          │  • 模型/OC/风格/创建时间      │
│  • 下：快捷链接（横向）            │  • Prompt 文本/复制/下载/复用 │
│    - As Reference / To Video       │                              │
└──────────────────────────────────────────────────────────────┘
```

主要交互时序简图：

```text
用户点击结果 → 打开对话框(open=true, 传入 imageUuid)
  → useEffect 拉取 GET /api/generation/image/:uuid
    → 成功：渲染图片与信息
    → 失败：展示 pageData.image_detail.error

Visibility 切换 → PATCH /api/generation/image/:uuid{visibility_level}
  → 成功：更新本地 imageDetail.visibility_level 与 imageDetail.generation.visibility_level

复制 Prompt → navigator.clipboard → 成功/失败 toast
下载 → fetch(image_url) → blob → 保存为 anime-<uuid>.jpg
复用参数 → 调用 onReuseParameters(imageUuid) → toast(loading) → 关闭对话框
快捷链接 →
  - As Reference：跳转 `/ai-anime-generator?gen_image_id=<uuid>`
  - To Video：跳转 `/ai-anime-video-generator`
```

## 样式与布局

- 对话框宽度 `max-w-6xl`；高度限制为 `max-h-[85vh] md:max-h-[80vh]`，容器 `overflow-hidden`，内部左右区各自 `overflow-auto`，保证 14 寸笔记本等中小屏不会溢出屏幕。
- 使用 `lg:flex-row` 将内容分成左右各占 50% 的展示区；整体容器 `flex-1 min-h-0` 以确保子区域可滚动。
- 左侧为三段式区域：
  - 上：右对齐 Badge，显示当前可见性（Public/Private）
  - 中：图片预览（默认 `thumbnail_detail`，回退 `thumbnail_desktop` 或原图 `image_url`）
  - 下：横向快捷链接区，包含两个操作按钮（icon+text）：As Reference、To Video
- 右侧为信息/操作区，包含：
  - 顶部操作列：`Create New`、`ShareMenu`、`Visibility`（Public/Private 两个按钮）
  - 基础信息：模型名称、关联 OC（头像、可见性标签）、风格、创建时间（移除 Ratio、Seed 展示）
  - Prompt 区块：展示完整 prompt，支持复制、下载原图
  - 底部操作：`Reuse Parameters` 触发复用流程

## 数据流与状态

```text
openPreviewDialog(image_uuid)
  └─ set previewImageUuid + 打开对话框
      └─ useEffect => GET /api/generation/image/:uuid
           ├─ 成功：存储 ImageDetailResponse
           └─ 失败：error state 使用 image_detail.error 文案
```

- `ImageDetailResponse` 来自 `GET /api/generation/image/[uuid]`：提供图片 URLs、生成详情、关联 OC 列表（风格信息用于预览区 badge）。
- 组件内部保存 `isUpdatingVisibility`、`isReusing` 等状态，用于按钮禁用与 loading UI。
- 模型名称通过 `useAllConfigs()` 找到 `model_id` 对应配置，未命中时回退显示 `model_id`。
- Prompt ：`original_prompt`；缺失时显示空。
- Ratio、Seed：已从 UI 移除（不再展示）。
- 关闭对话框时会清理 `imageDetail` 与 `error`，防止残留状态影响下次打开。

## 交互细节

1. Create New：调用父组件的 `onCreateNew` 重置表单，同时关闭对话框。
2. Share：存在关联 OC 时渲染 `ShareMenu`（参数取第一位 OC），无 OC 时展示禁用按钮。
3. Visibility 切换：
   - 触发 `PATCH /api/generation/image/:uuid`，body `{ visibility_level }`
   - 更新成功后本地同步 `imageDetail.visibility_level` 与 `imageDetail.generation.visibility_level`，并提示 `visibility_toast.success`
4. Copy Prompt / Download：使用 `navigator.clipboard` 与 blob 下载；失败时提示 `prompt.failed` 或 `actions.download_error`。
   - 下载文件名格式：`anime-<image_uuid>.jpg`。
5. Reuse Parameters：调用 `onReuseParameters(image_uuid)` 复用参数；成功后提示 `reuse_status.loading` 并关闭对话框；异常时提示 `reuse_status.error`。

## 国际化

- 所有 UI 文本均来自页面级翻译 `pageData.image_detail`（`src/i18n/pages/anime-generator/en.json`）。
- 实际使用键位清单（需保持与实现一致）：
  - `image_detail.title`
  - `image_detail.create_new`
  - `image_detail.share`
  - `image_detail.visibility.{label, public, private, make_public, make_private}`
  - `image_detail.oc.{label, none}`
  - `image_detail.model.label`
  - `image_detail.prompt.{label, copy, copied, failed}`
  - `image_detail.actions.{download, reuse, download_error, as_reference, to_video}`
  - `image_detail.meta.{style, scene, outfit, created_at}`
  - `image_detail.visibility_toast.{success, error}`
  - `image_detail.reuse_status.{loading, error}`
  - `image_detail.empty.{title, description}`
  - `image_detail.loading`
  - `image_detail.error`

## 依赖关系

- 共享组件：
  - `ShareMenu` (`src/components/character-detail/ShareMenu.tsx`)
  - `Avatar`、`Button`、`Dialog` 等来自 ShipAny UI 体系
- API：
  - `GET /api/generation/image/:uuid` 获取详情
  - `PATCH /api/generation/image/:uuid` 更新可见性（新增）
- 父组件职责：
  - 传入 `onReuseParameters`（复用生成参数）
  - 传入 `onCreateNew`（清理生成器表单）
  - 负责在结果列表中触发 `openPreviewDialog`
- Hook：
  - `useAllConfigs()`（`src/lib/hooks/useConfigs.ts`）用于解析模型名称与默认参数

## 伪代码概览

```tsx
const ImagePreviewDialog = ({ open, generationImageUuid, pageData }) => {
  useEffect(() => {
    if (open && generationImageUuid) fetchDetail();
  }, [open, generationImageUuid]);

  return (
    <Dialog open={open}>
      <LeftPreview imageUrl />
      <RightPanel>
        <ActionRow createNew share visibilityToggle />
        <ModelSummary modelName ocAvatar />
        <MetaGrid style aspect ratio createdAt seed />
        <PromptCard copy download reuse />
      </RightPanel>
    </Dialog>
  );
};
```

变更历史：

- 2025-10-21 同步实现细节、补充简图与 i18n 键位清单
