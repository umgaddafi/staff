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
    mv backend/.env.host backend/.env
fi

# 4. Stage changes
echo ""
echo "📝 Staging changes for git..."
# Force add backend/.env in case it's in .gitignore
git add -f backend/.env
git add -f backend/vendor
git add index.html assets/
git add .

# 5. Commit changes
echo ""
echo "💾 Committing changes..."
# We use || true so the script doesn't fail if there's nothing to commit
git commit -m "Deployed at  - $(date +'%Y-%m-%d %H:%M:%S')" || true

# 6. Push to GitHub
echo ""
echo "☁️  Pushing to GitHub..."
git push origin HEAD

# 7. Restore local environment
echo ""
echo "🔄 Restoring local .env files..."
if [ -f backend/.env ]; then
    mv backend/.env backend/.env.host
fi
if [ -f backend/.env.local_backup ]; then
    mv backend/.env.local_backup backend/.env
fi

echo ""
echo "✅ Deployment pushed to GitHub successfully! Bluehost can now pull this."
