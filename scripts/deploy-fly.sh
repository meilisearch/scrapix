#!/bin/bash

# Fly.io Deployment Script for Scrapix
# Usage: ./scripts/deploy-fly.sh [staging|production]

set -e

ENVIRONMENT=${1:-production}
APP_NAME="scrapix"

if [ "$ENVIRONMENT" == "staging" ]; then
    APP_NAME="scrapix-staging"
fi

echo "🚀 Deploying Scrapix to Fly.io ($ENVIRONMENT)..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI is not installed. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is authenticated
if ! fly auth whoami &> /dev/null; then
    echo "❌ Not authenticated with Fly.io. Please run: fly auth login"
    exit 1
fi

# Check if app exists, if not create it
if ! fly apps list | grep -q "$APP_NAME"; then
    echo "📦 Creating new Fly.io app: $APP_NAME"
    fly apps create "$APP_NAME"
fi

# Build and deploy
echo "🔨 Building and deploying..."
if [ -f "Dockerfile.fly" ]; then
    fly deploy --app "$APP_NAME" --dockerfile Dockerfile.fly
else
    fly deploy --app "$APP_NAME"
fi

# Check deployment status
echo "✅ Checking deployment status..."
fly status --app "$APP_NAME"

# Run health check
echo "🏥 Running health check..."
APP_URL=$(fly apps list --json | jq -r ".[] | select(.Name==\"$APP_NAME\") | .Hostname")
if [ ! -z "$APP_URL" ]; then
    if curl -f "https://$APP_URL/health" > /dev/null 2>&1; then
        echo "✅ Health check passed!"
        echo "🎉 Deployment successful! App is running at: https://$APP_URL"
    else
        echo "⚠️ Health check failed. Check logs with: fly logs --app $APP_NAME"
    fi
else
    echo "✅ Deployment complete! Run 'fly open --app $APP_NAME' to view your app"
fi

# Show recent logs
echo ""
echo "📋 Recent logs:"
fly logs --app "$APP_NAME" --limit 10