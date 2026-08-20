#!/bin/bash
# DSH 官方差异比对脚本
# 用于比对当前版本与官方版本的差异

set -euo pipefail

OFFICIAL_TAG="${1:-rc7}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIFF_DIR="$SCRIPT_DIR/../diffs"

echo "=========================================="
echo "DSH 官方差异比对"
echo "官方版本: $OFFICIAL_TAG"
echo "=========================================="
echo ""

# 检查官方分支是否存在
if ! git show "origin/$OFFICIAL_TAG" >/dev/null 2>&1; then
    echo "⚠ 找不到官方分支: $OFFICIAL_TAG"
    echo "可用分支:"
    git branch -r | grep -E "release/rc|master" | head -10
    exit 1
fi

# 1. 统计差异
echo "=== 文件变更统计 ==="
ADDED=$(git diff --name-only --diff-filter=A "origin/$OFFICIAL_TAG"...HEAD 2>/dev/null | wc -l)
MODIFIED=$(git diff --name-only --diff-filter=M "origin/$OFFICIAL_TAG"...HEAD 2>/dev/null | wc -l)
DELETED=$(git diff --name-only --diff-filter=D "origin/$OFFICIAL_TAG"...HEAD 2>/dev/null | wc -l)
CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)

echo "新增: $ADDED 个文件"
echo "修改: $MODIFIED 个文件"
echo "删除: $DELETED 个文件"
if [ "$CONFLICTS" -gt 0 ]; then
    echo "⚠ 冲突: $CONFLICTS 个文件"
fi
echo ""

# 2. 按目录分类
echo "=== 按目录分类 ==="
declare -A dir_counts
while IFS= read -r file; do
    dir=$(echo "$file" | cut -d'/' -f1-3)
    dir_counts["$dir"]=$(( ${dir_counts["$dir"]:-0} + 1 ))
done < <(git diff --name-only "origin/$OFFICIAL_TAG"...HEAD 2>/dev/null)

for dir in "${!dir_counts[@]}"; do
    echo "  $dir: ${dir_counts[$dir]} 个文件"
done | sort
echo ""

# 3. 关键文件详情
echo "=== 关键文件变更详情 ==="
KEY_FILES=(
    "packages/plugins/spec.ts"
    "packages/plugins/base.ts"
    "packages/core/tools/src/index.ts"
    "packages/core/session/src/index.ts"
    "vendor/cordis/src/fiber.ts"
    "vendor/cordis/src/registry.ts"
)

for file in "${KEY_FILES[@]}"; do
    if git diff --name-only "origin/$OFFICIAL_TAG"...HEAD 2>/dev/null | grep -q "$file"; then
        echo ""
        echo "--- $file ---"
        git diff "origin/$OFFICIAL_TAG"...HEAD -- "$file" 2>/dev/null | head -50 || true
    fi
done
echo ""

# 4. 接口变更检测
echo "=== 接口变更检测 ==="
git diff "origin/$OFFICIAL_TAG"...HEAD -- "*.ts" 2>/dev/null | grep -E "^\+.*(interface|type|enum|export)" | head -30 || echo "  无接口变更"
echo ""

# 5. 导出完整差异
mkdir -p "$DIFF_DIR"
OUTPUT_FILE="$DIFF_DIR/diff-with-${OFFICIAL_TAG}-$(date +%Y%m%d-%H%M%S).diff"
git diff "origin/$OFFICIAL_TAG"...HEAD > "$OUTPUT_FILE" 2>/dev/null || true
echo "完整差异已导出到: $OUTPUT_FILE"
echo ""

# 6. 提交统计
echo "=== 提交统计 ==="
echo "官方版本: $(git log -1 --format='%h %s' origin/$OFFICIAL_TAG)"
echo "我们的版本: $(git log -1 --format='%h %s' HEAD)"
echo "提交数差异: $(git rev-list --count "origin/$OFFICIAL_TAG"..HEAD)"
echo ""

echo "=========================================="
echo "比对完成！"
echo "=========================================="
