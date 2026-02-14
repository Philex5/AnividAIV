# 测试用例：FEAT-OC-REBUILD Tag 系统

关联需求：FEAT-OC-REBUILD（docs/2-implementation/features/feature-oc-rebuild.md#tag-系统）

## 主路径

1. 登录用户访问 `/characters/{uuid}`（该角色归属当前用户）
2. 在“Tags”卡片中输入 `cyberpunk` 并按下 Enter
3. 期望：
   - Tag 立即显示为 Badge，调用 `PUT /api/oc-maker/characters/{uuid}` 返回 200
   - 成功 toast（Tags updated）出现，`characters.tags` 字段更新
4. 继续点击推荐 Tag（如 `neon`）
5. 期望：
   - 推荐 Tag 转为已选 Badge，不允许重复添加
   - 后端返回的 tags 数组顺序与客户端一致（保持 2 个标签）
6. 退出并重新打开页面
7. 期望：
   - `character.tags` 被正确加载，TagEditor 以只读状态显示（非 owner）
   - 点击 Tag 跳转 `/community?tags=cyberpunk`

## 错误/边界

### 超过 20 个 Tag
- 操作：连续添加 21 个 Tag（可脚本调用 API 或通过 UI）
- 期望：
  - 第 21 个请求被拒绝，前端 toast “Maximum 20 tags allowed”
  - 服务端返回 400，`characters.tags` 维持 20 个

### 非法字符 / 敏感词
- 操作：输入 ` Cyber Punk!!! ` 或包含 `nsfw`
- 期望：
  - 文本被规范化为合法格式（`cyber_punk`），敏感词直接拒绝
  - 敏感词场景返回 400 + 英文错误信息，不写库

### 未登录访问预置 Tag
- 操作：退出登录后访问 `/api/tags/presets`
- 期望：接口仍返回 200（公共数据），字段包含 `categories` 与 `popular`

## 回归

- 旧版角色创建/编辑接口不带 `tags` 字段时仍保持默认空数组
- 收藏、点赞、生成等与 Tag 无关功能不受影响
- `/api/oc-maker/characters?tags=tagA,tagB` 查询仍按公开/私有权限返回结果

## 变更历史
- 2026-01-11 FEAT-OC-REBUILD 新增 Tag 系统测试用例
