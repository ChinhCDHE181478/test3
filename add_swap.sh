#!/bin/bash

# =================================================================
# SCRIPT TẠO SWAP RAM (Chống lỗi Killed/OOM trên VPS yếu)
# =================================================================

set -e

# Kiểm tra xem đã có swap chưa
if grep -q "swap" /proc/swaps; then
    echo "✅ VPS đã có Swap RAM."
    free -h
    exit 0
fi

echo "⚙️  Đang tạo file Swap 2GB..."

# 1. Tạo file swap 2GB
sudo fallocate -l 2G /swapfile

# 2. Phân quyền
sudo chmod 600 /swapfile

# 3. Format file thành swap
sudo mkswap /swapfile

# 4. Kích hoạt swap
sudo swapon /swapfile

# 5. Lưu vào fstab để tự kích hoạt khi khởi động lại
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 6. Tối ưu Swappiness (Dùng swap khi RAM còn 10%)
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf

echo "=================================================="
echo "✅ ĐÃ TẠO XONG 2GB SWAP RAM!"
echo "=================================================="
free -h
echo "=================================================="
echo "👉 Giờ bạn có thể thử chạy lại các service."
