---
name: git-workflow
description: Standard git workflow for handling staged changes - checkout new branch, add, commit, and push
description_zh: 处理已暂存代码的标准 git 工作流程 - 检查分支名称、创建新分支、添加、提交和推送
version: 1.1.0
author: Coder Team
---

# Git Workflow Skill

这个 skill 提供了一个完整的 git 工作流程，包括智能分支名称检查和自动创建合适的分支。

## 工作流程步骤

### 0. 检查当前分支名称
```bash
git branch --show-current
```

**分支名称检查规则：**
- ✅ 合适名称：`feature/*`, `fix/*`, `refactor/*`, `hotfix/*`, `docs/*`
- ❌ 不合适名称：`master`, `main`, `dev`, `develop`, 无意义名称

### 1. 检查当前状态
```bash
git status
```
检查当前分支状态，识别：
- 已修改的文件 (modified files)
- 未跟踪的文件 (untracked files)
- 已暂存的文件 (staged files)

### 2. 智能分支创建
根据当前分支名称和更改内容自动决定：

**如果不合适，创建新分支：**
```bash
# 基于更改类型自动命名
git checkout -b <new-branch-name>
```

**分支命名规则：**
- **功能开发**: `feature/<功能描述>`
  - 示例: `feature/user-authentication`, `feature/dark-mode`
- **Bug修复**: `fix/<问题描述>`
  - 示例: `fix/login-validation-error`, `fix/memory-leak`
- **重构**: `refactor/<重构区域>`
  - 示例: `refactor/auth-service`, `refactor/state-management`
- **热修复**: `hotfix/<严重问题>`
  - 示例: `hotfix/security-vulnerability`, `hotfix/crash-on-startup`
- **文档**: `docs/<文档类型>`
  - 示例: `docs/api-guide`, `docs/deployment-instructions`

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

### 5. 推送到远程仓库
```bash
git push origin <branch-name>
```

## 自动分支命名示例

### 场景1：从 master 分支开始
```bash
$ git branch --show-current
master  # ❌ 不合适

# 根据更改内容自动创建：
# - 如果有新增功能文件 → feature/new-compaction-system
# - 如果修复bug → fix/memory-leak-issue
# - 如果重构 → refactor/error-handling
```

### 场景2：从已有功能分支继续
```bash
$ git branch --show-current
feature/user-auth  # ✅ 合适，继续使用
```

## 分支检查自动化脚本

```bash
#!/bin/bash
# 分支名称检查脚本

current_branch=$(git branch --show-current)
echo "当前分支: $current_branch"

# 检查是否合适
if [[ "$current_branch" =~ ^(master|main|dev|develop)$ ]] || [[ "$current_branch" == "" ]]; then
    echo "❌ 当前分支名称不合适"
    
    # 分析更改内容建议分支名
    if git diff --name-only | grep -q "test"; then
        branch_type="test"
    elif git diff --name-only | grep -q "fix\|bug\|patch"; then
        branch_type="fix"
    elif git diff --name-only | grep -q "docs\|README"; then
        branch_type="docs"
    elif git diff --name-only | grep -q "refactor\|restructure"; then
        branch_type="refactor"
    else
        branch_type="feature"
    fi
    
    # 生成描述性名称
    timestamp=$(date +%Y%m%d-%H%M)
    suggested_name="${branch_type}/changes-${timestamp}"
    
    echo "建议分支名: $suggested_name"
    read -p "创建新分支? [y/N]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout -b "$suggested_name"
    fi
else
    echo "✅ 当前分支名称合适"
fi
```

## 完整工作流程示例

```bash
#!/bin/bash
# 完整 git 工作流程

echo "=== Git 工作流程开始 ==="

# 检查当前分支
current_branch=$(git branch --show-current)
echo "当前分支: $current_branch"

# 检查分支名称是否合适
if [[ "$current_branch" =~ ^(master|main|dev|develop)$ ]] || [[ "$current_branch" == "" ]]; then
    echo "❌ 当前分支不合适，创建新分支..."
    
    # 询问用户分支类型和名称
    read -p "分支类型 (feature/fix/refactor/hotfix/docs): " branch_type
    read -p "分支描述: " branch_desc
    
    new_branch="${branch_type}/${branch_desc// /-}"
    git checkout -b "$new_branch"
    echo "✅ 已创建并切换到: $new_branch"
else
    echo "✅ 继续使用当前分支: $current_branch"
fi

# 检查状态
echo "=== 检查更改 ==="
git status

# 添加文件
read -p "添加所有更改? [y/N]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add .
else
    echo "请手动添加需要的文件: git add <files>"
    exit 1
fi

# 提交
read -p "提交消息: " commit_msg
git commit -m "$commit_msg"

# 推送
git push origin "$(git branch --show-current)"

echo "=== Git 工作流程完成 ==="
```

## 快速命令参考

```bash
# 一键检查并创建合适分支
branch_check() {
    current=$(git branch --show-current)
    if [[ "$current" =~ ^(master|main|dev|develop)$ ]]; then
        echo "从 $current 创建功能分支..."
        read -p "分支描述: " desc
        git checkout -b "feature/${desc// /-}"
    else
        echo "当前分支合适: $current"
    fi
}

# 完整流程
alias gitflow='branch_check && git status && git add . && git commit && git push'
```

## 验证步骤

完成每个步骤后验证：
1. `git branch --show-current` - 确认分支名称合适
2. `git status` - 确认分支和暂存状态
3. `git log --oneline -3` - 查看最新提交
4. `git branch -a` - 确认远程分支已创建