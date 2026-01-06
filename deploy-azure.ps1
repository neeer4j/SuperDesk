#!/usr/bin/env pwsh
# Azure Deployment Script for SuperDesk Server
# Run this from the project root

Write-Host "🚀 SuperDesk Azure Deployment Script" -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
if (!(Test-Path "server/index.js")) {
    Write-Host "❌ Error: Run this from the SuperDesk-clean root directory" -ForegroundColor Red
    exit 1
}

# Step 1: Install dependencies
Write-Host "📦 Installing server dependencies..." -ForegroundColor Yellow
cd server
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}
cd ..

# Step 2: Commit changes
Write-Host ""
Write-Host "📝 Committing changes..." -ForegroundColor Yellow
git add .
git commit -m "Configure Azure Web PubSub for Socket.IO"

# Step 3: Push to GitHub
Write-Host ""
Write-Host "⬆️  Pushing to GitHub..." -ForegroundColor Yellow
$branch = Read-Host "Push to which branch? (main/test) [default: test]"
if ([string]::IsNullOrWhiteSpace($branch)) {
    $branch = "test"
}

git push origin $branch

Write-Host ""
Write-Host "✅ Code pushed to $branch branch!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps in Azure Portal:" -ForegroundColor Cyan
Write-Host "1. Go to App Service: supderdesk-fgasbfdze6bwbbav" -ForegroundColor White
Write-Host "2. Deployment Center → Connect to GitHub → Select repo" -ForegroundColor White
Write-Host "3. Configuration → Application settings → Add:" -ForegroundColor White
Write-Host "   - AZURE_WEBPUBSUB_CONNECTION_STRING" -ForegroundColor Gray
Write-Host "   - NODE_ENV=production" -ForegroundColor Gray
Write-Host "   - PORT=8080" -ForegroundColor Gray
Write-Host "4. General settings → Enable Web sockets, Always On" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Server will be live at:" -ForegroundColor Cyan
Write-Host "https://supderdesk-fgasbfdze6bwbbav.centralindia-01.azurewebsites.net" -ForegroundColor Green
Write-Host ""
