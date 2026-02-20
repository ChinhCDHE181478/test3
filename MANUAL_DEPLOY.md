# 🛠️ Hướng Dẫn Deploy Thủ Công (Không Docker) trên VPS Linux (Ubuntu 22.04)

Nếu bạn không muốn dùng Docker, bạn cần cài đặt môi trường cho từng service thủ công.

## 1. Cập Nhật Hệ Thống

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git unzip htop build-essential
```

## 2. Cài Đặt Java 21 & Maven (Cho Backend)

Backend chạy Spring Boot Java 21.

```bash
# Cài Java 21 (Eclipse Temurin - Chuẩn nhất)
wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | sudo apt-key add -
echo "deb https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print$2}' /etc/os-release) main" | sudo tee /etc/apt/sources.list.d/adoptium.list
sudo apt update
sudo apt install temurin-21-jdk -y

# Kiểm tra
java -version
# Output: openjdk version "21..."
```

## 3. Cài Đặt Python 3.11 & Redis (Cho Agents)

Agents cần Python mới và Redis để lưu session hội thoại.

```bash
# Cài Python 3.11 (Ubuntu 22.04 đã có sẵn python3.10, cần add repo cho 3.11)
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Cài Redis Server
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Kiểm tra
python3.11 --version
redis-cli ping # Trả về PONG
```

## 4. Cài Đặt Node.js 20 & PM2 (Cho Frontend)

Frontend Next.js cần Node.js. PM2 giúp chạy nền các ứng dụng.

```bash
# Cài Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Cài PM2 (Process Manager) và yarn
sudo npm install -g pm2 yarn

# Kiểm tra
node -v
pm2 -v
```

---

## 5. Upload Code & Cấu Hình

Upload code từ máy tính lên VPS (dùng WinSCP hoặc FileZilla). Giả sử code nằm ở `/root/EXE_Project`.

### Cấu Hình Biến Môi Trường (Quan Trọng)

Trên VPS, bạn cần sửa lại các file `.env` giống như đã làm ở local, nhưng:
- **`BACKEND_URL`**: `http://localhost:8080/api/v1` (Giữ nguyên localhost vì chạy trên cùng VPS)
- **`NEXT_PUBLIC_API_URL`**: `http://<IP_VPS>:8080/api/v1` (Frontend cần IP Public để browser gọi API)
- **`NEXT_PUBLIC_AGENT_API`**: `http://<IP_VPS>:4000`

---

## 6. Chạy Các Services

### A. Chạy Agents (Port 4000)

```bash
cd /root/EXE_Project/agents
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Chạy bằng PM2
pm2 start "uvicorn main:app --host 0.0.0.0 --port 4000" --name "agents"
```

### B. Chạy Backend (Port 8080)

```bash
cd /root/EXE_Project/backend
# Build JAR
chmod +x mvnw
./mvnw clean package -DskipTests

# Chạy bằng PM2 (Java Command)
pm2 start "java -jar target/*.jar" --name "backend"
```

### C. Chạy Frontend (Port 3000)

```bash
cd /root/EXE_Project/frontend
npm install
npm run build

# Chạy bằng PM2
pm2 start "npm start" --name "frontend"
```

## 7. Lưu Trạng Thái & Khởi Động Cùng VPS

```bash
# Để các service tự chạy lại khi VPS khởi động lại
pm2 save
pm2 startup
```

---

## 8. Cấu Hình Nginx (Reverse Proxy - Tùy Chọn)

Nếu muốn dùng tên miền (vivuplan.io.vn) thay vì IP:Port, cần cài Nginx.

```bash
sudo apt install -y nginx
```

Tạo file config `/etc/nginx/sites-available/vivuplan`:

```nginx
server {
    server_name vivuplan.io.vn;

    location / {
        proxy_pass http://localhost:3000; # Frontend
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://localhost:8080; # Backend
    }

    location /agents/ {
        proxy_pass http://localhost:4000/; # Agents
    }
}
```

Enable và restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/vivuplan /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```
