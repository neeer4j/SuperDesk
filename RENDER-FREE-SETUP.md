# 🆓 FREE Render Deployment Guide

## Step-by-Step: Deploy SuperDesk Server for FREE

### 1. Sign Up to Render
- Go to: **render.com**  
- Click **"Get Started for Free"**
- Sign in with GitHub (recommended)

### 2. Create New Web Service
- Click **"New +"** → **"Web Service"**
- **Connect Repository**: Choose `neeer4j/SuperDesk`
- **Name**: `superdesk-server` (or any name)

### 3. Configure Settings
```
Root Directory: server
Environment: Node
Region: Any (choose closest to you)
Branch: main

Build Command: npm install
Start Command: npm start
```

### 4. Environment Variables (Important!)
Add these in Render dashboard:
```
NODE_ENV = production
CLIENT_URL = https://super-desk-client.vercel.app
PORT = 10000
```

### 5. Deploy!
- Click **"Create Web Service"**
- Wait ~3-5 minutes for deployment
- Copy your server URL (e.g., `https://superdesk-abc123.onrender.com`)

### 6. Update Client Configuration
After deployment, you'll get a URL like:
`https://superdesk-xyz123.onrender.com`

The client configuration has been pre-updated to use Render!

### 7. Test Connection
1. Visit your Vercel URL: `https://super-desk-client.vercel.app`
2. Should now show "Connected" instead of error!
3. Try creating a session

## 🎯 Benefits of Render Free Tier:
- ✅ **$0/month** cost
- ✅ **750 hours/month** included
- ✅ **Auto-deploy** from GitHub pushes
- ✅ **SSL certificates** included
- ✅ **WebSocket support** for Socket.io

## ⚠️ Free Tier Limitations:
- **Sleeps after 15 minutes** of inactivity
- **30-second cold start** when waking up
- **750 hours/month** limit (but plenty for testing!)

## 🚀 Expected Result:
After deployment:
- ✅ Server running on Render
- ✅ Client connecting successfully  
- ✅ SuperDesk fully functional
- ✅ **All for FREE!**

## 🔧 If Issues:
1. Check Render deployment logs
2. Verify environment variables
3. Ensure server URL is correct in client
4. Check CORS settings allow your Vercel domain