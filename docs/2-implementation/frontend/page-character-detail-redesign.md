# Page: Character Detail 详情页重构 (page-character-detail-redesign)

**Related**: FEAT-OC-REBUILD | [feature-oc-rebuild.md](../features/feature-oc-rebuild.md)

## 概览

角色详情页支持 **查看模式** 和 **编辑模式** 无缝切换（URL Query 控制），采用单 Tab 区域导航，内容区左右分栏展示（左侧主视觉、右侧信息区），响应式设计在移动端自动切换为上下布局。

│ Tab 1 | Tab 2 | Tab 3 | ... │ ← 横向 Tab 导航
│─────────────────────────────────────────────│
│ ┌───────────────┬─────────────────────────┐ │
│ │ 主视觉展示区 │ 信息详情区 │ │
│ │（如：立绘堆） │（如：特征/属性） │ │
│ └───────────────┴─────────────────────────┘ │

## 页面结构

- 查看模式 (`/characters/{uuid}`)
- 编辑模式 (`/characters/{uuid}?mode=edit`)
- 创建模式 (`/characters/{uuid}?mode=create`)

### 创建模式 (Create Mode) UI 布局

用于首次创建角色，通过 5 步引导流程完成核心信息录入（无 Settings 步骤，公开性自动设置）。

```
┌────────────────────────────────────────────────────────────┐
│ [ ● 进度条: 1.基本信息 -> 2.视觉特征 -> 3.故事 -> 4.性格 -> 5.技能 ] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                      中间表单/展示区域                      │
│      (Step 1: Form | Step 2: Generator | Step 3: Story)     │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ [ Previous ]                                [ Next / Save ] │
└────────────────────────────────────────────────────────────┘
```

#### 分步内容设计

1. **Step 1: 基本信息 (Basic Info)**
   - 字段：姓名、性别、种族、年龄、角色定位 (Role)、简介、世界观分配。
   - 复用：`worldselector`。
2. **Step 2: 视觉特征与生成 (Visuals)**
   - 交互：提供视觉特征表单（发色、瞳色、服饰等）。
   - **随机骰子**：点击骰子图标，前端从 `appearance-presets.json` 随机抽取特征填充。
- 生成：集成 Full-body Key Art/头像生成按钮与预览区。
3. **Step 3: 背景故事与小传 (Story)**
   - 交互：基于 Step 1&2 信息，提供“AI 扩写”按钮。
   - 字段：一句话小传、背景故事、背景分段事件（title/content）。
4. **Step 4: 性格 (Personality)**
   - 字段：性格标签、扩展属性、语录。
5. **Step 5: 技能 (Skills)**
   - 字段：能力雷达、技能卡片。
6. **完成**
   - 动作：点击“完成”保存并跳转至**查看模式**。
   - 公开性：`visibility_level` 按订阅状态自动设置（订阅用户为 `private`，非订阅为 `public`），不提供 Settings 步骤。

## 核心组件

### 1. CharacterHeader 组件

- **功能**：头像、基本信息、世界观、社交操作
- **编辑模式**：头像点击弹窗（重新生成/上传/裁剪）
  - 头像上传：`type=user_upload`，`sub_type=oc-avatar`（需生成 UUID）
- **世界观展示**：缩略图 + 名称，点击跳转至世界观页面
- **实现路径**：`src/components/character-detail/CharacterHeader.tsx`

### 2. CharacterCreationWizard 组件

- **功能**：管理创建模式的步骤切换、进度展示、数据暂存。
- **实现路径**：`src/components/character-detail/CharacterCreationWizard.tsx`

### 2. BackgroundCustomizer 组件

- **功能**：卡片主题色与背景定制
- **主题色（Theme Color）**：颜色选择器，影响卡片内部高亮颜色（如进度条、按钮 hover、文字高亮）和卡片边缘细线颜色。
- **背景定制**：不支持纯色背景，默认空白或使用世界观预设。
  - **AI 生成**：输入场景描述 → 调用图片生成 API（16:9 比例）。
  - **上传/画廊**：复用 `ReferenceImageUpload` 组件，支持上传图片或从画廊选择。
    - 背景图支持 URL 或 UUID
- **实现路径**：`src/components/character-detail/BackgroundCustomizer.tsx`

### 3. ModuleDisplayTabs 组件

- **功能**：单 Tab 区域横向导航，受 **主题色** 影响高亮显示。内容区采用左右分栏布局。
- **Tab 1: 视觉与外观 (Visuals & Appearance)**
  - **左侧（主视觉区）**：
    - **图片堆叠效果**：展示 Full-body Key Art、设定图或作品集（最多 10 张）。
    - **交互**：点击图片可查看大图预览。
    - **展示白名单**：作品集仅展示 `scene=characterDetail` 且白名单允许的 gen_type。
    - **编辑模式**：
      - 支持自由调整顺序（拖拽）、删除。
      - 图片堆最下方显示虚线卡片与“+”号用于新增。
      - **新增来源**：直接上传、从“我的作品集 (My Artworks)”选择、生成 Full-body Key Art、生成指定模板图片（基于配置化的生成类型与尺寸）。
        - **设定图模板**：横图比例，Prompt 自动要求生成该 OC 的核心设定解析与视觉备注。
        - **上传新增**：不再区分 portrait，统一 `type=user_upload` + `sub_type=oc-gallery`；上传后可在列表中选择任意图片为 primary（需生成 UUID）。
      - **生成功能**：生成 Full-body Key Art 时可选风格、设置是否同步更新角色头像。
      - **主立绘设置**：
        - primary 图片右上角展示 **Full-body Key Art** badge。
        - Badge tooltip（i18n）：`This image is the primary Full-body Key Art of this OC. Artworks will reference it by default. Click the settings icon to change.`
        - 点击设置图标进入列表，单选设置 primary（任意图片均可）。
        - 未选择时默认使用排序第一张图片。
        - 删除 primary 前弹窗提示（i18n）：`This image is the primary Full-body Key Art for this OC. After deletion, artwork generation will no longer reference it. We will set another image as primary by default.`
    - **Badge 标识**：每张图带有对应标签，如“Full-body Key Art”、“User Upload”、“[模板类型名称]”等。
  - **右侧（信息区）**：外观特征卡片，展示发色、瞳色、配饰、服饰等详细视觉特征。
- **Tab 2: 背景故事 (Story)**
  - **左侧**：总篇背景故事（完整长文本展示）。
  - **右侧**：分段小传/背景片段，支持按章节或主题切分。
- **Tab 3: 性格特征 (Personality)**
  - **全幅或分栏**：展示性格标签云 (Tag Cloud) 与核心性格描述。
- **Tab 4: 能力属性 (Attributes)**
  - **全幅或分栏**：展示自定义的 Key-Value 属性表（如：力量: A, 敏捷: S 等）。
- **移动端**：自动切换为上下布局，顶部 Tab 导航支持左右滑动。
- **实现路径**：`src/components/character-detail/ModuleDisplayTabs.tsx`

### 图片字段解析规则

- **使用场景**：
  - `character.modules.art.gallery[x].url`
  - `character.modules.background.background_segments[x].image_url`
- **字段约定**：
  - **画廊**：必须为 `image_uuid`（OC 详情页画廊图片/视频需要 UUID 追踪）
  - **背景分段**：支持 `http/https` URL 或 `image_uuid`
- **读取逻辑**：
  - `image_uuid` -> `GET /api/generation/image-resolve/[uuid]`（`size=auto`）
  - 优先使用 `resolved_url`，缺失时回退 `original_url`
- **说明**：
  - 不使用 `GET /api/generation/image/[uuid]`（该接口含复杂关联）
  - 详见 `docs/2-implementation/api/generation.md`

#### 伪代码（解析逻辑）

```ts
function resolveCharacterImage(input: string, size = "auto") {
  if (isHttpUrl(input)) return { resolvedUrl: input, originalUrl: input };

  const { data } = await fetchJson(
    `/api/generation/image-resolve/${input}?size=${size}`,
  );
  return {
    resolvedUrl: data.resolved_url || data.original_url,
    originalUrl: data.original_url,
  };
}
```

### 文案与 i18n（主立绘）

- 归档位置：`src/i18n/pages/character-detail/en.json`
- 建议 key：
  - `gallery.primary_badge_tooltip`
  - `gallery.primary_delete_confirm`

### 4. worldThemeProvider 组件

- **功能**：注入世界观主题样式与角色自定义主题色（CSS Variables）
- **逻辑**：
  1. 基础样式由 `character.world_uuid` 决定。
  2. `character.modules.appearance.theme_color` 覆盖默认高亮色。
  3. 注入 `--character-theme-color` 等 CSS 变量。
- **实现路径**：`src/contexts/worldContext.tsx`、`src/components/character-detail/worldTheme.tsx`

### 5. ShareCardDialog 组件

- **功能**：生成并展示分享卡片
- **实现路径**：`src/components/character-detail/ShareCardDialog.tsx`
- **详细设计**：参考 [component-share-card.md](./component-share-card.md)

### 6. TagEditor 组件

- **功能**：Tag 输入与管理（Badge 形式）
- **实现路径**：`src/components/character-detail/TagEditor.tsx`
- **详细设计**：参考 [component-tag-editor.md](./component-tag-editor.md)

### 7. worldselector 组件

- **功能**：世界观选择下拉框
- **实现路径**：`src/components/character-detail/worldselector.tsx`
- **详细设计**：参考 [component-world-selector.md](./component-world-selector.md)

## 变更历史

- 2026-01-30 FEAT-OC-REBUILD 对齐 Create Mode 步骤与字段（影响：前端页面文档）

## 交互流程

### 场景 1：查看模式 → 编辑模式切换

```typescript
// 用户点击"编辑"按钮
router.push(`/characters/${uuid}?mode=edit`);

// 页面检测 URL Query
const searchParams = useSearchParams();
const isEditMode = searchParams.get('mode') === 'edit';

// 如果是 owner，显示编辑 UI
if (isEditMode && isOwner) {
  return <CharacterEditView />;
} else {
  return <CharacterViewOnly />;
}
```

### 场景 2：编辑模式下更新角色

```typescript
// 用户修改基本信息（名称、世界观、Tags）
await fetch(`/api/oc-maker/characters/${uuid}`, {
  method: 'PUT',
  body: JSON.stringify({
    name: "新名称",
    world_uuid: 3,
    tags: ["cyberpunk", "hacker"],
    modules: { appearance: {...}, personality: {...} }
  })
});

// 保存成功后跳转回查看模式
router.push(`/characters/${uuid}`);
```

### 场景 3：重新生成 Full-body Key Art

```typescript
// 用户点击 Full-body Key Art 区域 → 弹窗
<ProfileRegenerateDialog>
  <input placeholder="修改描述（如：添加机械臂）" />
  <select>选择风格</select>
  <checkbox>同步生成头像（+10 MC）</checkbox>
  <button onClick={handleRegenerate}>生成</button>
</ProfileRegenerateDialog>

// 调用 API
await fetch('/api/oc-maker/characters/generate-image', {
  method: 'POST',
  body: JSON.stringify({
    character_uuid: uuid,
    modifications: "添加机械臂",
    art_style: "anime",
    sync_avatar: true  // 同步生成头像
  })
});

// 轮询生成状态
pollGenerationStatus(generation_uuid);
```

### 场景 4：分配世界观

```typescript
// 用户在编辑模式下选择世界观
<worldselector
  value={character.world_uuid}
  onChange={(worldId) => handleUpdateworld(worldId)}
/>

// 更新调用
await fetch(`/api/oc-maker/characters/${uuid}`, {
  method: 'PUT',
  body: JSON.stringify({ world_uuid: worldId })
});
```

## 状态管理

### CharacterDetailContext

```typescript
// src/contexts/CharacterDetailContext.tsx
interface CharacterDetailState {
  character: Character;
  isEditMode: boolean;
  isOwner: boolean;
  isLoading: boolean;
  worldConfig: worldConfig | null;
  updateCharacter: (updates: Partial<Character>) => Promise<void>;
  regenerateProfile: (options: RegenerateOptions) => Promise<void>;
  regenerateAvatar: () => Promise<void>;
}
```

## 响应式设计

| 屏幕尺寸                | 布局调整              |
| ----------------------- | --------------------- |
| > 1024px (Desktop)      | Tab区域自适应宽度显示 |
| 768px - 1024px (Tablet) | Tab区域自适应宽度显示 |
| < 768px (Mobile)        | tab内部上下布局       |

### 移动端 Tab 滑动优化

```css
/* src/components/character-detail/ModuleDisplayTabs.module.css */
.tabs-container {
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

.tabs-container::after {
  content: "";
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to right, transparent, rgba(0, 0, 0, 0.1));
  pointer-events: none;
  opacity: var(--show-scroll-indicator, 1);
}

.tab {
  scroll-snap-align: start;
  flex-shrink: 0;
}
```

```typescript
// 使用 IntersectionObserver 检测最后一个 Tab 是否可见
useEffect(() => {
  const observer = new IntersectionObserver(([entry]) => {
    document.documentElement.style.setProperty(
      "--show-scroll-indicator",
      entry.isIntersecting ? "0" : "1",
    );
  });

  const lastTab = tabsRef.current?.lastElementChild;
  if (lastTab) observer.observe(lastTab);

  return () => observer.disconnect();
}, []);
```

## 加载 & 错误状态

### 加载中 (Loading)

```
[骨架屏]：头像圆圈 + 灰色文本占位 + 灰色卡片
```

### 角色不存在

```
显示 404 页面：
"角色不存在或已删除"
[返回 OC Maker]
```

### 权限不足

```
显示 403 页面：
"这是一个私有角色，您没有权限查看"
[返回首页]
```

## 性能优化

1. **数据预取**：Server Component 预取角色数据、世界观配置
2. **图片懒加载**：Full-body Key Art、作品集采用 Next.js Image 组件
3. **Tab 内容延迟渲染**：非激活 Tab 内容延迟加载
4. **CSS Variables 注入**：世界观主题使用 CSS Variables，避免频繁 React 重绘

## 国际化

页面特定翻译：`src/i18n/pages/character-detail/en.json`

```json
{
  "page_title": "Character Detail - {{name}}",
  "edit_mode": "Edit Mode",
  "view_mode": "View Mode",
  "background_settings": "Background Settings",
  "world_label": "world",
  "tags_label": "Tags",
  "visibility_label": "Visibility",
  "remix_control": "Remix Control",
  "save_button": "Save",
  "cancel_button": "Cancel",
  "edit_button": "Edit",
  "tab_profile": "Profile",
  "tab_appearance": "Appearance",
  "tab_background": "Background Story",
  "tab_abilities": "Abilities",
  "regenerate_profile": "Regenerate Profile",
  "regenerate_avatar": "Regenerate Avatar",
  "upload_avatar": "Upload Avatar",
  "create_mode_title": "Create Your OC",
  "step_basic_info": "Basic Info",
  "step_visuals": "Visuals",
  "step_story": "Background Story",
  "step_settings": "Settings",
  "button_previous": "Previous",
  "button_next": "Next",
  "button_finish": "Finish & View",
  "dice_random_tooltip": "Randomize features"
}
```

## 相关文件

- 页面：`src/app/[locale]/(default)/characters/[uuid]/page.tsx`
- 组件库：`src/components/character-detail/`
- Context：`src/contexts/CharacterDetailContext.tsx`、`src/contexts/worldContext.tsx`
- API：参考 [oc-maker.md](../api/oc-maker.md)

## 变更历史

- 2026-01-08 FEAT-OC-REBUILD 初始版本
  - 编辑/查看模式平滑切换（URL Query 控制）
  - 双Tab区域展示（响应式：桌面端左右、移动端上下）
  - 世界观主题注入（CSS Variables）
  - 移动端 Tab 滑动优化（scroll-snap + IntersectionObserver）
  - 支持背景定制、Tag 编辑、分享卡片生成
- 2026-01-11 FEAT-OC-REBUILD 标签面板首个实现（CharacterTagsSection + TagEditor）
- 2026-01-19 FEAT-OC-REBUILD 详情页布局重构
  - 布局由双 Tab 改为单 Tab 横向导航 + 左右分栏内容区。
  - Tab 1 增强：支持图片堆叠、作品集管理（排序/删除/多来源新增）、Full-body Key Art 生成同步。
  - 明确 Tab 2-4 内容：背景故事（总+分）、性格特征（Tag）、能力属性（自定义 K-V）。
- 2026-01-25 FEAT-IMAGE-ASSET-UNIFY 统一图片字段解析规则（gallery/background 走 image-resolve）
- 2026-01-28 FEAT-primary-portrait 增加主立绘选择与删除回退规则（影响：交互/文案）
- 2026-01-29 FEAT-primary-portrait 主图任意选择与 UUID 约束（影响：画廊/上传/文案）
