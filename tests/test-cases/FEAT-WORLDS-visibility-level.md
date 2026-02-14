# 测试用例：FEAT-WORLDS-visibility-level

关联需求：FEAT-WORLDS（`docs/2-implementation/features/feature-worlds.md`）

## 前置条件
- 有一名订阅用户（is_sub=true）与一名非订阅用户（is_sub=false）
- 系统已存在预置世界观

## 用例 1：订阅用户创建私有世界观（主路径）
- 步骤：订阅用户在创建表单选择 `visibility_level = private` 并提交
- 期望：创建成功；返回世界观 `visibility_level = private`
- 期望：详情页仅创建者可访问

## 用例 2：非订阅用户设置私有可见性（错误/边界）
- 步骤：非订阅用户提交 `visibility_level = private`
- 期望：接口返回 403，错误信息为 "Private visibility requires a subscription"
- 期望：前端提示订阅限制并保持表单数据

## 用例 3：社区列表过滤（回归）
- 步骤：访问公开世界观列表（未登录或未指定 creator）
- 期望：仅返回 `visibility_level = public` 的世界观
