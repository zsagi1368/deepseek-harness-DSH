#!/bin/bash
# 重新创建核心插件目录结构

set -euo pipefail

echo "=== 创建核心插件目录结构 ==="

# 创建目录
mkdir -p packages/core/session-coordination/src
mkdir -p packages/core/session-coordination/tests
mkdir -p packages/test-support/mock-model/src
mkdir -p packages/test-support/mock-model/tests
mkdir -p packages/cap/terminal-persistent/src
mkdir -p packages/cap/terminal-persistent/tests

echo "✓ 目录结构已创建"

# 创建基础 package.json 文件
cat > packages/core/session-coordination/package.json << 'EOF'
{
  "name": "@dsh/core-session-coordination",
  "version": "1.0.0",
  "private": true,
  "description": "Cross-session coordination plugin"
}
EOF

cat > packages/test-support/mock-model/package.json << 'EOF'
{
  "name": "@dsh/test-support-mock-model",
  "version": "1.0.0",
  "private": true,
  "description": "Deterministic mock model plugin"
}
EOF

cat > packages/cap/terminal-persistent/package.json << 'EOF'
{
  "name": "@dsh/cap-terminal-persistent",
  "version": "1.0.0",
  "private": true,
  "description": "Persistent terminal plugin"
}
EOF

echo "✓ package.json 文件已创建"
echo ""
echo "=== 创建完成 ==="
echo "请继续实现各插件的核心代码"
