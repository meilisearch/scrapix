#!/bin/bash

# Deploy Scrapix to Fly.io
# This script deploys the main application using existing Upstash Redis

set -e

echo "🚀 Deploying Scrapix to Fly.io"

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "❌ flyctl is not installed. Please install it first:"
    echo "   curl -L https://fly.io/install.sh | sh"
    exit 1
fi

# Check if user is logged in
if ! flyctl auth whoami &> /dev/null; then
    echo "❌ You need to login to Fly.io first:"
    echo "   flyctl auth login"
    exit 1
fi

echo "🟢 Deploying main application..."
flyctl deploy --config fly.toml --wait-timeout 600

echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Set your Upstash Redis URL:"
echo "   flyctl secrets set REDIS_URL=your-upstash-redis-url --app scrapix-server"
echo ""
echo "2. Set your MEILISEARCH_HOST_URL secret:"
echo "   flyctl secrets set MEILISEARCH_HOST_URL=your-meilisearch-url --app scrapix-server"
echo ""
echo "3. Set your MEILISEARCH_API_KEY secret:"
echo "   flyctl secrets set MEILISEARCH_API_KEY=your-api-key --app scrapix-server"
echo ""
echo "4. If using AI features, set OpenAI API key:"
echo "   flyctl secrets set OPENAI_API_KEY=your-openai-key --app scrapix-server"
echo ""
echo "5. Your scraper is available at: https://scrapix-server.fly.dev"
echo ""
echo "🔍 Useful commands:"
echo "   flyctl logs --app scrapix-server"
echo "   flyctl status --app scrapix-server"
echo "   flyctl scale count 2 --app scrapix-server  # Scale to 2 instances"
echo ""
echo "💡 To get your Upstash Redis URL:"
echo "   Check your Fly.io dashboard or run: flyctl redis status"