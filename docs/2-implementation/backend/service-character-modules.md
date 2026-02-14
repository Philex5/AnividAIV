# Backend Service: Character Modules 模块化服务 (service-character-modules)

**Related**: FEAT-OC-REBUILD | [feature-oc-rebuild.md](../features/feature-oc-rebuild.md)

## 概览

Character Modules 服务负责处理角色的模块化数据（appearance、personality、background、art），包括 JSONB 数据的读写、验证、部分更新及模块间关联处理。

## 服务架构

**文件位置**: `src/services/character-modules.ts`

## 核心方法

### 1. getCharacterModules(characterUuid)
获取角色的完整模块数据

```typescript
async function getCharacterModules(
  characterUuid: string
): Promise<CharacterModules>
```

**逻辑**：
1. 从数据库读取 `character.modules` (JSONB)
2. 使用 Zod Schema 验证数据结构
3. 如果验证失败，记录错误日志并返回默认模块结构
4. 返回验证后的模块对象

### 2. updateCharacterModules(characterUuid, updates)
部分更新角色模块

```typescript
async function updateCharacterModules(
  characterUuid: string,
  updates: Partial<CharacterModules>
): Promise<CharacterModules>
```

**逻辑**：
1. 获取当前完整 modules 数据
2. 深度合并（deep merge）更新数据
3. Zod Schema 验证合并后的结果
4. 更新数据库 `modules` 字段
5. 返回更新后的完整模块对象

**示例**：
```typescript
// 仅更新 appearance 的 hair_color
await updateCharacterModules(uuid, {
  appearance: {
    hair_color: 'silver'
  }
});

// 结果：仅 hair_color 被更新，其他字段保持不变
```

### 3. validateModules(modules)
验证模块数据结构

```typescript
function validateModules(
  modules: unknown
): modules is CharacterModules
```

**逻辑**：
1. 使用 Zod Schema (`CharacterModulesSchema`) 验证
2. 如果验证失败，抛出 ValidationError 含详细错误信息
3. 如果成功，返回 `true` 并确保类型安全

### 4. buildPromptFromModules(modules, type)
从模块构建 AI Prompt

```typescript
async function buildPromptFromModules(
  modules: CharacterModules,
  type: 'profile' | 'avatar' | 'scene'
): Promise<string>
```

**逻辑**：
1. 根据 type 选择对应的 prompt 模板
2. 从模块中提取相关字段（appearance、art 等）
3. 替换模板中的变量占位符
4. 返回构建完成的 prompt

**示例**：
```typescript
// 立绘生成 Prompt
const prompt = buildPromptFromModules(modules, 'profile');
// → "A female elf character with silver hair, blue eyes, wearing cyberpunk outfit..."
```

### 5. migrateToModules(legacyCharacter)
从旧数据迁移到模块化结构

```typescript
async function migrateToModules(
  legacyCharacter: LegacyCharacter
): Promise<CharacterModules>
```

**逻辑**：
1. 读取旧字段（hair_color、eye_color、personality_tags 等）
2. 映射到对应模块
3. 如有无法映射的字段，存入 `legacy_data` JSONB 字段
4. 返回新模块结构

**详细设计**：参考 [data-migration-to-modules.md](./data-migration-to-modules.md)

## 模块结构处理

### Deep Merge 逻辑

使用 `lodash.merge` 或自定义深度合并函数：

```typescript
import merge from 'lodash/merge';

function deepMergeModules(
  current: CharacterModules,
  updates: Partial<CharacterModules>
): CharacterModules {
  // 深度合并，数组替换而非合并
  const merged = merge({}, current, updates);

  // 特殊处理：数组字段直接替换
  if (updates.appearance?.accessories) {
    merged.appearance.accessories = updates.appearance.accessories;
  }
  if (updates.personality?.personality_tags) {
    merged.personality.personality_tags = updates.personality.personality_tags;
  }

  return merged;
}
```

### 空值处理

```typescript
// 如果用户传递 null 或 undefined，表示删除该字段
function applyNullableUpdates(
  current: CharacterModules,
  updates: Partial<CharacterModules>
): CharacterModules {
  const result = { ...current };

  for (const [moduleKey, moduleUpdates] of Object.entries(updates)) {
    if (moduleUpdates === null) {
      // 删除整个模块
      delete result[moduleKey];
    } else if (typeof moduleUpdates === 'object') {
      result[moduleKey] = result[moduleKey] || {};
      for (const [field, value] of Object.entries(moduleUpdates)) {
        if (value === null) {
          delete result[moduleKey][field]; // 删除单个字段
        } else {
          result[moduleKey][field] = value;
        }
      }
    }
  }

  return result;
}
```

## Prompt 构建

### 模板系统

**配置文件**: `src/configs/prompts/character-generation.json`

```json
{
  "profile_template": "A {{gender}} {{species}} character with {{hair_color}} hair, {{eye_color}} eyes. Wearing {{outfit_style}} style clothing. {{appearance_features}}. {{special_features}}. Art style: {{art_style}}.",
  "avatar_template": "Close-up portrait of {{name}}, focusing on face. {{hair_color}} hair, {{eye_color}} eyes. {{facial_features}}. Art style: {{art_style}}."
}
```

### 变量替换逻辑

```typescript
// src/services/character-modules.ts
function buildPromptFromModules(
  modules: CharacterModules,
  type: 'profile' | 'avatar'
): string {
  const template = getPromptTemplate(type);

  const variables = {
    gender: modules.appearance?.gender || 'unknown',
    species: modules.appearance?.species || 'human',
    hair_color: modules.appearance?.hair_color || 'brown',
    eye_color: modules.appearance?.eye_color || 'blue',
    outfit_style: modules.appearance?.outfit_style || 'casual',
    appearance_features: modules.appearance?.appearance_features?.join(', ') || '',
    special_features: modules.appearance?.special_features || '',
    art_style: modules.art?.fullbody_style || 'anime',
    name: modules.personality?.name || 'Character'
  };

  let prompt = template;
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }

  return prompt.trim().replace(/\s+/g, ' '); // 清理多余空格
}
```

## 数据验证与错误处理

### Zod Schema 应用

```typescript
// src/services/character-modules.ts
import { CharacterModulesSchema } from '@/types/oc';

async function validateAndSaveModules(
  characterUuid: string,
  modules: unknown
): Promise<void> {
  try {
    // Zod 验证
    const validated = CharacterModulesSchema.parse(modules);

    // 保存到数据库
    await updateCharacter(characterUuid, { modules: validated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(
        'Invalid module structure',
        error.errors
      );
    }
    throw error;
  }
}
```

### 错误类型

```typescript
class ModuleValidationError extends Error {
  constructor(
    message: string,
    public details: z.ZodIssue[]
  ) {
    super(message);
  }
}

class ModuleNotFoundError extends Error {
  constructor(moduleName: string) {
    super(`Module '${moduleName}' not found in character data`);
  }
}
```

## JSONB 查询优化

### 常见查询模式

```typescript
// 按外观特征筛选角色
async function findCharactersByAppearance(
  filters: { hair_color?: string; eye_color?: string }
): Promise<Character[]> {
  const db = getDb();

  let query = db.select().from(characters);

  if (filters.hair_color) {
    query = query.where(
      sql`modules->'appearance'->>'hair_color' = ${filters.hair_color}`
    );
  }

  if (filters.eye_color) {
    query = query.where(
      sql`modules->'appearance'->>'eye_color' = ${filters.eye_color}`
    );
  }

  return await query;
}
```

### 使用表达式索引

```sql
-- 高频查询字段索引（参考 feature-oc-rebuild.md）
CREATE INDEX idx_char_hair_color ON characters ((modules->'appearance'->>'hair_color'));
CREATE INDEX idx_char_eye_color ON characters ((modules->'appearance'->>'eye_color'));
CREATE INDEX idx_char_outfit_style ON characters ((modules->'appearance'->>'outfit_style'));
CREATE INDEX idx_char_art_style ON characters ((modules->'art'->>'fullbody_style'));
CREATE INDEX idx_char_personality_tags ON characters USING GIN ((modules->'personality'->'personality_tags'));
```

## 性能优化

1. **批量读取优化**：
   ```typescript
   // 批量获取角色时，一次性获取所有 modules
   const characters = await db
     .select({ uuid: characters.uuid, modules: characters.modules })
     .from(characters)
     .where(inArray(characters.uuid, uuids));
   ```

2. **部分更新优化**：
   ```typescript
   // 使用 PostgreSQL jsonb_set 函数仅更新特定字段
   await db.execute(sql`
     UPDATE characters
     SET modules = jsonb_set(
       modules,
       '{appearance,hair_color}',
       '"silver"'::jsonb
     )
     WHERE uuid = ${uuid}
   `);
   ```

## 测试要点

- [x] Modules 数据验证（正常/异常数据）
- [x] 部分更新（单模块、跨模块、数组字段）
- [x] 深度合并逻辑（嵌套对象、数组替换）
- [x] Prompt 构建（不同模板、缺失字段处理）
- [x] 数据迁移（旧数据 → modules，legacy_data 保留）
- [x] JSONB 查询性能（表达式索引效果）

## 相关文件

- 类型定义：`src/types/oc.ts` (Zod Schemas)
- 数据模型：`src/models/character.ts`
- API 层：`src/app/api/oc-maker/characters/[uuid]/route.ts`
- Prompt 配置：`src/configs/prompts/character-generation.json`
- 数据迁移：[data-migration-to-modules.md](./data-migration-to-modules.md)

## 变更历史

- 2026-01-08 FEAT-OC-REBUILD 初始版本
  - 实现模块化数据的读写与验证
  - 支持部分更新与深度合并
  - Prompt 构建从模块生成
  - 数据迁移支持
  - JSONB 查询优化与索引策略
