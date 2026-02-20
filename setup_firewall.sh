#!/bin/bash

# =================================================================
# SCRIPT CẤU HÌNH TƯỜNG LỬA (FIREWALL) BẢO MẬT VPS
# =================================================================

set -e

# 1. Cài đặt UFW (nếu chưa có)
if ! command -v ufw &> /dev/null; then
    echo "📦 Đang cài đặt UFW..."
    apt update && apt install ufw -y
fi

echo "⚙️  Đang reset cấu hình cũ..."
# Reset về mặc định để làm sạch
echo "y" | ufw reset

# =================================================================
# 2. CẤU HÌNH CƠ BẢN (INCOMING)
# =================================================================
echo "🛡️  Cấu hình chặn truy cập từ bên ngoài..."

# Mặc định: CHẶN TẤT CẢ đi vào, CHO PHÉP đi ra
ufw default deny incoming
ufw default allow outgoing

# Cho phép SSH (Quan trọng để không bị mất kết nối)
ufw allow ssh
ufw allow 22/tcp

# Cho phép Web Server hoạt động (HTTP/HTTPS)
ufw allow 80/tcp
ufw allow 443/tcp

# Cho phép Nginx Full (dự phòng)
ufw allow 'Nginx Full'

# =================================================================
# 3. CHẶN KẾT NỐI RA NGOÀI ĐÁNG NGỜ (OUTGOING)
# Để chống lại UDP Flood, Botnet dùng VPS tấn công người khác
# =================================================================
echo "🚫 Cấu hình chặn traffic tấn công ra ngoài..."

# Cho phép DNS (để phân giải tên miền)
ufw allow out 53
ufw allow out 53/udp

# Cho phép NTP (đồng bộ giờ hệ thống)
ufw allow out 123
ufw allow out 123/udp

# Cho phép HTTP/HTTPS ra ngoài (gọi API Google, update phần mềm...)
ufw allow out 80/tcp
ufw allow out 443/tcp

# SAU ĐÓ: CHẶN TOÀN BỘ UDP CÒN LẠI RA NGOÀI (Chống UDP Flood)
ufw deny out to any proto udp

# =================================================================
# 4. BẢO VỆ CÁC PORT NHẠY CẢM (DATABASE, REDIS)
# Chỉ cho phép nội bộ (localhost) dùng, cấm Internet
# =================================================================
# Redis (6379)
ufw allow from 127.0.0.1 to any port 6379
ufw deny 6379

# Postgres (5432)
ufw allow from 127.0.0.1 to any port 5432
ufw deny 5432

# Backend (8080) - Chỉ Nginx mới gọi được, hoặc cho phép nếu cần test
ufw allow from 127.0.0.1 to any port 8080
# Nếu bạn cần truy cập backend trực tiếp để test thì mở, còn không thì đóng
# ufw deny 8080 

# Agents (4000)
ufw allow from 127.0.0.1 to any port 4000

# =================================================================
# 5. KÍCH HOẠT
# =================================================================
echo "🚀 Đang kích hoạt tường lửa..."
echo "y" | ufw enable

echo "=================================================="
echo "✅ ĐÃ CẤU HÌNH FIREWALL XONG!"
echo "=================================================="
echo "👉 Trạng thái hiện tại:"
ufw status verbose
