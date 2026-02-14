# R2 存储删除脚本 - 快速参考

## 基本用法

### 预览模式（推荐先执行）
```bash
# Development 环境
npx tsx scripts/delete-r2-folder.ts --env development --folder user-uploads/123 --dry-run

# Production 环境
npx tsx scripts/delete-r2-folder.ts --env production --folder temp-files --dry-run
```

### 实际删除
```bash
# Development 环境
npx tsx scripts/delete-r2-folder.ts --env development --folder user-uploads/123

# Production 环境
npx tsx scripts/delete-r2-folder.ts --env production --folder temp-files
```

## 使用 package.json 快捷命令

```bash
# Development 环境预览
pnpm r2:delete:dev --folder temp-files --dry-run

# Production 环境预览
pnpm r2:delete:prod --folder temp-files --dry-run
```

## 常用场景

### 1. 清理临时文件
```bash
npx tsx scripts/delete-r2-folder.ts --env development --folder temp-uploads --dry-run
```

### 2. 删除用户数据
```bash
npx tsx scripts/delete-r2-folder.ts --env production --folder user-content/USER_ID --dry-run
```

### 3. 清理过期缓存
```bash
npx tsx scripts/delete-r2-folder.ts --env production --folder cache/2024-01 --dry-run
```

### 4. 批量删除大文件夹（自定义批次大小）
```bash
npx tsx scripts/delete-r2-folder.ts --env production --folder large-folder --batch-size 500
```

## 重要提示

⚠️ **删除是不可逆操作！**
1. 首次操作请使用 `--dry-run` 预览
2. 生产环境删除需要输入 `YES` 确认
3. 建议在非高峰期执行大量删除操作

## 完整文档

详见：[README-r2-delete.md](./README-r2-delete.md)