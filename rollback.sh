#!/bin/bash

# SuperDesk Emergency Rollback Script
echo "🚨 SuperDesk Emergency Rollback"
echo "==============================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

echo "📋 Recent commits:"
git log --oneline -5

echo ""
read -p "🔄 Do you want to rollback the last commit? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Rolling back last commit..."
    
    # Create rollback commit
    git revert HEAD --no-edit
    
    if [ $? -eq 0 ]; then
        echo "✅ Rollback commit created successfully"
        
        read -p "🚀 Push rollback to trigger auto-deploy? (y/n): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "🚀 Pushing rollback..."
            git push origin main
            
            if [ $? -eq 0 ]; then
                echo ""
                echo "✅ Rollback pushed successfully!"
                echo "🌐 Auto-deployment will start in ~30 seconds"
                echo "📊 Check status:"
                echo "   • Vercel: https://vercel.com/dashboard"
                echo "   • Railway: https://railway.app/dashboard"
                echo ""
                echo "🔍 Verify deployment:"
                echo "   npm run check-deployment"
            else
                echo "❌ Failed to push rollback"
                exit 1
            fi
        else
            echo "ℹ️  Rollback commit created but not pushed"
            echo "   Run 'git push origin main' when ready"
        fi
    else
        echo "❌ Failed to create rollback commit"
        exit 1
    fi
else
    echo "❌ Rollback cancelled"
fi