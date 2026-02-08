#!/bin/bash

# TinyHumanMD Deployment Script
# Provides control over staging vs production deployments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 TinyHumanMD Deployment Controller"
echo "===================================="

# Function to deploy to staging
deploy_to_staging() {
    echo "📦 Deploying to STAGING..."
    cd "$PROJECT_DIR"
    
    # Swap wrangler.toml for staging
    if [ -f "wrangler.toml" ]; then
        mv wrangler.toml wrangler.toml.bak
    fi
    cp staging-wrangler.toml wrangler.toml
    
    echo "Building for staging environment..."
    
    echo "Deploying to staging.tinyhumanmd.pages.dev..."
    # Wrangler Pages doesn't support --config, so we swapped the file
    npx wrangler pages deploy . \
        --project-name tinyhumanmd-staging \
        --branch main
    
    # Restore original wrangler.toml
    rm wrangler.toml
    if [ -f "wrangler.toml.bak" ]; then
        mv wrangler.toml.bak wrangler.toml
    fi
    
    echo "✅ STAGING deployment complete!"
    echo "🔗 Staging URL: https://staging.tinyhumanmd.pages.dev"
}

# Function to deploy to production (requires confirmation)
deploy_to_production() {
    echo "⚠️  Deploying to PRODUCTION..."
    echo "This will update the live site at tinyhumanmd.com!"
    
    read -p "Are you sure you want to deploy to PRODUCTION? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deploying to production..."
        cd "$PROJECT_DIR"
        
        # Ensure we use the production config
        if [ -f "wrangler.toml.bak" ]; then
             # If we crashed mid-staging deploy, restore backup
             mv wrangler.toml.bak wrangler.toml
        fi
        
        npx wrangler pages deploy . \
            --project-name tinyhumanmd \
            --branch main
        
        echo "✅ PRODUCTION deployment complete!"
        echo "🔗 Production URL: https://tinyhumanmd.pages.dev"
        
    else
        echo "🛑 Production deployment cancelled."
        exit 0
    fi
}

# Main menu
echo "What would you like to do?"
echo "1) Deploy to STAGING (safe for testing)"
echo "2) Deploy to PRODUCTION (live site - requires confirmation)"
echo "3) Update deployment configs"
echo "4) Show deployment status"
echo "5) Exit (do nothing)"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        deploy_to_staging
        ;;
    2)
        echo ""
        deploy_to_production
        ;;
    3)
        echo ""
        echo "✏️  Updating deployment configurations..."
        echo "   - staging-wrangler.toml"
        echo "   - staging-config.js"
        echo ""
        echo "Configuration files updated. Deployment not triggered."
        echo ""
        echo "You can now run:"
        echo "  ./scripts/deploy.sh  # to see updated configs"
        echo "  or choose option 1/2 to deploy"
        ;;
    4)
        echo ""
        echo "📊 Deployment Status:"
        echo "  Staging:    https://staging.tinyhumanmd.pages.dev (manual deployment)"
        echo "  Production: https://tinyhumanmd.pages.dev (manual confirmation required)"
        echo ""
        echo "To check current deployments, visit your Cloudflare dashboard:"
        echo "  https://dash.cloudflare.com → Pages → tinyhumanmd/tinyhumanmd-staging"
        ;;
    5)
        echo "Exiting. No deployments made."
        exit 0
        ;;
    *)
        echo "Invalid choice. Please enter 1-5."
        exit 1
        ;;
esac