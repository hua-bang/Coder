#!/bin/bash

# MR Generator - 自动生成 MR 标题和描述
# 基于当前分支与远程 master 的 diff 分析

set -e

# 配置
TARGET_BRANCH="origin/master"
PREVIEW_MODE=false

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --target)
            TARGET_BRANCH="$2"
            shift 2
            ;;
        --preview)
            PREVIEW_MODE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--target branch] [--preview]"
            echo "Generate MR title and description based on diff"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# 获取当前分支
current_branch=$(git branch --show-current)
if [[ "$current_branch" == "master" || "$current_branch" == "main" ]]; then
    echo "❌ Cannot create MR from master branch"
    exit 1
fi

# 确保远程分支是最新的
echo -e "${BLUE}Fetching latest changes...${NC}"
git fetch origin

# 获取 diff 统计
diff_stats=$(git diff --stat "$TARGET_BRANCH"...HEAD 2>/dev/null || echo "")
if [[ -z "$diff_stats" ]]; then
    echo "❌ No changes detected between $current_branch and $TARGET_BRANCH"
    exit 1
fi

# 获取变更文件列表
changed_files=$(git diff --name-only "$TARGET_BRANCH"...HEAD)
file_count=$(echo "$changed_files" | wc -l | tr -d ' ')

# 分析变更类型
analyze_change_type() {
    local files="$1"
    
    # 检查文件类型分布
    local has_src=$(echo "$files" | grep -c "src/" || echo 0)
    local has_test=$(echo "$files" | grep -c "test\|spec" || echo 0)
    local has_docs=$(echo "$files" | grep -c "\.md\|README\|docs/" || echo 0)
    local has_config=$(echo "$files" | grep -c "\.json\|\.yml\|\.yaml\|\.config" || echo 0)
    local has_fix=$(git log --oneline "$TARGET_BRANCH"...HEAD | grep -ic "fix\|bug\|repair" || echo 0)
    
    # 判断主要类型
    if [[ $has_fix -gt 0 ]]; then
        echo "fix"
    elif [[ $has_test -gt $(($file_count / 2)) ]]; then
        echo "test"
    elif [[ $has_docs -gt $(($file_count / 2)) ]]; then
        echo "docs"
    elif [[ $has_config -gt 0 ]]; then
        echo "config"
    else
        echo "feature"
    fi
}

# 提取主要模块
extract_main_module() {
    local files="$1"
    
    # 找出最常见的目录/模块
    local module=$(echo "$files" | sed 's|\(.*\)/.*|\1|' | sort | uniq -c | sort -nr | head -1 | awk '{print $2}' | sed 's|src/||' | sed 's|lib/||' | sed 's|components/||' | sed 's|pages/||')
    
    # 如果没有目录，从文件名提取
    if [[ -z "$module" || "$module" == "." ]]; then
        local first_file=$(echo "$files" | head -1 | sed 's|.*/||' | sed 's/\..*$//')
        module=$(echo "$first_file" | tr '_' ' ' | tr '-' ' ')
    fi
    
    # 转换为简洁描述
    echo "$module" | sed 's/$/ module/' | sed 's/src module/source/' | sed 's/config module/configuration/' | sed 's/test module/testing/' | sed 's/api/API/' | sed 's/ui/UI/' | sed 's/auth/authentication/' | sed 's/validation/validation/' | sed 's/utils/utilities/' | sed 's/services/service layer/' | sed 's/ [Mm]odule$//'
}

# 生成标题
generate_title() {
    local change_type="$1"
    local module="$2"
    
    case "$change_type" in
        "fix")
            echo "Fix ${module} issue"
            ;;
        "test")
            echo "Add tests for ${module}"
            ;;
        "docs")
            echo "Update ${module} documentation"
            ;;
        "config")
            echo "Update ${module} configuration"
            ;;
        "feature")
            echo "Add ${module} functionality"
            ;;
        *)
            echo "Update ${module}"
            ;;
    esac
}

# 生成描述点
generate_description_points() {
    local change_type="$1"
    local files="$2"
    
    local points=()
    
    # 基于文件类型生成描述
    while IFS= read -r file; do
        local basename=$(basename "$file" | sed 's/\..*$//')
        local dirname=$(dirname "$file" | sed 's|src/||')
        
        case "$file" in
            *.js|*.ts|*.py|*.go)
                if [[ "$change_type" == "fix" ]]; then
                    points+=("Fix $basename logic")
                else
                    points+=("Add $basename implementation")
                fi
                ;;
            *.test.js|*.spec.js|*.test.ts|*.spec.ts)
                points+=("Add tests for ${basename%.*}")
                ;;
            *.md|*.txt)
                points+=("Update documentation")
                ;;
            *.json|*.yml|*.yaml)
                points+=("Update configuration")
                ;;
            *.css|*.scss|*.less)
                points+=("Improve styling")
                ;;
        esac
    done <<< "$files"
    
    # 去重并保持顺序
    printf '%s\n' "${points[@]}" | awk '!seen[$0]++' | head -3
}

# 生成完整描述
generate_description() {
    local change_type="$1"
    local module="$2"
    local files="$3"
    
    local summary=""
    case "$change_type" in
        "fix")
            summary="Resolve ${module} issues and improve stability"
            ;;
        "test")
            summary="Enhance test coverage for ${module}"
            ;;
        "docs")
            summary="Improve ${module} documentation"
            ;;
        "config")
            summary="Update ${module} configuration"
            ;;
        "feature")
            summary="Implement ${module} functionality"
            ;;
        *)
            summary="Update ${module} implementation"
            ;;
    esac
    
    local points=$(generate_description_points "$change_type" "$files")
    
    echo "$summary"
    echo ""
    echo "$points" | sed 's/^/- /'
}

# 检查是否有 Jira ticket
get_jira_ticket() {
    local ticket=$(git log --oneline "$TARGET_BRANCH"...HEAD | grep -o "[A-Z][A-Z0-9]*-[0-9]*" | head -1 || echo "")
    echo "$ticket"
}

# 主逻辑
main() {
    echo -e "${BLUE}Analyzing changes...${NC}"
    
    # 分析变更
    change_type=$(analyze_change_type "$changed_files")
    main_module=$(extract_main_module "$changed_files")
    jira_ticket=$(get_jira_ticket)
    
    # 生成标题
    title=$(generate_title "$change_type" "$main_module")
    
    # 如果有 Jira ticket，添加到标题
    if [[ -n "$jira_ticket" ]]; then
        title="$jira_ticket: $title"
    fi
    
    # 截断标题到50字符以内
    if [[ ${#title} -gt 50 ]]; then
        title="${title:0:47}..."
    fi
    
    # 生成描述
    description=$(generate_description "$change_type" "$main_module" "$changed_files")
    
    # 输出结果
    if [[ "$PREVIEW_MODE" == true ]]; then
        echo -e "${GREEN}=== MR Preview ===${NC}"
        echo "Target: $TARGET_BRANCH"
        echo "Files changed: $file_count"
        echo ""
    fi
    
    echo "$title"
    echo ""
    echo "$description"
}

# 运行主程序
main