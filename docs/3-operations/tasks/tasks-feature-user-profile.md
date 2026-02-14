- [ ] FEAT-USER-PROFILE 用户详情页
  - [ ] 验收：支持从社区头像与 Header Profile 入口进入；展示头像/名称/简介/公开角色/公开世界/公开 artworks；本人可更新 profile 与背景图
  - [ ] 设计：`docs/2-implementation/features/feature-user-profile.md`
  - [ ] 测试：`tests/test-cases/FEAT-USER-PROFILE-user-profile.md`
  - [ ] 依赖：新增 users profile 字段迁移（`docs/1-specs/data-models.md`）

- [ ] FEAT-USER-PROFILE 后端
  - [ ] 新增 profile 相关接口与服务聚合
  - [ ] 权限与校验（本人可写，非本人只读）
  - [ ] 错误信息英文统一

- [ ] FEAT-USER-PROFILE 前端
  - [ ] 新增用户详情页
  - [ ] Header 下拉 Profile 入口与社区头像跳转
  - [ ] Profile 编辑与背景上传
