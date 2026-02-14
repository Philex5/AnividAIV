# 参数管理服务设计

**Related**: [AI动漫生成器 Feature](../features/feature-ai-anime-generator.md)

## 服务概述

### 服务职责
参数管理服务负责处理 AI 动漫生成相关的 JSON 配置文件管理，包括风格预设、场景预设、服饰预设、模型配置等的加载、验证和管理。

### 核心功能
- JSON 配置文件加载和解析
- 配置数据验证和兼容性检查

## 服务架构设计

### 主服务类
**文件路径**: `src/services/parameter-management.ts`

```typescript
export class ParameterManagementService {
  private configLoader: ConfigFileLoader;
  private configCache: ConfigCache;
  private validationService: ValidationService;
  
  constructor() {
    this.configLoader = new ConfigFileLoader();
    this.configCache = new ConfigCache();
    this.validationService = new ValidationService();
  }

  // JSON配置文件管理
  async getParameterConfigs(category?: string, options?: GetParameterOptions): Promise<ParameterConfigsResponse>
  async reloadConfigs(): Promise<void>
  async validateAllConfigs(): Promise<ConfigValidationResult>
  
  // AI模型配置
  async getAIModels(options?: GetModelsOptions): Promise<AIModelsResponse>
  async getModelByName(name: string): Promise<AIModel | null>
  
  // 参数配置获取
  async getStylePresets(options?: GetPresetsOptions): Promise<ParameterConfig[]>
  async getScenePresets(options?: GetPresetsOptions): Promise<ParameterConfig[]>
  async getOutfitPresets(options?: GetPresetsOptions): Promise<ParameterConfig[]>
  async getAspectRatios(): Promise<AspectRatioConfig[]>

  // 示例画廊
  async getFeaturedImages(options?: GetGalleryOptions): Promise<FeaturedImage[]>
  
  // 用户偏好管理
  async getUserParameterMemory(userUuid: string): Promise<UserParameterMemory | null>
  async saveUserParameterMemory(userUuid: string, memory: ParameterMemoryData): Promise<void>
}
```

### 核心接口定义
```typescript
interface GetParameterOptions {
  category?: 'style' | 'scene' | 'outfit' | 'ratio';
  featured_only?: boolean;
  status?: 'active' | 'inactive';
}

interface ParameterConfigsResponse {
  categories: Record<string, ParameterConfig[]>;
  total_count: number;
  last_updated: string;
}

interface ParameterConfig {
  key: string;
  i18n_name_key: string;
  i18n_description_key?: string;
  prompt_value?: string;
  thumbnail_url?: string;
  example_images?: string[];
  is_featured?: boolean;
  sort_order?: number;
  status: 'active' | 'inactive';
}

interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigError[];
  warnings: ConfigWarning[];
}

interface UserParameterMemory {
  user_uuid: string;
  memory_data: ParameterMemoryData;
  created_at: string;
  updated_at: string;
}

interface ParameterMemoryData {
  model_name?: string;
  aspect_ratio?: string;
  counts?: number;
  style_preset?: string;
  scene_preset?: string;
  outfit_preset?: string;
}
```

## 核心业务方法实现

### 1. getParameterConfigs 方法
**功能职责**: 获取JSON配置文件中的参数配置列表

### 2. reloadConfigs 方法
**功能职责**: 重新加载JSON配置文件并更新缓存


### 3. getAIModels 方法
**功能职责**: 获取JSON配置文件中的AI模型列表

### 4. getFeaturedImages 方法
**功能职责**: 获取JSON配置文件中的精选示例图片


### 5. 用户参数记忆功能
**功能职责**: 管理用户的参数偏好记忆


## 参数验证服务

### ValidationService 类

## 缓存管理

### CacheService 增强
```typescript
class CacheService {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  // 构建缓存键
  buildCacheKey(prefix: string, params: any): string {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${hashString(paramStr)}`;
  }
  
  // 批量清理缓存
  async clearParameterConfigCache(category?: string): Promise<void> {
    const patterns = [
      'parameter_configs:*',
      'ai_models:*',
    ];
    
    if (category) {
      patterns.push(`parameter_configs:*${category}*`);
    }
    
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }
  }
  
  // 预热缓存
  async warmupCache(): Promise<void> {
    console.log('Starting parameter config cache warmup...');
    
    // 预加载所有参数分类
    const categories = ['style', 'scene', 'outfit', 'ratio', 'model'];
    await Promise.all(
      categories.map(category => 
        parameterConfigModel.findByCategory(category)
          .then(configs => {
            const cacheKey = this.buildCacheKey('parameter_configs', { category });
            return this.set(cacheKey, { categories: { [category]: configs } }, 1800);
          })
      )
    );
    
    // 预加载AI模型
    const models = await aiModelModel.findAll();
    const cacheKey = this.buildCacheKey('ai_models', {});
    await this.set(cacheKey, { models }, 300);
    
    console.log('Parameter config cache warmup completed');
  }
}
```

## 变更历史
- 2025-09-09 创建参数管理服务设计 v1.0，定义完整的参数配置管理和缓存策略
- 2025-09-09 FEAT-005 重构为JSON配置文件管理系统，移除数据库CRUD操作，增加配置文件加载和验证逻辑