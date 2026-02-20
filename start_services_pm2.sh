#!/bin/bash

# =================================================================
# SCRIPT KHỞI ĐỘNG 3 SERVICES CẰNG PM2 (CHẠY NGẦM)
# =================================================================

set -e

# 1. Kiểm tra & Cài đặt PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 Đang cài đặt PM2..."
    sudo npm install -g pm2
else
    echo "✅ PM2 đã được cài đặt."
fi

# 2. Start Backend
echo "🚀 Starting Backend (Port 8080)..."
cd backend
# Đảm bảo đã build (nếu chưa thì build)
if [ ! -d "target" ]; then
    echo "⚙️  Building Backend..."
    chmod +x mvnw
    ./mvnw clean package -DskipTests
fi
# Xóa process cũ nếu có
pm2 delete backend 2>/dev/null || true
# Chạy file jar tìm thấy trong target
pm2 start "java -jar target/*.jar" --name "backend"
cd ..

# 3. Start Agents
echo "🚀 Starting Agents (Port 4000)..."
cd agents
# Tạo venv nếu chưa có
if [ ! -d "venv" ]; then
    echo "⚙️  Creating Python virtual environment..."
    python3.11 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi
pm2 delete agents 2>/dev/null || true
# Chạy uvicorn qua PM2
pm2 start main.py --name "agents" --interpreter ./venv/bin/python
cd ..

# 4. Start Frontend
echo "🚀 Starting Frontend (Port 3000)..."
cd frontend
# Cài node modules nếu chưa có
if [ ! -d "node_modules" ]; then
    echo "⚙️  Installing dependencies..."
    npm install
fi
# Build Next.js
echo "⚙️  Building Frontend..."
npm run build
pm2 delete frontend 2>/dev/null || true
pm2 start "npm start" --name "frontend"
cd ..

# 5. Lưu trạng thái (Để tự chạy lại khi khởi động lại VPS)
pm2 save
pm2 startup | tail -n 1 | bash 2>/dev/null || true

echo "=================================================="
echo "✅ TẤT CẢ SERVICE ĐÃ CHẠY THÀNH CÔNG!"
echo "=================================================="
echo "📜 Danh sách các process đang chạy:"
pm2 list
echo ""
echo "💡 LỆNH QUẢN LÝ:"
echo "   - Xem logs:  pm2 logs"
echo "   - Monitor:   pm2 monit"
echo "   - Stop all:  pm2 stop all"
echo "   - Restart:   pm2 restart all"
echo "=================================================="
