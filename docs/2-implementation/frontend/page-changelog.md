记录版本变更记录

## 路由
/change

## 页面样式
title + desc 居中
下方按卡片样式组织每个版本的内容，按发布日期倒序, 一个版本一个changelog卡片
每个changelog卡片内容如下：
[版本号]                    [发布日期]
- [变更类型] [变更内容1]
- [变更类型] [变更内容2]
...

变更类型：Added, Fixed, Changed, Removed

## 内容解析
放在：docs/CHANGELOG.md
格式如下：
```
# Changelog

## [1.2.0] - 2024-06-10
### Added
- 新增用户导出功能
- 支持多语言切换

### Fixed
- 修复登录页面偶发崩溃的问题

### Changed
- 优化了数据加载速度

## [1.1.0] - 2024-05-01
### Added
- 新增注册功能

### Fixed
- 修复邮件通知失效的问题

### Removed
- 移除xxxx模型

```

## 注意：
1. 使用系统级国际化配置 @src/i18n/messages/;
2. 使用主题配色方案