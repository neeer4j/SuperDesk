@echo off
REM SuperDesk Emergency Rollback Script
echo 🚨 SuperDesk Emergency Rollback
echo ===============================

REM Check if we're in a git repository
if not exist ".git" (
    echo ❌ Error: Not in a git repository
    exit /b 1
)

echo 📋 Recent commits:
git log --oneline -5

echo.
set /p choice="🔄 Do you want to rollback the last commit? (y/n): "

if /i "%choice%"=="y" (
    echo 🔄 Rolling back last commit...
    
    REM Create rollback commit
    git revert HEAD --no-edit
    
    if errorlevel 0 (
        echo ✅ Rollback commit created successfully
        
        set /p push="🚀 Push rollback to trigger auto-deploy? (y/n): "
        
        if /i "!push!"=="y" (
            echo 🚀 Pushing rollback...
            git push origin main
            
            if errorlevel 0 (
                echo.
                echo ✅ Rollback pushed successfully!
                echo 🌐 Auto-deployment will start in ~30 seconds
                echo 📊 Check status:
                echo    • Vercel: https://vercel.com/dashboard
                echo    • Railway: https://railway.app/dashboard
                echo.
                echo 🔍 Verify deployment:
                echo    npm run check-deployment
            ) else (
                echo ❌ Failed to push rollback
                exit /b 1
            )
        ) else (
            echo ℹ️  Rollback commit created but not pushed
            echo    Run 'git push origin main' when ready
        )
    ) else (
        echo ❌ Failed to create rollback commit
        exit /b 1
    )
) else (
    echo ❌ Rollback cancelled
)

pause