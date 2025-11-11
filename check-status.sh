#!/bin/bash

# EC2 서버 상태 체크 스크립트
# 로컬에서 실행하여 원격 서버 상태 확인

EC2_HOST="${EC2_HOST:-your-ec2-instance.compute.amazonaws.com}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/langbridge-key.pem}"

echo "📊 EC2 서버 상태 확인 중..."
echo "서버: ${EC2_USER}@${EC2_HOST}"
echo ""

ssh -i ${SSH_KEY} ${EC2_USER}@${EC2_HOST} << 'ENDSSH'
    echo "=== 시스템 정보 ==="
    echo "호스트명: $(hostname)"
    echo "가동 시간: $(uptime -p)"
    echo ""
    
    echo "=== 디스크 사용량 ==="
    df -h / | tail -n 1
    echo ""
    
    echo "=== 메모리 사용량 ==="
    free -h | grep Mem
    echo ""
    
    echo "=== PM2 상태 ==="
    pm2 status
    echo ""
    
    echo "=== Nginx 상태 ==="
    sudo systemctl status nginx --no-pager | head -n 3
    echo ""
    
    echo "=== 최근 로그 (마지막 10줄) ==="
    pm2 logs langbridge --lines 10 --nostream
    echo ""
    
    echo "=== 프로세스 정보 ==="
    pm2 info langbridge | grep -E "(pm2 id|name|restarts|uptime|memory)"
ENDSSH

echo ""
echo "✅ 상태 확인 완료"
