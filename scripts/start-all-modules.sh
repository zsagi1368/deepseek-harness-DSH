#!/bin/bash
# DSH 插件治理体系 - 全模块实现启动脚本
# 并行启动所有模块开发

set -euo pipefail

echo "=========================================="
echo "DSH 插件治理体系 - 全模块实现启动"
echo "=========================================="
echo ""

# 检查当前分支
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "our/base" ]; then
    echo "⚠ 当前不在 our/base 分支，请先切换:"
    echo "  git checkout our/base"
    exit 1
fi

echo "✓ 当前分支: $CURRENT_BRANCH"
echo ""

# 创建所有必要的目录
echo "[1/3] 创建目录结构..."
mkdir -p packages/plugins/{spec,base,sandbox,guards,registry}
mkdir -p packages/plugins/sandbox/{process,worker,inline}
mkdir -p packages/plugins/guards/{load,run,health}
mkdir -p packages/plugins/test
mkdir -p packages/core/session-coordination/src
mkdir -p packages/test-support/mock-model/src
mkdir -p packages/cap/terminal-persistent/src
mkdir -p packages/client/ui-plugin-status/src
mkdir -p templates/plugin-{tool,hook,service}/{src,tests}
echo "✓ 目录结构已创建"
echo ""

# 设置 Git 配置（如果尚未设置）
echo "[2/3] 检查 Git 配置..."
if ! git config user.email 2>/dev/null | grep -q "@"; then
    git config user.email "dsh-team@zsagi.us.ci"
    git config user.name "DSH Team"
    echo "✓ Git 配置已设置"
else
    echo "✓ Git 配置已存在"
fi
echo ""

# 创建 package.json
echo "[3/3] 创建包配置..."
cat > packages/plugins/package.json << 'EOF'
{
  "name": "@dsh/plugins",
  "version": "0.1.0",
  "private": true,
  "description": "DSH Plugin Governance System",
  "type": "module",
  "exports": {
    "./spec": "./src/spec.ts",
    "./base": "./src/base.ts",
    "./sandbox": "./src/sandbox/index.ts",
    "./guards": "./src/guards/index.ts",
    "./registry": "./src/registry.ts"
  }
}
EOF

echo "✓ 包配置已创建"
echo ""

echo "=========================================="
echo "准备完成！"
echo "=========================================="
echo ""
echo "下一步:"
echo "1. 开始实现 PluginSpec: packages/plugins/spec/index.ts"
echo "2. 开始实现 BasePlugin: packages/plugins/base/base.ts"
echo "3. 开始实现沙箱层: packages/plugins/sandbox/"
echo "4. 开始实现守卫: packages/plugins/guards/"
echo ""
echo "使用以下命令启动并行开发:"
echo "  delegate_task ( spawning 多个子代理 )"
echo ""
