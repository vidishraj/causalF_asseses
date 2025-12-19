#!/bin/bash

# Production Update Script
# Use this to update the deployed application

set -e

APP_DIR="/var/www/causalfunnel"
BACKUP_DIR="/tmp/causalfunnel-backup-$(date +%Y%m%d_%H%M%S)"

echo "🔄 Starting production update..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Create backup
echo "💾 Creating backup..."
mkdir -p "$BACKUP_DIR"
cp -r "$APP_DIR" "$BACKUP_DIR/"

# Stop services
echo "⏹️ Stopping services..."
systemctl stop causalfunnel-backend

# Update backend
echo "🔧 Updating backend..."
cd "$APP_DIR/backend"
source venv/bin/activate
git pull origin main 2>/dev/null || echo "No git repository found"
pip install -r requirements.txt

# Update frontend (if build directory exists)
if [ -d "$(dirname "$0")/../dashboard/build" ]; then
    echo "🎨 Updating frontend..."
    rm -rf "$APP_DIR/frontend-build/*"
    cp -r "$(dirname "$0")/../dashboard/build/*" "$APP_DIR/frontend-build/"
fi

# Update tracking script
if [ -f "$(dirname "$0")/../tracking/tracker.js" ]; then
    echo "📊 Updating tracking script..."
    cp "$(dirname "$0")/../tracking/tracker.js" "$APP_DIR/tracking/"
fi

# Set permissions
echo "🔒 Setting permissions..."
chown -R www-data:www-data "$APP_DIR"

# Restart services
echo "🚀 Restarting services..."
systemctl start causalfunnel-backend
systemctl reload nginx

# Wait for service to start
sleep 3

# Health check
echo "🏥 Performing health check..."
if curl -f -s http://localhost:5500/api/health > /dev/null; then
    echo "✅ Backend is healthy!"
else
    echo "❌ Backend health check failed! Rolling back..."
    systemctl stop causalfunnel-backend
    rm -rf "$APP_DIR"
    mv "$BACKUP_DIR/causalfunnel" "$APP_DIR"
    systemctl start causalfunnel-backend
    echo "🔄 Rollback completed. Check logs for errors."
    exit 1
fi

# Cleanup old backup
rm -rf "$BACKUP_DIR"

echo "✅ Production update completed successfully!"
echo "🌐 Application should be running at your domain"