#!/bin/bash

# EC2 인스턴스 초기 설정 스크립트
# EC2 인스턴스에 처음 배포할 때 한 번만 실행

set -e

echo "🎯 LangBridge EC2 초기 설정 시작..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 시스템 업데이트
echo -e "${GREEN}📦 시스템 패키지 업데이트...${NC}"
sudo apt-get update
sudo apt-get upgrade -y

# Node.js 설치 (v20.x LTS)
echo -e "${GREEN}📦 Node.js 설치...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# PATH 새로고침
export PATH="/usr/bin:/usr/local/bin:$PATH"
source ~/.bashrc 2>/dev/null || true

echo "Node.js 버전: $(node --version)"
echo "npm 버전: $(npm --version)"

# Git 설치
echo -e "${GREEN}📦 Git 설치...${NC}"
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
fi

# PM2 설치 (프로세스 관리자)
echo -e "${GREEN}📦 PM2 설치...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    export PATH="$HOME/.npm-global/bin:$PATH"
fi

# Nginx 설치 (리버스 프록시)
echo -e "${GREEN}📦 Nginx 설치...${NC}"
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
fi

# 애플리케이션 디렉토리 생성
echo -e "${GREEN}📂 애플리케이션 디렉토리 생성...${NC}"
mkdir -p ~/langbridge
cd ~/langbridge

# Git 저장소 클론
echo -e "${YELLOW}Git 저장소 URL을 입력하세요 (기본값: https://github.com/ocean3885/langbridge.git):${NC}"
echo -e "${YELLOW}엔터를 누르면 기본값 사용${NC}"
read -r REPO_URL
REPO_URL=${REPO_URL:-"https://github.com/ocean3885/langbridge.git"}

if [ ! -d ".git" ]; then
    git clone ${REPO_URL} .
else
    echo "Git 저장소가 이미 존재합니다."
fi

# 환경변수 파일 생성
echo -e "${GREEN}📝 환경변수 파일 생성...${NC}"
if [ ! -f ".env.local" ]; then
    cat > .env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google Cloud (TTS)
GOOGLE_APPLICATION_CREDENTIALS=/home/ubuntu/langbridge/google-credentials.json

# Node Environment
NODE_ENV=production
EOF
    echo -e "${YELLOW}⚠️  .env.local 파일을 수정해주세요!${NC}"
fi

# 의존성 설치
echo -e "${GREEN}📦 의존성 설치...${NC}"
npm install

# 빌드
echo -e "${GREEN}🏗️  프로젝트 빌드...${NC}"
npm run build

# PM2로 애플리케이션 시작
echo -e "${GREEN}🚀 PM2로 애플리케이션 시작...${NC}"
pm2 start npm --name "langbridge" -- start
pm2 startup systemd -u $USER --hp $HOME
pm2 save

# Nginx 설정
echo -e "${GREEN}⚙️  Nginx 설정...${NC}"
sudo tee /etc/nginx/sites-available/langbridge > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Nginx 사이트 활성화
sudo ln -sf /etc/nginx/sites-available/langbridge /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx 테스트 및 재시작
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# 방화벽 설정 (UFW)
echo -e "${GREEN}🔥 방화벽 설정...${NC}"
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
echo "y" | sudo ufw enable

echo -e "${GREEN}✅ 초기 설정 완료!${NC}"
echo ""
echo -e "${YELLOW}다음 단계:${NC}"
echo "1. .env.local 파일을 수정하여 환경변수 설정"
echo "2. Google Cloud 인증 파일을 업로드 (google-credentials.json)"
echo "3. pm2 restart langbridge 명령으로 재시작"
echo ""
echo "애플리케이션 상태 확인: pm2 status"
echo "로그 확인: pm2 logs langbridge"
