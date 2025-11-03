# Vercel Auto-Deploy Setup Guide

## 🔄 Git → Vercel Auto-Deploy Configuration

### Current Issue: Blank Page
**Root Cause**: Vercel is deploying from repository root instead of `client` folder.

### ✅ Fix Steps:

#### 1. Vercel Dashboard Configuration:
- Go to: https://vercel.com/dashboard
- Find project: `super-desk-client` (or similar)
- Click: **Settings** → **General**
- Set **Root Directory**: `client`
- Set **Framework Preset**: `Create React App`
- Click **Save**

#### 2. Environment Variables:
- Go to: **Settings** → **Environment Variables**
- Add: `REACT_APP_SERVER_URL` = `https://your-railway-server.railway.app`
- Click **Save**

#### 3. Trigger Redeploy:
```bash
# Any git push will now auto-deploy correctly
git add .
git commit -m "Trigger redeploy with correct config"
git push origin main
```

### 🎯 Expected Result:
- ✅ Vercel automatically detects changes in `client/` folder
- ✅ Builds React app correctly
- ✅ Deploys to your URL
- ✅ No more blank page!

### 🔍 Verification:
After configuration, visit your Vercel URL and you should see:
- Loading screen (if server not deployed)
- OR proper SuperDesk interface
- OR clear error message (instead of blank page)

### 📋 Alternative: Delete and Recreate Project
If settings don't work:
1. Delete current Vercel project
2. Import fresh from GitHub
3. Select `client` folder during setup
4. Auto-deploy will work perfectly

## ✅ Benefits of Git Auto-Deploy:
- 🚀 **Push to GitHub** → **Auto-deploy to Vercel**
- 🔄 **No manual commands** needed
- 📊 **Deployment history** in Vercel dashboard
- ⚡ **Instant rollbacks** via Vercel UI
- 🎯 **Environment-specific** deployments

## 🌐 Final Workflow:
```bash
# Make changes
echo "// Updated" >> client/src/App.js

# Push to GitHub  
git add .
git commit -m "Update app"
git push origin main

# ✅ Vercel auto-deploys in ~2 minutes!
```