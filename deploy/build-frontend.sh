#!/bin/bash

# Frontend Build Script for Production

set -e

echo "🏗️ Building React frontend for production..."

# Change to dashboard directory
cd "$(dirname "$0")/../dashboard"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found! Make sure you're in the dashboard directory."
    exit 1
fi

# Update API endpoints for production
echo "🔧 Updating API endpoints for production..."

# Create production environment file
cat > .env.production << EOF
REACT_APP_API_BASE=https://your-domain.com/api
GENERATE_SOURCEMAP=false
EOF

# Update API_BASE in components for production
echo "📝 Updating component API endpoints..."

# Function to update API_BASE in a file
update_api_base() {
    local file=$1
    if [ -f "$file" ]; then
        # Create backup
        cp "$file" "$file.backup"
        
        # Update API_BASE to use environment variable or default
        sed -i.bak "s|const API_BASE = 'http://localhost:5500/api';|const API_BASE = process.env.REACT_APP_API_BASE || window.location.origin + '/api';|g" "$file"
        
        echo "  ✅ Updated $file"
    fi
}

# Update all component files
update_api_base "src/components/SessionsView.js"
update_api_base "src/components/HeatmapView.js"
update_api_base "src/components/StatsView.js"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for production
echo "🔨 Building production bundle..."
npm run build

# Verify build
if [ -d "build" ]; then
    echo "✅ Build completed successfully!"
    echo "📊 Build statistics:"
    du -sh build/
    echo ""
    echo "📁 Build contents:"
    ls -la build/
    echo ""
    echo "🚀 Ready for deployment!"
    echo "   Copy the 'build' directory contents to your web server"
else
    echo "❌ Build failed! Check the error messages above."
    exit 1
fi

# Restore original files
echo "🔄 Restoring original development files..."
restore_file() {
    local file=$1
    if [ -f "$file.backup" ]; then
        mv "$file.backup" "$file"
        echo "  ✅ Restored $file"
    fi
}

restore_file "src/components/SessionsView.js"
restore_file "src/components/HeatmapView.js"
restore_file "src/components/StatsView.js"

echo "✨ Frontend build process completed!"