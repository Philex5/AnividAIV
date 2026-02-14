**Related**: FEAT-story-lab (`docs/2-implementation/features/feature-story-lab.md`)

# 模块：Story Lab Orchestrator

## 模块目标
- 将 Story Lab 作为“编排层”模块，连接脚本解析、镜头规划、媒体生成与导出。
- 复用既有 generation 服务，不重复实现图片/视频 Provider 调度。

## 责任边界
- Story Lab 负责：
  - run 生命周期管理
  - scene/shot 中间结构生成与维护
  - 阶段状态机推进
  - 局部重试与恢复
  - 导出 storyboard package
- Generation 负责：
  - 具体媒体任务创建
  - webhook 回调处理
  - 结果落库（images/videos）

## 建议目录（规划）
- `src/services/story-lab/story-lab-service.ts`
- `src/services/story-lab/story-lab-orchestrator.ts`
- `src/services/story-lab/story-lab-prompt-builder.ts`
- `src/models/story-lab-run.ts`
- `src/models/story-lab-scene.ts`
- `src/models/story-lab-shot.ts`
- `src/models/story-lab-log.ts`

## 关键流程

### 1) Create Run
1. 校验输入
2. 创建 run（`status=draft`）
3. 写入 input snapshot 日志

### 2) Parse
1. 状态切换到 `parsing`
2. 调用 prompt 模板执行 scene 解析
3. 落库 scene cards
4. 状态推进到 `planning`

### 3) Plan
1. 基于 scene 生成 shot cards
2. 运行 continuity 校验
3. 写入 planning 日志

### 4) Generate
1. 状态切换到 `generating`
2. 按 shot 组装 generation request
3. 调用现有 generationServiceFactory 创建任务
4. 记录 shot -> generation_uuid 映射

### 5) Export
1. 收集 run/scenes/shots/results
2. 组装 storyboard package JSON
3. 写入导出记录并返回

## 幂等与恢复
- 幂等键：`run_uuid + phase + version`
- 重试策略：
  - shot-level retry：仅重建目标 shot 的 generation
  - scene-level retry：重建 scene 下全部 shot
  - full rerun：重建整个 run
- 恢复策略：读取最近成功快照作为输入基础。

## 错误处理
- 原则：有问题直接抛出，不使用静默兜底掩盖错误。
- 错误最小字段：`phase`, `error_code`, `error_message`, `provider`, `shot_uuid`。
- 建议错误码：见 `docs/2-implementation/api/story-lab.md`。

## Prompt 与配置
- 统一使用 `src/configs/prompts/`。
- 建议新增：
  - `src/configs/prompts/story-lab/parse-scene.json`
  - `src/configs/prompts/story-lab/plan-shot.json`
  - `src/configs/prompts/story-lab/build-task.json`

## 事务与并发
- run 状态推进与日志写入应在同一事务中完成。
- shot 重试时使用 optimistic lock（`updated_at` 或 `version`）避免并发覆盖。

## 变更历史
- 2026-02-11 FEAT-story-lab 新增 Story Lab 后端模块设计草案（影响：Backend/Feature）
