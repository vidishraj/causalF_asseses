#!/bin/bash

# Causal Funnel Deployment Script
# Usage: ./deploy.sh [domain_name]

set -e

DOMAIN=${1:-"your-domain.com"}
APP_DIR="/var/www/causalfunnel"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend-build"

echo "🚀 Starting deployment for domain: $DOMAIN"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Detect package manager for later use
echo "📦 Detecting package manager..."
if command -v dnf &> /dev/null; then
    PKG_MANAGER="dnf"
elif command -v yum &> /dev/null; then
    PKG_MANAGER="yum"
elif command -v apt &> /dev/null; then
    PKG_MANAGER="apt"
else
    echo "❌ No supported package manager found (dnf, yum, or apt)"
    exit 1
fi

echo "📦 Using package manager: $PKG_MANAGER"

# Check if required packages are installed
echo "🔍 Checking for required packages..."
MISSING_PACKAGES=()

# Check for required packages
for cmd in nginx mongod python3 pip3 node npm git; do
    if ! command -v $cmd >/dev/null 2>&1; then
        MISSING_PACKAGES+=($cmd)
    fi
done

if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
    echo "❌ Missing required packages: ${MISSING_PACKAGES[*]}"
    echo "Please install these packages first:"
    if [ "$PKG_MANAGER" = "apt" ]; then
        echo "  sudo apt install -y nginx mongodb python3 python3-pip nodejs npm git"
    else
        echo "  sudo $PKG_MANAGER install -y nginx mongodb-org python3 python3-pip nodejs npm git"
    fi
    echo ""
    echo "For MongoDB on Oracle Linux, you may need to:"
    echo "  1. Add MongoDB repository"
    echo "  2. sudo $PKG_MANAGER install -y mongodb-org"
    echo ""
    echo "After installing packages, re-run this script."
    exit 1
else
    echo "✅ All required packages are installed"
fi

# Start and enable services
echo "🔧 Starting services..."
systemctl start nginx
systemctl start mongod
systemctl enable nginx
systemctl enable mongod

# Create application directory
echo "📁 Setting up application directory..."
mkdir -p $APP_DIR
mkdir -p $FRONTEND_DIR
mkdir -p "$APP_DIR/logs"

# Copy application files (assuming they're in current directory)
echo "📋 Copying application files..."
cp -r backend/* $BACKEND_DIR/ 2>/dev/null || echo "Backend files not found in current directory"
cp -r dashboard/build/* $FRONTEND_DIR/ 2>/dev/null || echo "Frontend build not found - will need to build separately"

# Set up Python virtual environment
echo "🐍 Setting up Python environment..."
cd $BACKEND_DIR
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Configure firewall for RHEL-based systems
if [ "$PKG_MANAGER" != "apt" ] && command -v firewall-cmd &> /dev/null; then
    echo "🔥 Configuring firewall..."
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
fi

# Set SELinux contexts (if SELinux is enabled)
if [ "$PKG_MANAGER" != "apt" ] && command -v setenforce &> /dev/null && getenforce 2>/dev/null | grep -q "Enforcing"; then
    echo "🔒 Configuring SELinux..."
    setsebool -P httpd_can_network_connect 1
    setsebool -P httpd_can_network_relay 1
fi

# Update file permissions
echo "🔒 Setting file permissions..."
if [ "$PKG_MANAGER" = "apt" ]; then
    chown -R www-data:www-data $APP_DIR
    USER_GROUP="www-data"
else
    chown -R nginx:nginx $APP_DIR
    USER_GROUP="nginx"
fi
chmod +x $BACKEND_DIR/venv/bin/gunicorn

# Create systemd service file
echo "⚙️ Creating systemd service..."
cat > /etc/systemd/system/causalfunnel-backend.service << EOF
[Unit]
Description=Causal Funnel Flask Backend
After=network.target mongod.service
Requires=mongod.service

[Service]
Type=notify
User=$USER_GROUP
Group=$USER_GROUP
WorkingDirectory=$BACKEND_DIR
Environment="PATH=$BACKEND_DIR/venv/bin"
Environment="MONGO_URI=mongodb://localhost:27017/causalfunnel"
Environment="FLASK_ENV=production"
Environment="HOST=127.0.0.1"
Environment="PORT=5500"
ExecStart=$BACKEND_DIR/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5500 --access-logfile $APP_DIR/logs/access.log --error-logfile $APP_DIR/logs/error.log app:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Create nginx configuration
echo "🌐 Creating nginx configuration..."
if [ "$PKG_MANAGER" = "apt" ]; then
    NGINX_CONF_PATH="/etc/nginx/sites-available/causalfunnel"
    NGINX_ENABLE_PATH="/etc/nginx/sites-enabled/"
else
    NGINX_CONF_PATH="/etc/nginx/conf.d/causalfunnel.conf"
    NGINX_ENABLE_PATH=""
fi

cat > $NGINX_CONF_PATH << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=tracking:10m rate=100r/s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    
    # Dashboard (React app)
    location / {
        root $FRONTEND_DIR;
        index index.html;
        try_files \$uri \$uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://127.0.0.1:5500/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers for API
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
        
        if (\$request_method = 'OPTIONS') {
            return 204;
        }
    }
    
    # Tracking script
    location /tracker.js {
        limit_req zone=tracking burst=50 nodelay;
        
        root $APP_DIR;
        alias $APP_DIR/tracking/tracker.js;
        add_header Access-Control-Allow-Origin * always;
        add_header Cache-Control "public, max-age=3600"; # 1 hour cache
    }
    
    # Demo pages (optional)
    location /demo/ {
        root $APP_DIR;
        index index.html;
    }
    
    # Health check
    location /health {
        proxy_pass http://127.0.0.1:5500/api/health;
        access_log off;
    }
    
    # Block common attack vectors
    location ~ /\. {
        deny all;
    }
    
    location ~* \.(env|git|svn)$ {
        deny all;
    }
}
EOF

# Enable nginx site
echo "✅ Configuring nginx..."
if [ "$PKG_MANAGER" = "apt" ]; then
    ln -sf /etc/nginx/sites-available/causalfunnel /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
else
    # For RHEL-based systems, config is already in conf.d
    rm -f /etc/nginx/conf.d/default.conf
fi

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
nginx -t

# Start services
echo "🚀 Starting application services..."
systemctl daemon-reload
systemctl enable causalfunnel-backend
systemctl start causalfunnel-backend
systemctl reload nginx

# Set up SSL certificate
echo "🔐 Setting up SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

# Create log rotation
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/causalfunnel << EOF
$APP_DIR/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        systemctl reload causalfunnel-backend
    endscript
}
EOF

# Create backup script
echo "💾 Creating backup script..."
cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/causalfunnel"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --db causalfunnel --out $BACKUP_DIR/db_$DATE

# Backup logs
tar -czf $BACKUP_DIR/logs_$DATE.tar.gz /var/www/causalfunnel/logs

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_*" -mtime +7 -exec rm -rf {} \;
find $BACKUP_DIR -name "logs_*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

chmod +x $APP_DIR/backup.sh

# Add backup cron job
echo "⏰ Setting up automated backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh >> $APP_DIR/logs/backup.log 2>&1") | crontab -

# Final status check
echo "🔍 Checking service status..."
systemctl status causalfunnel-backend --no-pager
systemctl status nginx --no-pager

echo "✅ Deployment completed!"
echo "🌐 Your application should be available at: https://$DOMAIN"
echo "📊 Dashboard: https://$DOMAIN"
echo "🔗 API: https://$DOMAIN/api/"
echo "📋 Tracking script: https://$DOMAIN/tracker.js"
echo ""
echo "📝 Logs location: $APP_DIR/logs/"
echo "💾 Backups location: /backup/causalfunnel/"
echo ""
echo "🔧 Useful commands:"
echo "  sudo systemctl status causalfunnel-backend"
echo "  sudo systemctl restart causalfunnel-backend"
echo "  sudo tail -f $APP_DIR/logs/app.log"
echo "  sudo $APP_DIR/backup.sh"