#!/bin/bash
# DSH 移植兼容性检查脚本
# 用于检查我们的插件治理代码是否与官方版本兼容

set -euo pipefail

OFFICIAL_RC="${1:-rc7}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "DSH 移植兼容性检查"
echo "官方版本: $OFFICIAL_RC"
echo "=========================================="
echo ""

# 检查官方分支
if ! git show "origin/$OFFICIAL_RC" >/dev/null 2>&1; then
    echo "⚠ 找不到官方分支: $OFFICIAL_RC"
    echo "尝试使用 master..."
    OFFICIAL_RC="master"
fi

PASS=0
FAIL=0
WARN=0

# 1. 检查 PluginSpec 接口
echo "[1/8] 检查 PluginSpec 接口..."
if grep -q "interface PluginManifest" packages/plugins/spec.ts 2>/dev/null; then
    echo "  ✓ PluginManifest 接口存在"
    ((PASS++))
else
    echo "  ⚠ PluginManifest 接口缺失"
    ((WARN++))
fi

if grep -q "interface PluginContext" packages/plugins/spec.ts 2>/dev/null; then
    echo "  ✓ PluginContext 接口存在"
    ((PASS++))
else
    echo "  ⚠ PluginContext 接口缺失"
    ((WARN++))
fi
echo ""

# 2. 检查沙箱实现
echo "[2/8] 检查沙箱实现..."
if [ -f "packages/plugins/sandbox/process-sandbox.ts" ]; then
    echo "  ✓ ProcessSandbox 实现存在"
    ((PASS++))
else
    echo "  ⚠ ProcessSandbox 实现缺失"
    ((WARN++))
fi

if [ -f "packages/plugins/sandbox/ipc.ts" ]; then
    echo "  ✓ IPC 协议实现存在"
    ((PASS++))
else
    echo "  ⚠ IPC 协议实现缺失"
    ((WARN++))
fi
echo ""

# 3. 检查守卫实现
echo "[3/8] 检查守卫实现..."
for guard in load-guard run-guard health-guard; do
    if [ -f "packages/plugins/guards/${guard}.ts" ]; then
        echo "  ✓ ${guard} 实现存在"
        ((PASS++))
    else
        echo "  ⚠ ${guard} 实现缺失"
        ((WARN++))
    fi
done
echo ""

# 4. 检查类型定义
echo "[4/8] 检查类型定义..."
if grep -q "PluginStatus" packages/plugins/spec.ts 2>/dev/null; then
    echo "  ✓ PluginStatus 枚举存在"
    ((PASS++))
else
    echo "  ⚠ PluginStatus 枚举缺失"
    ((WARN++))
fi

if grep -q "PluginLevel" packages/plugins/spec.ts 2>/dev/null; then
    echo "  ✓ PluginLevel 枚举存在"
    ((PASS++))
else
    echo "  ⚠ PluginLevel 枚举缺失"
    ((WARN++))
fi
echo ""

# 5. 检查 API 兼容性
echo "[5/8] 检查 API 兼容性..."
OFFICIAL_TOOLS=$(git show "origin/$OFFICIAL_RC":packages/core/tools/src/index.ts 2>/dev/null | grep -c "export" || echo "0")
OUR_TOOLS=$(grep -c "export" packages/core/tools/src/index.ts 2>/dev/null || echo "0")

if [ "$OFFICIAL_TOOLS" -eq "$OUR_TOOLS" ]; then
    echo "  ✓ 工具导出数量一致 ($OUR_TOOLS)"
    ((PASS++))
else
    echo "  ⚠ 工具导出数量不一致 (官方: $OFFICIAL_TOOLS, 我们: $OUR_TOOLS)"
    ((WARN++))
fi
echo ""

# 6. 检查 Cordis 兼容性
echo "[6/8] 检查 Cordis 兼容性..."
OFFICIAL_CORDIS=$(git show "origin/$OFFICIAL_RC":vendor/cordis/src/index.ts 2>/dev/null | grep -c "export" || echo "0")
OUR_CORDIS=$(grep -c "export" vendor/cordis/src/index.ts 2>/dev/null || echo "0")

if [ "$OFFICIAL_CORDIS" -eq "$OUR_CORDIS" ]; then
    echo "  ✓ Cordis 导出数量一致 ($OUR_CORDIS)"
    ((PASS++))
else
    echo "  ⚠ Cordis 导出数量不一致 (官方: $OFFICIAL_CORDIS, 我们: $OUR_CORDIS)"
    ((WARN++))
fi
echo ""

# 7. 运行类型检查
echo "[7/8] 运行类型检查..."
if pnpm tsc --noEmit 2>/dev/null | grep -q "error TS"; then
    echo "  ⚠ 类型检查有错误"
    pnpm tsc --noEmit 2>&1 | head -20
    ((FAIL++))
else
    echo "  ✓ 类型检查通过"
    ((PASS++))
fi
echo ""

# 8. 运行基础测试
echo "[8/8] 运行基础测试..."
if pnpm test --run --reporter=minimal 2>/dev/null | grep -q "Test Files.*passed"; then
    echo "  ✓ 测试通过"
    ((PASS++))
else
    echo "  ⚠ 测试有失败"
    ((WARN++))
fi
echo ""

# 总结
echo "=========================================="
echo "检查完成！"
echo "=========================================="
echo "通过: $PASS"
echo "失败: $FAIL"
echo "警告: $WARN"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo "⚠ 有 $FAIL 项失败，请修复后再同步官方版本"
    exit 1
elif [ "$WARN" -gt 0 ]; then
    echo "⚠ 有 $WARN 项警告，请检查后再同步官方版本"
    exit 0
else
    echo "✓ 所有检查通过，可以安全同步官方版本"
    exit 0
fi
