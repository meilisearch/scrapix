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

# Function to deploy with retries
deploy_with_retry() {
  local app_name=$1
  local config_file=$2
  local region=$3
  local max_retries=3
  local retry_count=0

  while [ $retry_count -lt $max_retries ]; do
    echo "Attempt $((retry_count + 1)) of $max_retries..."
    
    # Try to destroy any existing machines that might be stuck
    fly machines destroy --app "$app_name" --yes || true
    
    # Wait a bit before trying again
    sleep 5
    
    if fly deploy --config "$config_file" --regions "$region" --app "$app_name"; then
      return 0
    fi
    
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $max_retries ]; then
      echo "Deployment failed, waiting before retry..."
      sleep 10
    fi
  done
  
  echo "Failed to deploy after $max_retries attempts"
  return 1
}

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
  sed -i '' "s/primary_region = \"iad\"/primary_region = \"$region\"/" "fly-${region}.toml"
  
  # Create the app if it doesn't exist
  echo "Checking if app $app_region_name exists..."
  if ! fly apps show "$app_region_name" >/dev/null 2>&1; then
    echo "Creating new app: $app_region_name"
    fly apps create "$app_region_name" --config "fly-${region}.toml" --org personal
  fi
  
  # Deploy to this region with retry logic
  echo "Deploying to $region..."
  deploy_with_retry "$app_region_name" "fly-${region}.toml" "$region"
  
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