@echo off
REM SuperDesk Vercel Deployment Fix Script
echo 🚀 SuperDesk Vercel Deployment Fix
echo ==================================

REM Check if we're in the client directory
if not exist "package.json" (
    echo ❌ Error: Run this script from the client directory
    exit /b 1
)

REM Clean previous builds
echo 🧹 Cleaning previous builds...
if exist "build" rmdir /s /q build
if exist ".vercel" rmdir /s /q .vercel

REM Install dependencies
echo 📦 Installing dependencies...
npm install

REM Build the project
echo 🔨 Building React app...
npm run build

REM Check if build was successful
if not exist "build" (
    echo ❌ Build failed! Please check for errors above.
    exit /b 1
)

echo ✅ Build successful!

REM Deploy to Vercel
echo 🌐 Deploying to Vercel...
echo.
echo Run the following commands:
echo 1. vercel login
echo 2. vercel --prod
echo.
echo If you get 404 errors, the vercel.json has been updated to fix routing issues.

echo.
echo 🎯 Common Vercel Issues Fixed:
echo   ✅ Updated vercel.json for React Router compatibility
echo   ✅ Proper build output directory configuration
echo   ✅ SPA routing configuration
echo.
echo 📋 Next steps:
echo   1. Run: vercel --prod
echo   2. Copy the deployment URL
echo   3. Test the site
echo   4. If issues persist, check Vercel function logs

pause