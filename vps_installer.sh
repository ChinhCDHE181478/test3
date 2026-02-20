#!/bin/bash

# =================================================================
# SCRIPT CÀI ĐẶT TỰ ĐỘNG VPS (UBUNTU 22.04) CHO VIVUPLAN
# =================================================================

set -e  # Dừng ngay nếu có lỗi

echo "🚀 Bắt đầu cài đặt môi trường cho Vivuplan..."

# 1. Update System
echo "📦 Updating system..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop build-essential

# 2. Install Redis
echo "📦 Installing Redis..."
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 3. Install Java 21
echo "📦 Installing Java 21..."
sudo apt install -y wget apt-transport-https
wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo apt-key add -
echo "deb https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | sudo tee /etc/apt/sources.list.d/adoptium.list
sudo apt update
sudo apt install temurin-21-jdk -y

# 4. Install Python 3.11
echo "📦 Installing Python 3.11..."
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# 5. Install Node.js 20 & PM2
echo "📦 Installing Node.js 20 & PM2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2 yarn

# 6. Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# =================================================================
# CẤU HÌNH NGINX & SSL
# =================================================================
echo "🔧 Configuring Nginx & SSL..."

SSL_DIR="/etc/nginx/ssl"
SITE_CONFIG="/etc/nginx/sites-available/vivuplan"

# Tạo thư mục SSL
sudo mkdir -p $SSL_DIR

# Copy chứng chỉ (Giả sử script chạy từ thư mục gốc của project)
if [ -f "nginx/ssl/vivuplan.io.vn.crt" ]; then
    sudo cp nginx/ssl/vivuplan.io.vn.crt $SSL_DIR/
    echo "✅ Đã copy Certificate."
else
    echo "⚠️ Không thấy file crt tại nginx/ssl/vivuplan.io.vn.crt"
fi

# Copy Private Key (User phải tự bỏ vào)
if [ -f "nginx/ssl/vivuplan.io.vn.key" ]; then
    sudo cp nginx/ssl/vivuplan.io.vn.key $SSL_DIR/
    sudo chmod 600 $SSL_DIR/vivuplan.io.vn.key
    echo "✅ Đã copy Private Key."
else
    echo "⚠️ QUAN TRỌNG: Không thấy file Private Key (vivuplan.io.vn.key). Hãy upload nó vào nginx/ssl/ trước!"
fi

# Copy Nginx Config
if [ -f "nginx/vps-site-config.conf" ]; then
    sudo cp nginx/vps-site-config.conf $SITE_CONFIG
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf $SITE_CONFIG /etc/nginx/sites-enabled/
    echo "✅ Đã cập nhật Nginx config."
else
    echo "⚠️ Không thấy file nginx config."
fi

# Restart Nginx
sudo systemctl restart nginx
echo "✅ Nginx restarted."

# =================================================================
# START SERVICES
# =================================================================
echo "🚀 Starting Services..."

# Backend
if [ -d "backend" ]; then
    echo "Starting Backend..."
    cd backend
    chmod +x mvnw
    ./mvnw clean package -DskipTests
    pm2 delete backend 2>/dev/null || true
    pm2 start "java -jar target/*.jar" --name "backend"
    cd ..
fi

# Agents
if [ -d "agents" ]; then
    echo "Starting Agents..."
    cd agents
    python3.11 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    pm2 delete agents 2>/dev/null || true
    pm2 start "uvicorn main:app --host 0.0.0.0 --port 4000" --name "agents"
    deactivate
    cd ..
fi

# Frontend
if [ -d "frontend" ]; then
    echo "Starting Frontend..."
    cd frontend
    npm install
    npm run build
    pm2 delete frontend 2>/dev/null || true
    pm2 start "npm start" --name "frontend"
    cd ..
fi

pm2 save
pm2 startup

echo "✅✅✅ HOÀN TẤT! Truy cập https://vivuplan.io.vn để kiểm tra."
