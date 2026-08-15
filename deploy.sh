#!/bin/bash
# HarnessX Web UI 部署脚本 — 阿里云 ECS (Ubuntu 22.04)
# 使用方法: bash deploy.sh

set -e

echo "===== HarnessX 部署脚本 ====="

# 1. 安装 Node.js 20
if ! command -v node &> /dev/null; then
  echo ">>> 安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

# 2. 克隆或更新代码
PROJECT_DIR="$HOME/harnessx"
if [ -d "$PROJECT_DIR" ]; then
  echo ">>> 更新代码..."
  cd "$PROJECT_DIR"
  git pull
else
  echo ">>> 克隆代码..."
  cd "$HOME"
  git clone <你的仓库地址> "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# 3. 安装依赖并构建
echo ">>> 安装核心依赖..."
npm install

echo ">>> 构建核心库..."
npm run build

echo ">>> 安装并构建前端..."
cd client
npm install
npm run build
cd ..

echo ">>> 安装服务端依赖..."
cd server
npm install
cd ..

# 4. 使用 PM2 启动服务（持久化运行）
if ! command -v pm2 &> /dev/null; then
  echo ">>> 安装 PM2..."
  sudo npm install -g pm2
fi

echo ">>> 启动服务..."
pm2 delete harnessx 2>/dev/null || true
pm2 start npx --name "harnessx" -- tsx server/index.ts
pm2 save

# 5. 配置防火墙
echo ">>> 配置防火墙..."
sudo ufw allow 3000/tcp 2>/dev/null || echo "ufw not available, skipping"

echo ""
echo "===== 部署完成！====="
echo "访问地址: http://<你的ECS公网IP>:3000"
echo ""
echo "常用命令:"
echo "  pm2 logs harnessx    # 查看日志"
echo "  pm2 restart harnessx # 重启服务"
echo "  pm2 stop harnessx    # 停止服务"