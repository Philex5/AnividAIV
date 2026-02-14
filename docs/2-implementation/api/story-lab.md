**Related**:
- Feature：`docs/2-implementation/features/feature-story-lab.md`
- 数据模型：`docs/1-specs/data-models.md`
- 后端模块：`docs/2-implementation/backend/module-story-lab.md`
- 前端页面：`docs/2-implementation/frontend/page-story-lab.md`
- 统一生成：`docs/2-implementation/backend/service-generation-architecture.md`

# API 契约：Story Lab

## 当前版本
- Version: v0.1 (Draft)
- Auth: 需要登录
- Errors: 统一英文

## 目标
- 将 Story Lab 定义为“编排层 API”：负责脚本解析、分镜规划、运行状态管理与重试。
- 媒体生成本身继续复用现有 generation 体系（image/video service + webhook）。

## 接口列表

### 1) 创建 Run
- **Endpoint**: `POST /api/story-lab/runs`
- **用途**: 创建一个 Story Lab run（草稿态）
- **文件位置**: `src/app/api/story-lab/runs/route.ts`（规划）
- **Request**:
  ```json
  {
    "title": "Episode 1 - Opening",
    "script": "A boy wakes up in a floating city...",
    "language": "en",
    "character_uuids": ["char_xxx"],
    "world_uuid": "world_xxx"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "run_uuid": "run_xxx",
      "status": "draft"
    }
  }
  ```

### 2) 解析 Script 为 Scene
- **Endpoint**: `POST /api/story-lab/runs/[run_uuid]/parse`
- **用途**: 执行 parsing 阶段，生成 SceneCard 列表
- **文件位置**: `src/app/api/story-lab/runs/[run_uuid]/parse/route.ts`（规划）
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "status": "planning",
      "scenes": [
        {
          "scene_uuid": "scene_xxx",
          "summary": "Hero enters academy",
          "intent": "introduce world",
          "location": "Sky Academy"
        }
      ]
    }
  }
  ```

### 3) 生成 Shot 计划
- **Endpoint**: `POST /api/story-lab/runs/[run_uuid]/plan`
- **用途**: 执行 planning 阶段，生成 ShotCard 与 ContinuityPlan
- **文件位置**: `src/app/api/story-lab/runs/[run_uuid]/plan/route.ts`（规划）

### 4) 更新 Shot（人工校正）
- **Endpoint**: `PATCH /api/story-lab/shots/[shot_uuid]`
- **用途**: 编辑镜头语义（camera/composition/motion/duration）
- **文件位置**: `src/app/api/story-lab/shots/[shot_uuid]/route.ts`（规划）

### 5) 启动生成
- **Endpoint**: `POST /api/story-lab/runs/[run_uuid]/generate`
- **用途**: 执行 generating 阶段，批量触发镜头生成任务
- **实现说明**:
  - 每个 Shot 映射到现有 `generations` 一条记录
  - 通过 `metadata.story_lab` 建立 run/scene/shot 关联
- **文件位置**: `src/app/api/story-lab/runs/[run_uuid]/generate/route.ts`（规划）

### 6) 查询 Run 详情
- **Endpoint**: `GET /api/story-lab/runs/[run_uuid]`
- **用途**: 获取 run 状态、场景、镜头、日志与统计
- **文件位置**: `src/app/api/story-lab/runs/[run_uuid]/route.ts`（规划）

### 7) Shot 级重试
- **Endpoint**: `POST /api/story-lab/shots/[shot_uuid]/retry`
- **用途**: 单镜头重试，不影响同 run 其他镜头
- **文件位置**: `src/app/api/story-lab/shots/[shot_uuid]/retry/route.ts`（规划）

### 8) 导出 Storyboard 包
- **Endpoint**: `POST /api/story-lab/runs/[run_uuid]/export`
- **用途**: 导出结构化 storyboard package（供 Manga/Video 模块消费）
- **文件位置**: `src/app/api/story-lab/runs/[run_uuid]/export/route.ts`（规划）

## 状态机
- `draft` -> `parsing` -> `planning` -> `generating` -> `packaging` -> `completed`
- 任一阶段失败进入 `error`
- 支持 `error` -> `planning/generating` 的恢复执行（取决于失败阶段）

## 错误码（英文）
- `RUN_NOT_FOUND` (404)
- `INVALID_RUN_STATUS` (409)
- `SCENE_PARSE_FAILED` (502)
- `SHOT_PLAN_FAILED` (502)
- `SHOT_GENERATION_FAILED` (502)
- `SHOT_RETRY_NOT_ALLOWED` (409)
- `EXPORT_FAILED` (500)
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)

## 与现有系统衔接
- 生成执行：复用 `src/services/generation/factory/generation-service-factory.ts`
- Prompt 外置：复用 `src/configs/prompts/` 与 `src/lib/config-manager.ts`
- 结果落库：复用 `generations/generation_images/generation_videos`

## 变更历史
- 2026-02-11 FEAT-story-lab 新增 Story Lab API 契约草案（影响：API/Feature）
