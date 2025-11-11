#!/bin/bash

# LangBridge EC2 배포 스크립트
# 사용법: ./deploy.sh

set -e  # 에러 발생 시 스크립트 중단

echo "🚀 LangBridge 배포 시작..."

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}현재 브랜치: ${CURRENT_BRANCH}${NC}"

# 변경사항 확인
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}⚠️  커밋되지 않은 변경사항이 있습니다.${NC}"
    git status -s
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "배포가 취소되었습니다."
        exit 1
    fi
fi

# Git push
echo -e "${GREEN}📤 Git 저장소에 푸시 중...${NC}"
git push origin ${CURRENT_BRANCH}

# EC2 서버 정보 (환경변수 또는 직접 설정)
EC2_HOST=${EC2_HOST:-"52.79.212.162"}
EC2_USER=${EC2_USER:-"ubuntu"}
SSH_KEY=${SSH_KEY:-"~/.ssh/notebook-lenovo.pem"}
APP_DIR=${APP_DIR:-"/home/ubuntu/langbridge"}

echo -e "${GREEN}🔗 EC2 서버 연결 중: ${EC2_USER}@${EC2_HOST}${NC}"

# EC2에서 배포 실행
ssh -i ${SSH_KEY} ${EC2_USER}@${EC2_HOST} << 'ENDSSH'
    set -e
    
    echo "📂 애플리케이션 디렉토리로 이동..."
    cd /home/ubuntu/langbridge
    
    echo "⬇️  최신 코드 가져오기..."
    git pull origin main
    
    echo "📦 의존성 설치..."
    npm install --production=false
    
    echo "🏗️  프로젝트 빌드..."
    npm run build
    
    echo "🔄 PM2로 애플리케이션 재시작..."
    pm2 restart langbridge || pm2 start npm --name "langbridge" -- start
    
    echo "💾 PM2 설정 저장..."
    pm2 save
    
    echo "✅ 배포 완료!"
    
    echo "📊 애플리케이션 상태:"
    pm2 status
    
    echo "📝 최근 로그:"
    pm2 logs langbridge --lines 20 --nostream
ENDSSH

echo -e "${GREEN}✨ 배포가 성공적으로 완료되었습니다!${NC}"
echo -e "${YELLOW}애플리케이션 URL: http://${EC2_HOST}:3000${NC}"
