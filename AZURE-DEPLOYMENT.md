# Azure Deployment Guide for SuperDesk Server

## 🌐 Your Azure Web PubSub for Socket.IO URL
```
https://superdesk-socketio.webpubsub.azure.com
```

**Service Type:** Azure Web PubSub for Socket.IO (Managed Socket.IO) ✅

This is the **recommended** service for SuperDesk - it's built specifically for Socket.IO applications!

---

## ⚙️ Azure Portal Configuration

### 1. Web PubSub Settings
Navigate to: **Web PubSub for Socket.IO** → **Settings**

Configure:
- **Unit count**: 1 (sufficient for personal use, ~1000 concurrent connections)
- **Service mode**: Default
- **CORS**: Allow your Vercel client URL

### 2. Add Allowed Origins (CORS)
Navigate to: **Settings** → **CORS**

Add these origins:
```
http://localhost:3000
https://super-desk-client.vercel.app
https://*.vercel.app
```

Click **Save**

### 3. Get Connection String
Navigate to: **Keys**

Copy the **Connection String** - you'll need this for deployment!

---

## 🚀 Deployment Steps

### Step 1: Install Dependencies Locally (Test First)

```powershell
cd C:\NEERAJVENU\PROJECTS\SuperDesk-clean\server
npm install
```

This installs the Azure Web PubSub SDK: `@azure/web-pubsub-socket.io`

### Step 2: Deploy to Azure App Service

**Option A: Deploy via GitHub (Recommended)**

1. Commit and push your changes:
```powershell
cd C:\NEERAJVENU\PROJECTS\SuperDesk-clean
git add .
git commit -m "Integrate Azure Web PubSub for Socket.IO"
git push origin main
```

2. Configure Azure Deployment Center:
   - Go to Azure Portal → **App Service** (`supderdesk-fgasbfdze6bwbbav`)
   - **Deployment** → **Deployment Center**
   - **Source**: GitHub
   - **Organization**: neeer4j
   - **Repository**: SuperDesk
   - **Branch**: main
   - **Build Provider**: App Service Build Service
   - **Root folder**: /server
   - Click **Save**

3. Add Environment Variables in Azure:
   - **Configuration** → **Application settings**
   - Add:
   ```
   AZURE_WEBPUBSUB_CONNECTION_STRING = Endpoint=https://superdesk-socketio.webpubsub.azure.com;AccessKey=REDACTED_SECRET;Version=1.0;
   
   NODE_ENV = production
   PORT = 8080
   CLIENT_URL = https://super-desk-client.vercel.app
   ```
   - Click **Save**

4. Enable Required Settings:
   - **Configuration** → **General settings**
   - Set:
     - ✅ **Web sockets**: ON
     - ✅ **Always On**: ON
     - ✅ **HTTP version**: 2.0
   - Click **Save**

**Option B: Deploy via Azure CLI**

#### Step 1: Push server code to GitHub
```powershell
cd C:\NEERAJVENU\PROJECTS\SuperDesk-clean
git add .
git commit -m "Configure for Azure deployment"
git push origin main
```

#### Step 2: Connect Azure to GitHub
1. Go to Azure Portal → Your App Service
2. **Deployment** → **Deployment Center**
3. **Source**: GitHub
4. Click **Authorize** and sign in to GitHub
5. **Organization**: neeer4j
6. **Repository**: SuperDesk
7. **Branch**: main
8. **Build Provider**: App Service Build Service (Oryx)
9. **Root folder**: /server
10. Click **Save**

Azure will automatically deploy when you push to GitHub!

---

### Option 2: Deploy via Azure CLI

```powershell
# Install Azure CLI (if not installed)
winget install Microsoft.AzureCLI

# Login
az login

# Deploy from local folder
cd C:\NEERAJVENU\PROJECTS\SuperDesk-clean\server
az webapp up --name supderdesk-fgasbfdze6bwbbav --resource-group [your-resource-group] --runtime "NODE:20LTS"
```

---

### Option 3: Deploy via VS Code

1. Install **Azure App Service** extension in VS Code
2. Sign in to Azure (click Azure icon in sidebar)
3. Right-click on `server` folder
4. Select **Deploy to Web App**
5. Choose your App Service: `supderdesk-fgasbfdze6bwbbav`

---

## ✅ Verify Deployment

### 1. Check server health
Open in browser:
```
https://supderdesk-fgasbfdze6bwbbav.centralindia-01.azurewebsites.net/api/health
```

Should return: `{"status":"ok"}`

### 2. Check WebRTC config
```
https://supderdesk-fgasbfdze6bwbbav.centralindia-01.azurewebsites.net/api/webrtc-config
```

Should return ICE servers config

### 3. View logs
Azure Portal → App Service → **Monitoring** → **Log stream**

---

## 🔧 Update Client to Use Azure Server

Already done! ✅ Client now points to:
```
https://supderdesk-fgasbfdze6bwbbav.centralindia-01.azurewebsites.net
```

Deploy the updated client to Vercel:
```powershell
cd C:\NEERAJVENU\PROJECTS\SuperDesk-clean\client
npm run build
vercel --prod
```

---

## 📊 Monitor Your Server

### View Logs
```powershell
az webapp log tail --name supderdesk-fgasbfdze6bwbbav --resource-group [your-resource-group]
```

### Check Metrics
Azure Portal → App Service → **Monitoring** → **Metrics**

Monitor:
- HTTP requests
- Response time
- CPU usage
- Memory usage

---

## 🐛 Troubleshooting

### Socket.io not connecting?
1. Verify **Web sockets** is ON in Configuration
2. Check CORS settings in server code
3. View logs: Azure Portal → Log stream

### Server not starting?
1. Check Application Insights logs
2. Verify Node version is 20 LTS
3. Check environment variables are set correctly

### TURN servers not working?
1. Add Cloudflare TURN credentials in Application settings
2. Test endpoint: `/api/webrtc-diagnostics`

---

## 💰 Cost Management

**Student Plan Benefits:**
- $100 free Azure credits
- Free App Service tier available
- Monitor spending: Azure Portal → Cost Management

**Optimize costs:**
- Use B1 (Basic) tier for development
- Scale up only when needed
- Set budget alerts

---

## 🔄 Auto-Deploy Workflow

Once GitHub integration is set up:
1. Make changes locally
2. `git add . && git commit -m "update"`
3. `git push origin main`
4. Azure automatically deploys! 🎉

---

## 📝 Next Steps

1. ✅ Configure Azure Portal settings (see above)
2. ✅ Choose deployment method and deploy
3. ✅ Test endpoints
4. ✅ Deploy updated client to Vercel
5. ✅ Test full SuperDesk workflow (create session, join, share screen)

**Your server is ready to deploy!** 🚀
