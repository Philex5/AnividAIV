# 统一 Prompt 构建服务设计

**Related**: FEAT-PROMPT-BUILDER-ENHANCEMENT

## 服务概述

### 服务职责

统一 Prompt 构建服务提供了分离清晰的图片生成提示词构建方法，支持基础生图和角色生成两种独立的构建模式，采用模板化配置管理和简化的日志输出。

### 核心功能

- 分离的基础生图和角色生成构建方法
- 模板化配置管理
- 艺术风格自动映射
- 参数验证和清理
- 简化的开发环境日志

## 服务架构设计

### 主服务文件

**文件路径**: `src/lib/prompt-builder.ts`

### 分离的构建方法

- `buildBasePrompt(params: BasePromptParams)` - 基础生图专用方法
- `buildCharacterPrompt(character: CharacterData)` - 角色生成专用方法
- `buildPrompt(params: PromptBuilderParams)` - 统一入口（向后兼容）

### 参数接口设计

#### 基础生图参数接口

```typescript
export interface BasePromptParams {
  prompt: string; // 用户输入的基础描述
  style?: string; // 艺术风格（映射到配置）
  scene?: string; // 场景设置
  outfit?: string; // 服装风格
  addQualityTerms?: boolean; // 是否添加质量词（默认true）
}
```

#### 角色数据接口

```typescript
interface CharacterData {
  // 基础信息
  name: string;
  gender: string;
  age?: number;
  species?: string;

  // 外观设计
  body_type?: string;
  hair_style?: string;
  hair_color?: string;
  eye_color?: string;

  // 性格和服装
  personality_tags?: string[];
  outfit_style?: string;
  accessories?: string[];
  appearance_features?: string;

  // 艺术风格
  art_style?: string;

  // 扩展属性
  extended_attributes?: Array<{
    key: string;
    value: string;
  }>;

  // 主题特定数据
  theme_specific_data?: any;
}
```

#### 统一参数接口（兼容性）

```typescript
export interface PromptBuilderParams {
  prompt: string;
  style?: string;
  scene?: string;
  outfit?: string;
  generation_type?: "anime" | "character";
  character_data?: CharacterData;
  addQualityTerms?: boolean;
}
```

## 核心方法设计

### 1. buildBasePrompt 方法

**功能职责**: 基础生图专用的 prompt 构建
**实现思路**:

1. 使用基础模板构建用户 prompt
2. 依次添加 style/scene/outfit 参数（使用模板化替换）
3. 可选添加质量提升词
4. 开发环境下输出简单日志

**使用示例**:

```typescript
const result = buildBasePrompt({
  prompt: "beautiful landscape",
  style: "ghiblio",
  scene: "sunset",
  addQualityTerms: false,
});
// 输出: "beautiful landscape, Studio Ghiblio style, Miyazaki style, beautiful anime art, soft colors, dreamy atmosphere, sunset scene, high quality, detailed, masterpiece, best quality"
```

### 2. buildCharacterPrompt 方法

**功能职责**: 角色生成专用的 prompt 构建
**实现思路**:

1. 使用角色模板构建基础描述（name, gender, age）
2. 添加外观信息（species, body_type, hair, eyes）
3. 添加性格标签和服装配饰信息
4. 处理艺术风格映射（从配置文件获取对应prompt）
5. 处理扩展属性
6. 开发环境下输出简单日志

**支持的完整参数**:

- 基础信息：name, gender, age, species
- 外观设计：body_type, hair_style, hair_color, eye_color
- 服装配饰：outfit_style, accessories, appearance_features
- 性格特征：personality_tags
- 艺术风格：art_style（自动映射到对应prompt）
- 扩展属性：extended_attributes（键值对）

### 3. buildPrompt 方法

**功能职责**: 统一入口（向后兼容）
**实现思路**:

1. 根据 generation_type 选择对应的专用方法
2. 角色模式：调用 buildCharacterPrompt，可追加额外用户 prompt
3. 基础模式：调用 buildBasePrompt

### 4. buildOptimizationPrompt 方法

**功能职责**: 为 LLM 优化构建系统和用户提示词
**实现思路**:

1. 加载优化模板配置
2. 替换模板中的变量
3. 返回系统和用户提示词

### 5. cleanPrompt 方法

**功能职责**: 清理和格式化提示词
**实现思路**:

1. 按逗号分割提示词
2. 清理空白和重复
3. 重新组合返回

## 配置模板系统

### 模板配置文件

#### 1. base-generation.json

**用途**: 基础生图配置

```json
{
  "templates": {
    "base_template": "{user_prompt}",
    "style_template": "{style_prompt}",
    "scene_template": "{scene_prompt}",
    "action_template": "{action_prompt}",
    "outfit_template": "{outfit_prompt}",
    "quality_enhancement": "high quality, detailed, masterpiece, best quality"
  }
}
```

#### 2. character-generation.json

**用途**: 角色生成模板

```json
{
  "templates": {
    "character_base": "Character: {name}, {gender}, {age} years old",
    "species_template": "{species}",
    "body_type_template": "{body_type} body type",
    "hair_template": "{hair_style} {hair_color} hair",
    "eye_template": "{eye_color} eyes",
    "outfit_template": "wearing {outfit_style}",
    "accessories_template": "accessories: {accessories}",
    "appearance_features_template": "Apperance Features: {appearance_features}",
    "art_style_template": "{art_style_prompt}"
  }
}
```

#### 3. anime_styles.json

**用途**: 动漫艺术风格配置

```json
{
  "items": [
    {
      "key": "ghiblio",
      "name": "ghiblio",
      "prompt_value": "Studio Ghiblio style, Miyazaki style, beautiful anime art, soft colors, dreamy atmosphere"
    }
  ]
}
```

#### 4. character_styles.json

**用途**: 角色专用艺术风格配置

```json
{
  "items": [
    {
      "key": "anime",
      "name": "anime",
      "prompt_value": "anime style character, detailed anime art, vibrant colors, expressive eyes"
    }
  ]
}
```

### 艺术风格映射机制

**实现原理**:

1. 当 `art_style` 参数存在时，系统会自动查找对应的 prompt 描述
2. 查找顺序：`character_styles.json` → `anime_styles.json`
3. 找到匹配的 `key` 后，使用其 `prompt_value` 替换模板中的 `{art_style_prompt}`
4. 如果找不到匹配项，在开发环境记录警告并跳过该字段

## 简化日志系统

### 日志方式

采用简单的控制台输出方式：

- 开发环境下输出关键构建信息
- 生产环境静默运行
- 移除了复杂的日志管理和统计功能

### 日志输出示例

```typescript
// 开发环境下的简单日志
if (process.env.NODE_ENV === "development") {
  console.log("[PromptBuilder] Building base prompt:", params);
  console.log("[PromptBuilder] Base prompt result:", result);
  console.warn("[PromptBuilder] Art style not found:", styleKey);
}
```

## 使用场景和集成

### 1. 基础生图使用

```typescript
// 直接使用基础生图方法
const baseResult = buildBasePrompt({
  prompt: "beautiful landscape",
  style: "ghiblio",
  scene: "sunset",
  addQualityTerms: false,
});

// 生成结果示例:
// "beautiful landscape, Studio Ghiblio style, Miyazaki style, beautiful anime art, soft colors, dreamy atmosphere, sunset scene, high quality, detailed, masterpiece, best quality"
```

### 2. 角色生成使用（完整参数示例）

```typescript
// 直接使用角色生成方法
const characterResult = buildCharacterPrompt({
  // 基础信息
  name: "Luna",
  gender: "female",
  age: 18,
  species: "cat-girl",

  // 外观设计
  body_type: "petite",
  hair_style: "twin-tails",
  hair_color: "purple",
  eye_color: "green",

  // 性格和服装
  personality_tags: ["playful", "curious", "energetic"],
  outfit_style: "school uniform",
  accessories: ["cat ears", "ribbon"],
  appearance_features: "magic wand",

  // 艺术风格
  art_style: "anime",

  // 扩展属性
  extended_attributes: [
    { key: "hobby", value: "reading magic books" },
    { key: "weakness", value: "afraid of water" },
  ],
});

// 生成结果示例:
// "Character: Luna, female, 18 years old, cat-girl, petite body type, twin-tails purple hair, green eyes, personality: playful, curious, energetic, wearing school uniform, accessories: cat ears, ribbon, Apperance Features: magic wand, anime style character, detailed anime art, vibrant colors, expressive eyes, hobby: reading magic books, weakness: afraid of water"
```

### 3. 统一入口使用（向后兼容）

```typescript
const result = buildPrompt({
  prompt: "standing pose",
  generation_type: "character", // 或 "general"
  character_data: {
    name: "Alice",
    gender: "female",
    art_style: "anime",
  },
});
```

### 4. 与 OC-Maker 集成示例

```typescript
// 在 OCCreationTool 中集成使用
function generateCharacterPrompt(formData: OCCreationFormData) {
  const characterData = {
    name: formData.name,
    gender: formData.gender,
    age: formData.age ? parseInt(formData.age) : undefined,
    species: formData.species,
    body_type: formData.body_type,
    hair_style: formData.hair_style,
    hair_color: formData.hair_color,
    eye_color: formData.eye_color,
    personality_tags: formData.personality_tags,
    outfit_style: formData.outfit_style,
    accessories: formData.accessories,
    appearance_features: formData.appearance_features,
    art_style: formData.art_style,
    extended_attributes: formData.extended_attributes?.filter(
      (attr) => attr.key && attr.value,
    ),
  };

  // 直接使用角色生成方法
  const finalPrompt = buildCharacterPrompt(characterData);
  return finalPrompt;
}
```

## 服务集成点

### 1. optimize-prompt API

**集成方式**: 直接调用 buildPrompt 和 buildOptimizationPrompt
**用途**: 为用户提供 prompt 预览和优化功能
**使用场景**: 基础生图优化

### 2. anime-generation 服务

**集成方式**: 在 validateAndProcessParams 中调用 buildPrompt
**用途**: 统一处理所有生成请求的 prompt 构建
**使用场景**: 基础生图和角色生图

### 3. character 服务

**集成方式**: generateCharacterPrompt 方法调用 buildPrompt
**用途**: 为角色相关功能提供 prompt 构建
**使用场景**: 角色生图

### 4. oc-maker 生图接口

**集成方式**: 通过 anime-generation 服务间接使用
**用途**: 角色生图复用统一的构建逻辑

## 扩展性设计

### 新增参数支持

1. 扩展 BasePromptParams 或 CharacterData 接口
2. 在对应的构建方法中添加参数处理逻辑
3. 更新相关的模板配置

### 新增模板配置

1. 在 `src/configs/prompts/` 中添加新的 JSON 配置
2. 在 prompt-builder.ts 中导入配置
3. 在相应的构建方法中使用配置

### 新增艺术风格

1. 在 anime_styles.json 或 character_styles.json 中添加新的风格配置
2. 配置包含 key, name, prompt_value 等字段
3. 系统将自动支持新风格的映射

## 错误处理

### 参数验证

- 检查必要参数的存在性
- 验证 generation_type 的有效性
- 角色生成模式下验证 character_data

### 配置加载

- 处理配置文件加载失败
- 模板变量替换错误处理
- 艺术风格映射失败处理

### Prompt 构建

- 处理空值和无效参数
- 艺术风格找不到时的优雅降级
- 提供构建失败的错误信息

## 性能优化

### 配置缓存

- 配置文件在应用启动时加载
- 避免重复的文件读取操作
- 内存中缓存解析后的配置

### 字符串处理

- 优化 prompt 拼接和清理逻辑
- 减少不必要的字符串操作
- 使用高效的正则表达式

## 相关文件路径

### 主服务

- `src/lib/prompt-builder.ts` - 统一 prompt 构建库（包含分离的方法）

### 配置文件

- `src/configs/prompts/prompt-optimization.json` - LLM 优化模板
- `src/configs/prompts/base-generation.json` - 基础生成配置
- `src/configs/prompts/character-generation.json` - 角色生成模板
- `src/configs/styles/anime_styles.json` - 动漫艺术风格配置
- `src/configs/styles/character_styles.json` - 角色专用风格配置

### 集成接口

- `src/app/api/anime-generation/optimize-prompt/route.ts` - 优化接口
- `src/app/api/anime-generation/create-task/route.ts` - 创建任务接口

### 服务层

- `src/services/anime-generation.ts` - 动漫生成服务
- `src/services/character.ts` - 角色管理服务

## 测试建议

### 单元测试

- 测试各种参数组合的 prompt 构建
- 验证模板变量替换的正确性
- 测试错误输入的处理

### 集成测试

- 测试与各个 API 接口的集成
- 验证不同生成类型的端到端流程
- 测试配置文件的加载和使用

### 性能测试

- 测试大量并发 prompt 构建的性能
- 验证配置缓存的有效性
- 测试内存使用情况

## 变更历史

- 2025-09-28 FEAT-UNIFIED-GENERATION 创建统一 Prompt 构建服务，整合所有 prompt 构建逻辑，支持通用和角色两种生成模式，实现配置模板化管理
- 2025-09-29 FEAT-PROMPT-BUILDER-ENHANCEMENT 大幅重构 Prompt 构建功能：①分离基础生图和角色生成为独立方法，②完善基础生图模板化配置，③扩展角色参数支持（species, body_type, hair, eyes, accessories, art_style, extended_attributes），④新增艺术风格自动映射机制，⑤简化日志系统使用控制台输出，⑥与前端 OCCreationTool 表单完全对应，⑦彻底重写文档反映新架构
