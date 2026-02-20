#!/bin/bash

# =================================================================
# SCRIPT CÀI ĐẶT RIÊNG NGINX & SSL (UBUNTU 22.04)
# =================================================================

set -e  # Dừng nếu lỗi

echo "🔧 Bắt đầu cấu hình Nginx..."

# 2. Cấu hình SSL
SSL_DIR="/etc/nginx/ssl"
SITE_CONFIG="/etc/nginx/sites-available/vivuplan"

echo "📂 Tạo thư mục SSL: $SSL_DIR"
sudo mkdir -p $SSL_DIR

# Copy chứng chỉ
if [ -f "nginx/ssl/vivuplan.io.vn.crt" ]; then
    sudo cp nginx/ssl/vivuplan.io.vn.crt $SSL_DIR/
    echo "✅ Đã copy Certificate."
else
    echo "❌ Lỗi: Không tìm thấy file 'nginx/ssl/vivuplan.io.vn.crt'. Bạn đã gộp file chưa?"
    exit 1
fi

# Copy Private Key
if [ -f "nginx/ssl/vivuplan.io.vn.key" ]; then
    sudo cp nginx/ssl/vivuplan.io.vn.key $SSL_DIR/
    sudo chmod 600 $SSL_DIR/vivuplan.io.vn.key
    echo "✅ Đã copy Private Key."
else
    echo "❌ Lỗi: Không tìm thấy file 'nginx/ssl/vivuplan.io.vn.key'. Hãy copy Private Key của bạn vào thư mục nginx/ssl/ và đổi tên cho đúng!"
    exit 1
fi

# 3. Cấu hình Site
echo "⚙️ Cập nhật cấu hình Nginx..."
if [ -f "nginx/vps-site-config.conf" ]; then
    sudo cp nginx/vps-site-config.conf $SITE_CONFIG
    
    # Enable site
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo ln -sf $SITE_CONFIG /etc/nginx/sites-enabled/
    
    # Test config
    echo "🔎 Kiểm tra cú pháp Nginx..."
    sudo nginx -t
    
    # Restart
    sudo systemctl restart nginx
    echo "✅ Đã khởi động lại Nginx."
    echo "🎉 HOÀN TẤT! Truy cập https://vivuplan.io.vn"
else
    echo "❌ Lỗi: Không thấy file config 'nginx/vps-site-config.conf'."
    exit 1
fi
