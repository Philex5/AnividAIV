## 关联模型api文档
- KIE-AI平台api规范说明：@docs/1-specs/model_apis/kie_api_specs.md
- KIE-AI平台图片生成模型api文档：@docs/1-specs/model_apis/kie-image-api.md
- KIE-AI平台视频生成模型api文档：@docs/1-specs/model_apis/kie-video-api.md

## LLM

### API实现

复用 @src/app/api/demo/gen-text/route.ts
使用openai的接口类型，将https://api.openai.com 替换为 https://api.open.xiaojingai.com/v1

对应api_key的环境变量：XIAOJING_API_KEY
C

### 模型列表
- gpt-3.5-turbo (输入:$0.9/M, 输出: $3.6/M), 基础模型
- gpt-4.1 (输入:$0.56/M, 输出: $4.5/M)，高级模型（订阅专属）


## 图片生成模型
### 模型列表：
- Z-image
- GPT Image 1 (GPT4o-Image)
- Nano-Banana
- Nano-Banana Pro 


## 视频生成模型

### 模型列表：
- sora 2 
- sora 2 pro  
- kling v2.5 Turbo
- Veo 3.1 (高级模型，订阅专属)
