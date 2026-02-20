# 🌐 Hướng Dẫn Cài Đặt Nginx & SSL Sectigo (Thủ Công)

Do bạn đã mua chứng chỉ SSL (Sectigo), bạn cần upload chứng chỉ lên VPS thay vì dùng Certbot.

## 1. Chuẩn Bị Files Chứng Chỉ

Bạn cần có 3 thành phần:
1.  **Private Key** (`.key`): File được tạo ra khi bạn tạo CSR (Certificate Signing Request).
2.  **Certificate** (`.crt`): File chứng chỉ cho domain của bạn (do Sectigo gửi).
3.  **CA Bundle** (`.ca-bundle` hoặc `.crt`): File chứng chỉ trung gian (do Sectigo gửi).

**⚠️ Quan trọng: Gộp Certificate và Bundle**
Nginx cần 1 file `.crt` duy nhất chứa cả chứng chỉ của bạn và CA Bundle.
Mở text editor (Notepad), copy nội dung theo thứ tự này và lưu thành `vivuplan.io.vn.crt`:

```
[Nội dung Certificate của bạn]
[Nội dung CA Bundle 1]
[Nội dung CA Bundle 2 (nếu có)]
```

Kết quả bạn cần có 2 file upload lên VPS:
1.  `vivuplan.io.vn.crt` (Đã gộp)
2.  `vivuplan.io.vn.key` (Private key gốc)

---

## 2. Upload Lên VPS

Tạo thư mục chứa SSL trên VPS:

```bash
sudo mkdir -p /etc/nginx/ssl
```

Upload 2 file trên vào thư mục `/etc/nginx/ssl/` (dùng WinSCP hoặc FileZilla).

Set quyền bảo mật (quan trọng):
```bash
sudo chmod 600 /etc/nginx/ssl/vivuplan.io.vn.key
sudo chmod 644 /etc/nginx/ssl/vivuplan.io.vn.crt
```

---

## 3. Cài Đặt Nginx & Config

```bash
# Cài Nginx
sudo apt update
sudo apt install nginx -y
```

**Tạo file cấu hình:**
Copy nội dung từ file `nginx/vps-site-config.conf` (tôi đã cập nhật đường dẫn SSL) vào VPS:

```bash
sudo nano /etc/nginx/sites-available/vivuplan
# Paste nội dung vào và lưu lại (Ctrl+O -> Enter -> Ctrl+X)
```

**Kích hoạt:**

```bash
# Xóa default
sudo rm /etc/nginx/sites-enabled/default

# Link file mới
sudo ln -s /etc/nginx/sites-available/vivuplan /etc/nginx/sites-enabled/

# Kiểm tra config
sudo nginx -t
# Màn hình phải hiện: "syntax is ok", "test is successful"
```

**Khởi động Nginx:**

```bash
sudo systemctl restart nginx
```

---

## 4. Kiểm Tra

Truy cập `https://vivuplan.io.vn`. Trình duyệt sẽ hiện ổ khóa an toàn.

Nếu gặp lỗi:
- `nginx: [emerg] cannot load certificate`: Kiểm tra lại đường dẫn file `.crt` và `.key` trong config, hoặc file `.crt` gộp sai thứ tự.
- `502 Bad Gateway`: Kiểm tra các service (Backend/Frontend) có đang chạy ở localhost không.
