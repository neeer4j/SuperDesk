@echo off
echo 🚀 SuperDesk Deployment Script
echo ==============================

if not exist package.json (
    echo ❌ Error: Run this script from the SuperDesk root directory
    exit /b 1
)

echo 📦 Installing dependencies...
call npm run install:all

echo 🏗️ Building client for production...
cd client
call npm run build
cd ..

echo ✅ Build complete!
echo.
echo 🌐 Deployment Options:
echo 1. Deploy client to Vercel:
echo    cd client ^&^& vercel --prod
echo.
echo 2. Deploy server to Railway:
echo    cd server ^&^& railway up
echo.
echo 3. Deploy server to Render:
echo    - Connect your GitHub repo to Render
echo    - Set build command: cd server ^&^& npm install
echo    - Set start command: cd server ^&^& npm start
echo.
echo 📝 Don't forget to:
echo - Update REACT_APP_SERVER_URL in client environment
echo - Update CLIENT_URL in server environment
echo - Configure CORS origins for your domains
echo.
echo 🎉 Ready for deployment!