#!/bin/bash
# DSH 基础分支建立脚本
# 安全地创建 our/base 分支并保留所有备份

set -euo pipefail

echo "=========================================="
echo "DSH 基础分支建立脚本"
echo "=========================================="
echo ""

# 1. 检查当前状态
echo "[1/5] 检查当前状态..."
git status --short | head -5
echo "..."
TOTAL_CHANGES=$(git status --short | wc -l)
echo "总变更数: $TOTAL_CHANGES"
echo ""

# 2. 创建多个备份
echo "[2/5] 创建备份分支..."
BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
git branch "backup/before-base-$BACKUP_TIMESTAMP"
git branch "backup/snapshot-$BACKUP_TIMESTAMP"
echo "✓ 已创建 2 个备份分支"
echo "  - backup/before-base-$BACKUP_TIMESTAMP"
echo "  - backup/snapshot-$BACKUP_TIMESTAMP"
echo ""

# 3. 创建 our/base 分支
echo "[3/5] 创建 our/base 分支..."
git checkout -b our/base
echo "✓ 已切换到 our/base 分支"
echo ""

# 4. 添加我们的核心文件（只添加新增的 25 个文件）
echo "[4/5] 添加核心文件..."
git add packages/plugins/
git add packages/core/hooks/
git add packages/credentials/
git add packages/session/session-persistence/
git add packages/settings/settings-audit/
git add packages/settings/settings-audit-log/
git add packages/compaction/compaction-progressive/
git add packages/llm/llm/src/constants.ts
git add packages/memory/
git add packages/core/system-prompt/src/locked-sections.ts
git add .github/workflows/plugin-compat.yml
git add planning/
git add CHANGELOG*.md
git add DELIVERY.md
git add FINAL-DELIVERY-REPORT.md
echo "✓ 已添加核心文件"
echo ""

# 5. 提交
echo "[5/5] 提交更改..."
git commit -m "feat: establish our/base branch with plugin governance system

This commit establishes the foundation for DSH plugin governance:
- PluginSpec unified interface definition
- Plugin security and audit systems
- Session persistence improvements
- Compaction progressive implementation
- Memory system enhancements
- Plugin compatibility CI workflow

Preserves all existing changes while establishing
the branch strategy for sustainable upstream sync."

echo ""
echo "=========================================="
echo "基础分支建立完成！"
echo "=========================================="
echo ""
echo "当前分支: $(git branch --show-current)"
echo "最新提交: $(git log -1 --oneline)"
echo ""
echo "备份分支:"
git branch | grep backup
echo ""
echo "下一步:"
echo "1. 运行差异比对: ./scripts/diff-with-official.sh rc7"
echo "2. 运行移植检查: ./scripts/check-transplant.sh"
echo "3. 创建功能分支: git checkout -b our/feat/sessions our/base"
