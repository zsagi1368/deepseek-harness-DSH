# DSH Git 配置检查与修复脚本

echo "=== DSH Git 配置检查 ==="

# 检查全局配置
echo ""
echo "【全局配置】"
git config --global --list | grep user || echo "未设置全局用户配置"

# 设置全局配置（如果未设置）
if [ -z "$(git config --global user.email)" ]; then
    echo ""
    echo "设置全局 Git 配置..."
    git config --global user.email "dsh-team@zsagi.us.ci"
    git config --global user.name "DSH Team"
    echo "✓ 全局配置已设置"
fi

# 检查当前仓库配置
echo ""
echo "【当前仓库配置】"
git config --list | grep user || echo "未设置仓库用户配置"

# 设置仓库配置
git config user.email "dsh-team@zsagi.us.ci"
git config user.name "DSH Team"
echo "✓ 仓库配置已设置"

echo ""
echo "=== 配置完成 ==="
git config --list | grep user
