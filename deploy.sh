#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "==================================="
echo "🚀 Starting Deployment Process..."
echo "==================================="

# 1. Build the frontend
echo ""
echo "📦 Building frontend..."
cd frontend
npm run build
cd ..

# 2. Copy frontend build to root
echo ""
echo "📂 Copying frontend build files to root..."
cp -r frontend/dist/* .

# 3. Swap .env files
echo ""
echo "🔄 Swapping .env files for production..."
if [ -f backend/.env ]; then
    mv backend/.env backend/.env.local_backup
fi
if [ -f backend/.env.host ]; then
    cp backend/.env.host backend/.env
fi

# 4. Stage changes
echo ""
echo "📝 Staging changes for git..."
# Force add backend/.env and backend/vendor
if [ -f backend/.env ]; then
    git add -f backend/.env
fi
if [ -d backend/vendor ]; then
    git add -f backend/vendor
fi
git add index.html assets/ fonts/ images/ mediapipe/ models/ vendor/ jostum-logo.png jostum.png jostumstaffs.png test_signature.png .htaccess || true
git add .

# 5. Commit changes
echo ""
echo "💾 Committing changes..."
# We use || true so the script doesn't fail if there's nothing to commit
git commit -m "Deploy to cPanel with vendor dependencies - $(date +'%Y-%m-%d %H:%M:%S')" || true

# 6. Push to GitHub
echo ""
echo "☁️  Pushing to GitHub..."
git push origin HEAD

# 7. Restore local environment
echo ""
echo "🔄 Restoring local .env files..."
if [ -f backend/.env ]; then
    rm -f backend/.env
fi
if [ -f backend/.env.local_backup ]; then
    mv backend/.env.local_backup backend/.env
fi

echo ""
echo "✅ Deployment pushed to GitHub successfully! cPanel can now pull this."
