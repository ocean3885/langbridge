#!/bin/bash

# 빠른 배포 스크립트 (로컬에서 실행)
# EC2에 빠르게 배포하고 싶을 때 사용

set -e

# EC2 정보 설정
EC2_HOST="${EC2_HOST:-your-ec2-instance.compute.amazonaws.com}"
EC2_USER="${EC2_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-~/.ssh/langbridge-key.pem}"
APP_DIR="/home/ubuntu/langbridge"

echo "🚀 빠른 배포 시작..."

# Git push
git push origin main

# EC2에서 배포
ssh -i ${SSH_KEY} ${EC2_USER}@${EC2_HOST} "cd ${APP_DIR} && git pull && npm install && npm run build && pm2 restart langbridge"

echo "✅ 배포 완료!"
