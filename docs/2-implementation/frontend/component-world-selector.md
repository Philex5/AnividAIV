# Component: world Selector (世界观选择器)

**Related**: FEAT-WORLDS | [feature-worlds.md](../features/feature-worlds.md)

## 概览

世界观选择器是一个下拉选择组件，用于在角色编辑模式下分配世界观。支持预览世界观缩略图、主题色，并提供创建自定义世界观的快捷入口。
当 world 关闭 `allow_join` 时，非 owner 用户在选择器中不可见该 world，避免非 owner 误关联。

## 组件路径

`src/components/character-detail/worldselector.tsx`

## 组件结构

### 桌面端展示
```
┌──────────────────────────────────┐
│ 世界观: [选择世界观 ▼]           │
├──────────────────────────────────┤
│ 下拉菜单展开时:                   │
│ ┌────────────────────────────┐   │
│ │ 🔍 搜索世界观...            │   │
│ ├────────────────────────────┤   │
│ │ [预置世界观]                │   │
│ │ ○ Generic (通用)           │   │
│ │   [缩略图] 默认主题         │   │
│ │ ● Cyberpunk (赛博朋克)     │   │
│ │   [缩略图] 霓虹风格         │   │
│ │ ○ Fantasy (奇幻)           │   │
│ │   [缩略图] 魔法主题         │   │
│ ├────────────────────────────┤   │
│ │ [我的世界观]                │   │
│ │ ○ My Custom World          │   │
│ │   [缩略图] 自定义           │   │
│ ├────────────────────────────┤   │
│ │ ➕ 创建新世界观             │   │
│ └────────────────────────────┘   │
└──────────────────────────────────┘
```

### 移动端展示
```
┌────────────────────────────┐
│ 世界观                      │
│ [选择世界观 ▼]              │
│ (点击打开 Bottom Sheet)     │
└────────────────────────────┘

Bottom Sheet 展开:
┌────────────────────────────┐
│ ──                          │
│ 选择世界观                  │
│ [🔍 搜索]                   │
│                             │
│ [预置世界观]                │
│ ● Cyberpunk                │
│   [缩略图]                  │
│                             │
│ [我的世界观]                │
│ ○ Custom World             │
│   [缩略图]                  │
│                             │
│ [➕ 创建新世界观]           │
└────────────────────────────┘
```

## Props API

```typescript
interface worldselectorProps {
  value?: number | null;                     // 当前选中的世界观 ID
  onChange: (worldId: number | null) => void; // 选择变更回调
  disabled?: boolean;                        // 是否禁用（默认 false）
  placeholder?: string;                      // 占位文本（默认 "选择世界观"）
  showCreateButton?: boolean;                // 是否显示创建按钮（默认 true）
  creatorMode?: boolean;                     // 创作者模式（仅显示自己的自定义世界观）
  excludeIds?: number[];                     // 排除的世界观 ID（可选）
}
```

## 使用示例

```typescript
// 在 CharacterEditView 中使用
import { worldselector } from '@/components/character-detail/worldselector';

function CharacterEditView({ character }: { character: Character }) {
  const [worldId, setworldId] = useState(character.world_uuid);

  const handleworldChange = async (newworldId: number | null) => {
    setworldId(newworldId);

    // 更新角色
    await fetch(`/api/oc-maker/characters/${character.uuid}`, {
      method: 'PUT',
      body: JSON.stringify({ world_uuid: newworldId })
    });
  };

  return (
    <div>
      <worldselector
        value={worldId}
        onChange={handleworldChange}
      />
    </div>
  );
}
```

## 内部状态管理

```typescript
// src/components/character-detail/worldselector.tsx
import { useState, useEffect } from 'react';

function worldselector({ value, onChange, ...props }: worldselectorProps) {
  const [worlds, setworlds] = useState<world[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // 加载世界观列表
  useEffect(() => {
    async function loadworlds() {
      const response = await fetch('/api/worlds');
      const data = await response.json();
      setworlds(data.worlds);
      setIsLoading(false);
    }
    loadworlds();
  }, []);

  // 筛选世界观（预置 + 用户自定义）
  // 非 owner 且 allow_join = false 的 world 需要在前端隐藏（后端列表过滤兜底）
  const visibleworlds = worlds.filter(w => w.allow_join !== false || w.creator_uuid === currentUserUuid);
  const presetworlds = visibleworlds.filter(w => w.is_preset);
  const customworlds = visibleworlds.filter(w => !w.is_preset);

  // 搜索过滤
  const filteredPresets = searchQuery
    ? presetworlds.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : presetworlds;

  const filteredCustoms = searchQuery
    ? customworlds.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : customworlds;

  return (
    <Select value={value?.toString()} onValueChange={(v) => onChange(Number(v) || null)}>
      {/* 触发器 */}
      <SelectTrigger>
        <SelectValue placeholder={props.placeholder || "选择世界观"} />
      </SelectTrigger>

      {/* 下拉内容 */}
      <SelectContent>
        {/* 搜索框 */}
        <div className="p-2">
          <Input
            placeholder="搜索世界观..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* 预置世界观 */}
        <SelectGroup>
          <SelectLabel>预置世界观</SelectLabel>
          {filteredPresets.map(world => (
            <SelectItem key={world.id} value={world.id.toString()}>
              <worldOption world={world} />
            </SelectItem>
          ))}
        </SelectGroup>

        {/* 自定义世界观 */}
        {filteredCustoms.length > 0 && (
          <SelectGroup>
            <SelectLabel>我的世界观</SelectLabel>
            {filteredCustoms.map(world => (
              <SelectItem key={world.id} value={world.id.toString()}>
                <worldOption world={world} />
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {/* 创建新世界观按钮 */}
        {props.showCreateButton && (
          <div className="p-2 border-t">
            <Button variant="ghost" className="w-full" onClick={handleCreateworld}>
              ➕ 创建新世界观
            </Button>
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
```

## 子组件：worldOption

```typescript
// 世界观选项组件（包含缩略图 + 名称 + 主题色指示）
function worldOption({ world }: { world: world }) {
  return (
    <div className="flex items-center gap-2">
      {/* 缩略图 */}
      <div
        className="w-8 h-8 rounded bg-cover bg-center"
        style={{
          backgroundImage: `url(${world.cover_image_url})`,
          backgroundColor: world.config?.theme_color || '#ccc'
        }}
      />

      {/* 名称 + 描述 */}
      <div className="flex-1">
        <div className="font-medium">{world.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {world.description}
        </div>
      </div>

      {/* 主题色指示条 */}
      <div
        className="w-1 h-8 rounded"
        style={{ backgroundColor: world.config?.theme_color }}
      />
    </div>
  );
}
```

## 交互流程

### 场景 1：选择世界观

```typescript
// 用户点击选择 "Cyberpunk"
1. 触发 onChange(3)  // world_uuid = 3
2. 父组件调用 API 更新角色
3. 世界观主题生效（通过 worldThemeProvider 注入 CSS Variables）
```

### 场景 2：清除世界观

```typescript
// 用户点击 "清除选择" 或选择 null
1. 触发 onChange(null)
2. 角色恢复为无世界观状态
3. 页面使用默认主题
```

### 场景 3：创建新世界观

```typescript
// 用户点击 "创建新世界观"
1. 打开 CreateworldDialog
2. 填写名称、描述、主题色
3. 调用 POST /api/worlds 创建
4. 创建成功后自动选中新世界观
5. 刷新世界观列表
```

## 响应式设计

| 屏幕尺寸 | 适配 |
|---------|------|
| > 768px (Desktop) | 下拉菜单（Dropdown） |
| < 768px (Mobile) | Bottom Sheet（从底部滑出） |

```typescript
// 使用 Shadcn UI 的 Drawer 替代 Select（移动端）
import { useMediaQuery } from '@/hooks/useMediaQuery';

function worldselector(props) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return <worldDrawer {...props} />; // Bottom Sheet 实现
  } else {
    return <worldDropdown {...props} />; // 下拉菜单实现
  }
}
```

## 性能优化

1. **世界观列表缓存**：使用 SWR 或 React Query 缓存世界观列表
2. **虚拟滚动**：如果自定义世界观 > 100 个，使用虚拟列表
3. **预加载**：页面加载时预取世界观列表（Server Component 预取）

```typescript
// 使用 SWR 缓存
import useSWR from 'swr';

function worldselector(props) {
  const { data, error } = useSWR('/api/worlds', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false
  });

  // ...
}
```

## 国际化

```json
// src/i18n/pages/character-detail/en.json
{
  "world_selector_label": "world",
  "world_selector_placeholder": "Select a world",
  "world_search_placeholder": "Search worlds...",
  "world_preset_section": "Preset worlds",
  "world_custom_section": "My worlds",
  "world_create_button": "Create New world",
  "world_clear_button": "Clear Selection"
}
```

## 可访问性 (A11y)

- 下拉菜单符合 ARIA 规范（`role="combobox"`）
- 键盘导航支持（上下键、Enter 选择、Esc 关闭）
- 聚焦状态明显（focus ring）
- 屏幕阅读器友好（`aria-label` 描述）

## 相关文件

- 组件：`src/components/character-detail/worldselector.tsx`
- Dialog：`src/components/character-detail/CreateworldDialog.tsx`
- API：[world.md](../api/world.md)
- 服务：[service-world.md](../backend/service-world.md)

## 变更历史

- 2026-01-08 FEAT-OC-REBUILD 初始版本
  - 支持预置 + 自定义世界观选择
  - 搜索过滤功能
  - 缩略图 + 主题色预览
  - 移动端 Bottom Sheet 适配
  - 创建新世界观快捷入口
