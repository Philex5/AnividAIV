# Component: Tag Editor (标签编辑器)

**Related**: FEAT-OC-REBUILD | [feature-oc-rebuild.md](../features/feature-oc-rebuild.md)

## 概览

Tag Editor 是一个 Badge 形式的标签输入组件，支持输入自定义 Tag、从预置 Tag 列表选择、自动规范化及敏感词过滤。每个角色最多支持 20 个 Tag。

## 组件路径

`src/components/character-detail/TagEditor.tsx`

## 组件结构

### 编辑状态
```
┌─────────────────────────────────────────────────┐
│ Tags:                                            │
│ [cyberpunk ×] [hacker ×] [cool ×] [添加 Tag...] │
│                                                  │
│ 推荐Tag: [sci-fi +] [neon +] [futuristic +]    │
└─────────────────────────────────────────────────┘

输入时自动匹配:
┌─────────────────────────────────────────────────┐
│ Tags: [cyber|                                   │
│ ↓ 匹配建议:                                      │
│   cyberpunk (156 次使用)                        │
│   cyber_punk (12 次使用)                        │
│   cyborg (45 次使用)                            │
└─────────────────────────────────────────────────┘
```

### 只读状态（查看模式）
```
┌─────────────────────────────────────────────────┐
│ Tags: [cyberpunk] [hacker] [cool]               │
│ (点击 Tag 跳转到社区筛选页面)                    │
└─────────────────────────────────────────────────┘
```

## Props API

```typescript
interface TagEditorProps {
  value: string[];                           // 当前 Tags 数组
  onChange: (tags: string[]) => void;        // Tag 变更回调
  maxTags?: number;                          // 最多 Tag 数量（默认 20）
  readOnly?: boolean;                        // 是否只读（默认 false）
  placeholder?: string;                      // 输入占位符（默认 "添加 Tag..."）
  showSuggestions?: boolean;                 // 是否显示推荐 Tag（默认 true）
  allowCustom?: boolean;                     // 是否允许自定义 Tag（默认 true）
  onTagClick?: (tag: string) => void;        // Tag 点击回调（只读模式）
}
```

## 使用示例

```typescript
// 在 CharacterEditView 中使用
import { TagEditor } from '@/components/character-detail/TagEditor';

function CharacterEditView({ character }: { character: Character }) {
  const [tags, setTags] = useState(character.tags || []);

  const handleTagsChange = async (newTags: string[]) => {
    setTags(newTags);

    // 更新角色
    await fetch(`/api/oc-maker/characters/${character.uuid}`, {
      method: 'PUT',
      body: JSON.stringify({ tags: newTags })
    });
  };

  return (
    <TagEditor
      value={tags}
      onChange={handleTagsChange}
      maxTags={20}
    />
  );
}
```

## 内部实现

### 状态管理

```typescript
// src/components/character-detail/TagEditor.tsx
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

function TagEditor({ value, onChange, maxTags = 20, ...props }: TagEditorProps) {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [presetTags, setPresetTags] = useState<string[]>([]);

  // 加载预置 Tag 列表
  useEffect(() => {
    async function loadPresetTags() {
      const response = await fetch('/api/tags/presets');
      const data = await response.json();
      setPresetTags(data.tags);
    }
    loadPresetTags();
  }, []);

  // 输入时自动匹配
  useEffect(() => {
    if (inputValue.length > 1) {
      const matched = presetTags
        .filter(tag => tag.toLowerCase().includes(inputValue.toLowerCase()))
        .slice(0, 5);
      setSuggestions(matched);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, presetTags]);

  // 添加 Tag
  const addTag = (tag: string) => {
    const normalized = normalizeTag(tag);

    // 验证
    if (!normalized) return;
    if (value.includes(normalized)) return;
    if (value.length >= maxTags) {
      toast.error(`最多添加 ${maxTags} 个 Tag`);
      return;
    }

    onChange([...value, normalized]);
    setInputValue('');
    setSuggestions([]);
  };

  // 删除 Tag
  const removeTag = (tag: string) => {
    onChange(value.filter(t => t !== tag));
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue) {
      // 删除最后一个 Tag
      if (value.length > 0) {
        removeTag(value[value.length - 1]);
      }
    }
  };

  return (
    <div className="space-y-2">
      {/* Tag 展示区域 */}
      <div className="flex flex-wrap gap-2">
        {value.map(tag => (
          <Badge key={tag} variant="secondary">
            {tag}
            {!props.readOnly && (
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            )}
          </Badge>
        ))}

        {/* 输入框 */}
        {!props.readOnly && value.length < maxTags && (
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={props.placeholder || "添加 Tag..."}
            className="w-32 h-8 inline-block"
          />
        )}
      </div>

      {/* 匹配建议 */}
      {suggestions.length > 0 && (
        <div className="flex gap-1">
          <span className="text-sm text-muted-foreground">建议:</span>
          {suggestions.map(tag => (
            <Badge
              key={tag}
              variant="outline"
              className="cursor-pointer hover:bg-secondary"
              onClick={() => addTag(tag)}
            >
              {tag} +
            </Badge>
          ))}
        </div>
      )}

      {/* 推荐 Tag */}
      {props.showSuggestions && value.length < maxTags && (
        <div className="flex gap-1">
          <span className="text-sm text-muted-foreground">推荐:</span>
          {getRecommendedTags(value, presetTags).map(tag => (
            <Badge
              key={tag}
              variant="outline"
              className="cursor-pointer hover:bg-secondary"
              onClick={() => addTag(tag)}
            >
              {tag} +
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Tag 规范化逻辑

**文件位置**: `src/lib/tag-normalizer.ts`

```typescript
// Tag 规范化规则
export function normalizeTag(tag: string): string | null {
  // 1. 去除首尾空格、转小写
  let normalized = tag.trim().toLowerCase();

  // 2. 长度限制（1-20 字符）
  if (normalized.length < 1 || normalized.length > 20) {
    return null;
  }

  // 3. 替换中划线为下划线
  normalized = normalized.replace(/-/g, '_');

  // 4. 移除特殊字符（仅保留字母、数字、下划线）
  normalized = normalized.replace(/[^a-z0-9_]/g, '');

  // 5. 敏感词过滤
  if (isSensitiveWord(normalized)) {
    throw new Error('Tag contains sensitive words');
  }

  return normalized;
}

// 敏感词检测（简化示例）
function isSensitiveWord(tag: string): boolean {
  const sensitiveWords = ['spam', 'abuse', 'nsfw'];  // 实际应对接敏感词库
  return sensitiveWords.some(word => tag.includes(word));
}

// 相似度检测（Levenshtein 距离）
export function findSimilarTags(input: string, existingTags: string[]): string[] {
  return existingTags
    .filter(tag => levenshteinDistance(input, tag) <= 2)
    .slice(0, 5);
}

function levenshteinDistance(a: string, b: string): number {
  // 标准 Levenshtein 距离算法实现
  // ...
}
```

## 推荐 Tag 逻辑

```typescript
// src/lib/tag-recommender.ts
export function getRecommendedTags(
  currentTags: string[],
  presetTags: string[]
): string[] {
  // 1. 排除已选中的 Tag
  const available = presetTags.filter(tag => !currentTags.includes(tag));

  // 2. 基于角色特征推荐（示例：如果有 "cyberpunk"，推荐 "neon"）
  const recommendations = [];

  if (currentTags.includes('cyberpunk')) {
    recommendations.push('neon', 'futuristic', 'hacker');
  }
  if (currentTags.includes('fantasy')) {
    recommendations.push('magic', 'medieval', 'dragon');
  }

  // 3. 去重并返回前 5 个
  return [...new Set(recommendations)]
    .filter(tag => available.includes(tag))
    .slice(0, 5);
}
```

## 只读模式（查看模式）

```typescript
// 点击 Tag 跳转到社区筛选页面
function TagEditorReadOnly({ tags, onTagClick }: { tags: string[]; onTagClick?: (tag: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map(tag => (
        <Badge
          key={tag}
          variant="secondary"
          className="cursor-pointer hover:bg-primary/10"
          onClick={() => onTagClick?.(tag) || router.push(`/community?tags=${tag}`)}
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}
```

## 验证与错误处理

```typescript
// 前端验证
function validateTags(tags: string[]): { valid: boolean; error?: string } {
  if (tags.length > 20) {
    return { valid: false, error: '最多添加 20 个 Tag' };
  }

  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (!normalized) {
      return { valid: false, error: `Tag "${tag}" 格式不合法` };
    }
  }

  // 检查重复
  if (new Set(tags).size !== tags.length) {
    return { valid: false, error: '存在重复的 Tag' };
  }

  return { valid: true };
}

// 后端验证（API 层）
// src/app/api/oc-maker/characters/[uuid]/route.ts
if (updates.tags) {
  const validation = validateTags(updates.tags);
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 400 });
  }
}
```

## 性能优化

1. **防抖输入**：使用 `useDebouncedValue` 减少匹配建议的计算
2. **预置 Tag 缓存**：使用 SWR 缓存预置 Tag 列表
3. **虚拟滚动**：如果 Tag 数量 > 50，使用虚拟列表

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function TagEditor(props) {
  const debouncedInput = useDebouncedValue(inputValue, 300);

  useEffect(() => {
    // 使用 debounced 值进行匹配
    if (debouncedInput.length > 1) {
      const matched = matchTags(debouncedInput);
      setSuggestions(matched);
    }
  }, [debouncedInput]);
}
```

## 国际化

```json
// src/i18n/pages/character-detail/en.json
{
  "tags_label": "Tags",
  "tags_placeholder": "Add a tag...",
  "tags_max_reached": "Maximum {{max}} tags allowed",
  "tags_suggested": "Recommended",
  "tags_matching": "Suggestions",
  "tags_invalid": "Invalid tag format"
}
```

## 可访问性 (A11y)

- 输入框支持键盘导航（Enter/Backspace）
- Tag Badge 有明确的 `aria-label`（如 "Remove tag: cyberpunk"）
- 建议列表使用 `role="listbox"`

## 相关文件

- 组件：`src/components/character-detail/TagEditor.tsx`
- 规范化工具：`src/lib/tag-normalizer.ts`
- 推荐逻辑：`src/lib/tag-recommender.ts`
- 预置 Tag 配置：`src/configs/tags/preset-tags.json`

## 变更历史

- 2026-01-08 FEAT-OC-REBUILD 初始版本
  - Badge 形式的 Tag 输入
  - 自动规范化（小写、下划线、长度限制）
  - 预置 Tag 匹配建议
  - 敏感词过滤
  - 相似度检测
  - 推荐 Tag 系统
  - 只读模式支持
- 2026-01-11 FEAT-OC-REBUILD 首次落地（影响：`src/components/character-detail/TagEditor.tsx`, `CharacterTagsSection`, `/api/tags/presets`）
