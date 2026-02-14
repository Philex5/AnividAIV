# 动态视频参数配置方案

## 问题描述

当前 VideoGenerator 组件对所有视频模型使用硬编码的参数配置：

- 参数名称固定（如 "Quality"）
- 参数选项固定（如 ["720p", "1080p"]）
- 不同模型实际支持的参数和名称不同

## 解决方案

### 1. 扩展模型配置结构

在 `ai-models.json` 中为每个视频模型添加 `ui_config` 字段：

```json
{
  "model_id": "Wan2.5",
  "model_type": "text2video",
  "ui_config": {
    "parameters": [
      {
        "key": "resolution",
        "type": "select",
        "label": "Resolution",
        "options": ["480p", "580p", "720p", "1080p"],
        "default": "720p",
        "api_mapping": "resolution"
      },
      {
        "key": "duration",
        "type": "number",
        "label": "Duration",
        "min": 3,
        "max": 10,
        "default": 5,
        "unit": "s",
        "api_mapping": "duration_seconds"
      },
      {
        "key": "aspect_ratio",
        "type": "select",
        "label": "Aspect Ratio",
        "options": ["1:1", "9:16", "16:9"],
        "default": "16:9",
        "api_mapping": "aspect_ratio"
      }
    ]
  }
}
```

### 2. 创建参数适配器

```typescript
// src/lib/video-params-adapter.ts
interface VideoParamConfig {
  key: string;
  type: "select" | "number" | "toggle";
  label: string;
  options?: string[];
  min?: number;
  max?: number;
  default: any;
  unit?: string;
  api_mapping: string;
}

export class VideoParamsAdapter {
  private modelConfig: AIModel;

  constructor(modelConfig: AIModel) {
    this.modelConfig = modelConfig;
  }

  getParamConfigs(): VideoParamConfig[] {
    return this.modelConfig.ui_config?.parameters || this.getDefaultParams();
  }

  transformToApiParams(uiParams: Record<string, any>): Record<string, any> {
    const apiParams: Record<string, any> = {};
    const configs = this.getParamConfigs();

    configs.forEach((config) => {
      const uiValue = uiParams[config.key];
      if (uiValue !== undefined) {
        apiParams[config.api_mapping] = uiValue;
      }
    });

    return apiParams;
  }

  private getDefaultParams(): VideoParamConfig[] {
    // 回退到默认参数配置
    return [
      {
        key: "resolution",
        type: "select",
        label: "Quality",
        options: ["720p", "1080p"],
        default: "720p",
        api_mapping: "resolution",
      },
      // ... 其他默认参数
    ];
  }
}
```

### 3. 创建动态参数组件

```typescript
// src/components/video/DynamicVideoParams.tsx
interface DynamicVideoParamsProps {
  modelConfig: AIModel;
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
}

export function DynamicVideoParams({
  modelConfig,
  values,
  onChange,
  disabled
}: DynamicVideoParamsProps) {
  const adapter = new VideoParamsAdapter(modelConfig);
  const paramConfigs = adapter.getParamConfigs();

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium mb-2">Video Parameters</h4>

      <div className="flex flex-wrap items-end gap-2">
        {paramConfigs.map(config => (
          <DynamicParamInput
            key={config.key}
            config={config}
            value={values[config.key]}
            onChange={(value) => onChange(config.key, value)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
```

### 4. 重构 VideoGenerator

```typescript
// 在 VideoGenerator 中使用动态参数
const [videoParams, setVideoParams] = useState<Record<string, any>>({});

// 初始化参数
useEffect(() => {
  if (selectedModel) {
    const adapter = new VideoParamsAdapter(selectedModel);
    const configs = adapter.getParamConfigs();
    const initialParams: Record<string, any> = {};

    configs.forEach((config) => {
      initialParams[config.key] = config.default;
    });

    setVideoParams(initialParams);
  }
}, [selectedModel]);

// 更新参数
const handleParamChange = (key: string, value: any) => {
  setVideoParams((prev) => ({ ...prev, [key]: value }));
};

// 转换为 API 参数
const getApiParams = () => {
  if (!selectedModel) return {};

  const adapter = new VideoParamsAdapter(selectedModel);
  return adapter.transformToApiParams(videoParams);
};
```

## 实现步骤

1. **第一阶段**：为现有模型添加 `ui_config` 配置
2. **第二阶段**：创建参数适配器和动态组件
3. **第三阶段**：重构 VideoGenerator 使用动态参数
4. **第四阶段**：更新 quote 接口调用使用新的参数结构

## 优势

- **可扩展性**：新增模型只需配置 JSON，无需修改代码
- **一致性**：统一的参数处理逻辑
- **灵活性**：支持不同类型的参数（选择框、数字输入等）
- **维护性**：参数配置与业务逻辑分离

## 向后兼容

- 如果模型没有 `ui_config`，使用默认参数配置
- 现有的 API 接口保持不变
- 逐步迁移现有模型配置
