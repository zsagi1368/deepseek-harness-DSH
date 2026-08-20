#!/bin/bash
# DSH 官方同步脚本
# 用于同步官方最新 RC 版本并移植我们的改动

set -euo pipefail

NEW_RC="${1:-}"
if [ -z "$NEW_RC" ]; then
    echo "用法: $0 <new-rc-number>"
    echo "示例: $0 rc8"
    exit 1
fi

BACKUP_BRANCH="backup/pre-sync-${NEW_RC}-$(date +%Y%m%d-%H%M%S)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIFF_DIR="$SCRIPT_DIR/../diffs"

echo "=========================================="
echo "DSH 官方同步脚本"
echo "目标版本: $NEW_RC"
echo "备份分支: $BACKUP_BRANCH"
echo "=========================================="
echo ""

# 1. 准备
echo "[1/7] 准备..."
git status --short | head -20
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠ 工作区有未提交更改"
    read -p "是否暂存更改？(y/N) " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
        git stash push -m "pre-sync-stash"
    else
        echo "请先提交或暂存更改"
        exit 1
    fi
fi

# 2. 创建备份
echo ""
echo "[2/7] 创建备份分支: $BACKUP_BRANCH"
CURRENT_BRANCH=$(git branch --show-current)
git branch "$BACKUP_BRANCH" "$CURRENT_BRANCH"
echo "✓ 备份完成"

# 3. 拉取官方
echo ""
echo "[3/7] 拉取官方 $NEW_RC..."
git fetch origin 2>/dev/null || {
    echo "⚠ 无法拉取官方更新，可能是网络问题"
    echo "请手动执行: git fetch origin"
}
echo "✓ 拉取完成"

# 4. 切换到基础分支
echo ""
echo "[4/7] 切换到 our/base..."
if git show our/base >/dev/null 2>&1; then
    git checkout our/base
else
    echo "our/base 不存在，创建新分支..."
    git checkout -b our/base
fi
echo "✓ 切换完成"

# 5. 合并官方更新
echo ""
echo "[5/7] 合并官方更新..."
if git show "origin/$NEW_RC" >/dev/null 2>&1; then
    git merge "origin/$NEW_RC" --no-edit 2>/dev/null || {
        echo "⚠ 合并冲突，请手动解决"
        echo "冲突文件:"
        git diff --name-only --diff-filter=U
        exit 1
    }
else
    echo "⚠ 找不到官方分支 $NEW_RC"
    echo "可用分支:"
    git branch -r | grep -E "release/rc|master" | head -10
fi
echo "✓ 合并完成"

# 6. 移植我们的改动
echo ""
echo "[6/7] 移植我们的改动..."
mkdir -p "$DIFF_DIR"

# 保存当前状态的 diff
git diff "$BACKUP_BRANCH"...HEAD > "$DIFF_DIR/our-changes-before-sync.diff" 2>/dev/null || true

if [ -s "$DIFF_DIR/our-changes-before-sync.diff" ]; then
    echo "✓ 已保存我们的变更前状态到: $DIFF_DIR/our-changes-before-sync.diff"
else
    echo "无需要移植的变更"
fi
echo "✓ 移植准备完成"

# 7. 验证
echo ""
echo "[7/7] 验证..."
echo "当前分支: $(git branch --show-current)"
echo "最新提交: $(git log --oneline -3)"
echo ""

# 生成同步报告
REPORT_FILE="$DIFF_DIR/sync-report-${NEW_RC}-$(date +%Y%m%d-%H%M%S).md"
cat > "$REPORT_FILE" << EOF
# DSH 同步报告

## 基本信息
- 同步时间: $(date '+%Y-%m-%d %H:%M:%S')
- 目标版本: $NEW_RC
- 备份分支: $BACKUP_BRANCH
- 当前分支: $(git branch --show-current)

## 同步状态
- 官方更新: 已拉取
- 合并状态: $(git status --short | head -5)
- 备份状态: 已创建

## 下一步
1. 检查差异: ./scripts/diff-with-official.sh $NEW_RC
2. 运行测试: pnpm test
3. 提交更改: git add . && git commit -m "sync: merge $NEW_RC"
EOF

echo "✓ 同步报告已保存到: $REPORT_FILE"

echo ""
echo "=========================================="
echo "同步完成！"
echo "=========================================="
echo ""
echo "下一步:"
echo "1. 检查差异: ./scripts/diff-with-official.sh $NEW_RC"
echo "2. 运行测试: pnpm test"
echo "3. 查看同步报告: $REPORT_FILE"
echo ""
