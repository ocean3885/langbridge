# EC2 배포 가이드

## 📋 사전 준비

1. **AWS EC2 인스턴스**
   - Ubuntu 22.04 LTS 권장
   - 최소 t2.small (2GB RAM)
   - 보안 그룹: 80(HTTP), 443(HTTPS), 22(SSH) 포트 오픈

2. **SSH 키**
   - EC2 인스턴스 생성 시 다운로드한 `.pem` 키 파일
   - 권한 설정: `chmod 400 your-key.pem`

3. **필수 정보**
   - Supabase URL 및 API 키
   - Google Cloud TTS 인증 파일

## 🚀 초기 배포 (처음 한 번만)

### 1. 로컬에서 배포 스크립트 설정

```bash
# 환경변수 설정 (선택사항)
export EC2_HOST="your-ec2-ip-or-domain.com"
export EC2_USER="ubuntu"
export SSH_KEY="~/.ssh/your-key.pem"
export APP_DIR="/home/ubuntu/langbridge"
```

### 2. EC2 인스턴스에 접속

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
```

### 3. 초기 설정 스크립트 실행

로컬에서 스크립트를 EC2로 전송:
```bash
scp -i ~/.ssh/your-key.pem ec2-setup.sh ubuntu@your-ec2-ip:~/
```

EC2에서 실행:
```bash
chmod +x ~/ec2-setup.sh
./ec2-setup.sh
```

### 4. 환경변수 설정

```bash
cd ~/langbridge
nano .env.local
```

다음 내용 입력:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GOOGLE_APPLICATION_CREDENTIALS=/home/ubuntu/langbridge/google-credentials.json
NODE_ENV=production
```

### 5. Google Cloud 인증 파일 업로드

로컬에서:
```bash
scp -i ~/.ssh/your-key.pem google-credentials.json ubuntu@your-ec2-ip:~/langbridge/
```

### 6. 애플리케이션 재시작

```bash
pm2 restart langbridge
pm2 logs langbridge
```

## 🔄 이후 배포

로컬에서 코드 변경 후:

```bash
# 실행 권한 부여 (최초 1회)
chmod +x deploy.sh quick-deploy.sh

# 일반 배포
./deploy.sh

# 또는 빠른 배포
./quick-deploy.sh
```

## 🛠️ 유용한 명령어

### PM2 관리

```bash
# 상태 확인
pm2 status

# 로그 확인
pm2 logs langbridge

# 재시작
pm2 restart langbridge

# 중지
pm2 stop langbridge

# 시작
pm2 start langbridge
```

### Nginx 관리

```bash
# 상태 확인
sudo systemctl status nginx

# 재시작
sudo systemctl restart nginx

# 설정 테스트
sudo nginx -t

# 로그 확인
sudo tail -f /var/log/nginx/error.log
```

### 디스크 및 메모리 확인

```bash
# 디스크 사용량
df -h

# 메모리 사용량
free -h

# 프로세스 확인
htop  # 또는 top
```

## 🔒 SSL/HTTPS 설정 (선택사항)

도메인이 있는 경우 Let's Encrypt로 무료 SSL 인증서 설치:

```bash
# Certbot 설치
sudo apt-get install -y certbot python3-certbot-nginx

# SSL 인증서 발급 (your-domain.com을 실제 도메인으로 변경)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

## 📊 모니터링

### PM2 모니터링

```bash
pm2 monit
```

### 로그 실시간 확인

```bash
# 애플리케이션 로그
pm2 logs langbridge --lines 100

# Nginx 액세스 로그
sudo tail -f /var/log/nginx/access.log

# Nginx 에러 로그
sudo tail -f /var/log/nginx/error.log
```

## 🐛 트러블슈팅

### 애플리케이션이 시작되지 않을 때

```bash
# 로그 확인
pm2 logs langbridge --err

# 수동으로 빌드 및 실행 테스트
cd ~/langbridge
npm run build
npm start
```

### 메모리 부족

```bash
# 스왑 메모리 추가 (2GB)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 포트가 이미 사용 중

```bash
# 포트 3000을 사용하는 프로세스 확인
sudo lsof -i :3000

# 프로세스 종료
sudo kill -9 <PID>
```

## 📝 환경변수 업데이트

```bash
cd ~/langbridge
nano .env.local
# 환경변수 수정 후
pm2 restart langbridge
```

## 🔄 롤백

문제가 발생한 경우 이전 버전으로 롤백:

```bash
cd ~/langbridge
git log --oneline  # 커밋 히스토리 확인
git reset --hard <commit-hash>  # 특정 커밋으로 되돌리기
npm install
npm run build
pm2 restart langbridge
```

## 📞 지원

문제가 발생하면:
1. `pm2 logs langbridge` 확인
2. `/var/log/nginx/error.log` 확인
3. EC2 인스턴스 상태 및 보안 그룹 확인
