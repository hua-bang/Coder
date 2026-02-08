---
name: git-workflow
description: Standard git workflow for handling staged changes - checkout new branch, add, commit, and push
description_zh: 处理已暂存代码的标准 git 工作流程 - 创建新分支、添加、提交和推送
version: 1.0.0
author: Coder Team
---

# Git Workflow Skill

这个 skill 提供了一个完整的 git 工作流程，用于处理当前工作目录中的更改。

## 工作流程步骤

### 1. 检查当前状态
```bash
git status
```
检查当前分支状态，识别：
- 已修改的文件 (modified files)
- 未跟踪的文件 (untracked files)
- 已暂存的文件 (staged files)

### 2. 创建并切换到新分支
```bash
git checkout -b <branch-name>
```
建议使用描述性的分支名称：
- `feature/<feature-name>` - 新功能
- `fix/<bug-description>` - 修复
- `refactor/<refactor-area>` - 重构
- `hotfix/<critical-fix>` - 紧急修复

### 3. 添加更改到暂存区
```bash
git add <files...>
```
根据情况选择：
- `git add .` - 添加所有更改
- `git add -A` - 添加所有文件（包括删除的）
- `git add <specific-files>` - 只添加特定文件

### 4. 提交更改
```bash
git commit -m "<commit-message>"
```
提交消息格式：
```
<type>: <short description>

- <详细描述点1>
- <详细描述点2>
- ...
```

类型包括：
- `feat` - 新功能
- `fix` - 修复
- `refactor` - 重构
- `docs` - 文档
- `style` - 格式调整
- `test` - 测试
- `chore` - 构建/工具

### 5. 推送到远程仓库
```bash
git push origin <branch-name>
```

## 使用场景

### 场景1：处理工作目录更改
当工作目录有未暂存的更改时：
1. 运行 `git status` 查看更改
2. 创建功能分支
3. 选择性添加文件
4. 提交并推送

### 场景2：处理已暂存的更改
当已经有文件在暂存区时：
1. 直接创建新分支
2. 继续添加其他需要提交的文件
3. 提交所有暂存的更改
4. 推送

### 场景3：紧急修复
对于紧急修复：
1. 基于主分支创建 hotfix 分支
2. 只添加修复相关的文件
3. 简短但清晰的提交消息
4. 立即推送

## 最佳实践

### 分支命名
- 使用小写字母和连字符
- 保持简洁但描述性
- 遵循项目约定

### 提交消息
- 首行不超过 50 字符
- 使用现在时态
- 首字母小写
- 不包含句号

### 文件选择
- 避免提交无关文件
- 检查是否包含敏感信息
- 确保测试通过

## 示例工作流

```bash
# 1. 检查状态
git status

# 2. 创建分支
git checkout -b feature/user-authentication

# 3. 添加文件
git add src/auth/ src/middleware/

# 4. 提交
git commit -m "feat: add JWT-based user authentication

- Implement login/logout endpoints
- Add JWT token validation middleware
- Update user model with auth fields
- Add refresh token mechanism"

# 5. 推送
git push origin feature/user-authentication
```

## 常见问题和解决方案

### 问题1：推送被拒绝
```bash
git push --set-upstream origin <branch-name>
```

### 问题2：需要合并远程更改
```bash
git pull origin <branch-name>
```

### 问题3：提交消息需要修改
```bash
git commit --amend
```

## 验证步骤

完成每个步骤后验证：
1. `git status` - 确认分支和暂存状态
2. `git log --oneline -5` - 查看最新提交
3. `git branch` - 确认当前分支
4. 远程仓库网页确认分支已推送