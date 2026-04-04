#!/bin/bash

set -e

# Configuration
# Replace these with your actual server details
SERVER_IP="1.234.23.176"
REMOTE_USER="root" # CAUTION: Change this to your actual server username
REMOTE_DIR="/var/www/langbridge" # CAUTION: Change this to your actual project path on the server

echo "Deploying to $SERVER_IP..."

ssh $REMOTE_USER@$SERVER_IP << EOF
  set -e

  # Load environment to ensure npm/node/pm2 are found
  export NVM_DIR="\$HOME/.nvm"
  [ -s "\$NVM_DIR/nvm.sh" ] && \. "\$NVM_DIR/nvm.sh"
  source ~/.bashrc 2>/dev/null
  source ~/.profile 2>/dev/null
  
  cd $REMOTE_DIR
  
  echo "Pulling latest changes..."
  git stash
  git pull origin main
  
  echo "Installing dependencies..."
  # Default: keep using npm install
  # Alternative for clean lockfile-based installs:
  # rm -rf node_modules
  # npm ci
  npm install

  # If existing posts still point thumbnailUrl to original images,
  # run this once to generate thumbnail files and update the DB.
  # npm run backfill:thumbnails
  
  echo "Building application..."
  npm run build
  
  echo "Setting file permissions..."
  # Directories: rwxr-xr-x, Files: rw-r--r--
  # Exclude node_modules so executable package binaries keep their execute bit.
  find $REMOTE_DIR -path "$REMOTE_DIR/node_modules" -prune -o -type d -exec chmod 755 {} \;
  find $REMOTE_DIR -path "$REMOTE_DIR/node_modules" -prune -o -type f -exec chmod 644 {} \;
  # Shell scripts: rwxr-x--- (owner+group execute only)
  find $REMOTE_DIR -name "*.sh" -exec chmod 750 {} \;
  # Env files: rw------- (owner read/write only)
  [ -f "$REMOTE_DIR/.env" ]       && chmod 600 $REMOTE_DIR/.env
  [ -f "$REMOTE_DIR/.env.local" ] && chmod 600 $REMOTE_DIR/.env.local
  # SQLite DB files: rw-r----- (owner+group read)
  find $REMOTE_DIR -name "*.db" -exec chmod 640 {} \;
  find $REMOTE_DIR -name "*.sqlite" -exec chmod 640 {} \;

  echo "Reloading PM2 process..."
  # Failsafe: start if not running, reload if running
  pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
  
  echo "Deployment complete!"