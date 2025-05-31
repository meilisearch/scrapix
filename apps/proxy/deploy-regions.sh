#!/bin/bash

# Scrapix Proxy Multi-Region Deployment Script
# This script deploys the crawler proxy to multiple Fly.io regions

set -e

APP_NAME="scrapix-proxy"

# Define regions - add or remove as needed
REGIONS=(
  "iad"    # Washington D.C. (US East)
  "lax"    # Los Angeles (US West)
  "lhr"    # London (Europe)
  "sin"    # Singapore (Asia)
  "syd"    # Sydney (Australia)
)

echo "🚀 Starting multi-region deployment for $APP_NAME"

# Build and push the image first
echo "📦 Building and pushing image..."
fly deploy --build-only

for region in "${REGIONS[@]}"; do
  app_region_name="${APP_NAME}-${region}"
  
  echo ""
  echo "🌍 Deploying to region: $region (app: $app_region_name)"
  
  # Create fly.toml for this region
  sed "s/app = \"$APP_NAME\"/app = \"$app_region_name\"/" fly.toml > "fly-${region}.toml"
  sed -i "s/primary_region = \"iad\"/primary_region = \"$region\"/" "fly-${region}.toml"
  
  # Deploy to this region
  fly deploy --config "fly-${region}.toml" --region "$region"
  
  # Clean up temporary config
  rm "fly-${region}.toml"
  
  echo "✅ Deployed $app_region_name to $region"
done

echo ""
echo "🎉 Multi-region deployment complete!"
echo ""
echo "📋 Your proxy endpoints:"
for region in "${REGIONS[@]}"; do
  echo "  $region: https://${APP_NAME}-${region}.fly.dev"
done
echo ""
echo "💡 Usage example:"
echo "  curl -X POST https://${APP_NAME}-iad.fly.dev/crawl \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"url\": \"https://example.com\", \"options\": {\"crawlerType\": \"cheerio\"}}'"