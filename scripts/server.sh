#!/bin/bash
# Scraper server wrapper script

# Get the directory where this script is located (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
PORT=${PORT:-8080}
REDIS_URL=${REDIS_URL:-""}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--port)
      PORT="$2"
      shift 2
      ;;
    -r|--redis)
      REDIS_URL="$2"
      shift 2
      ;;
    -e|--env)
      ENV_FILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: yarn server [options]"
      echo ""
      echo "Options:"
      echo "  -p, --port <port>      Port to run the server on (default: 8080)"
      echo "  -r, --redis <url>      Redis URL for job queue (optional)"
      echo "  -e, --env <file>       Path to .env file (optional)"
      echo "  -h, --help            Show this help message"
      echo ""
      echo "Examples:"
      echo "  yarn server                    # Run on default port 8080"
      echo "  yarn server -p 3000           # Run on port 3000"
      echo "  yarn server -r redis://localhost:6379  # With Redis"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Load environment file if specified
if [ -n "$ENV_FILE" ]; then
  if [ -f "$ENV_FILE" ]; then
    export $(cat "$ENV_FILE" | grep -v '^#' | xargs)
    echo "✅ Loaded environment from $ENV_FILE"
  else
    echo "❌ Environment file not found: $ENV_FILE"
    exit 1
  fi
fi

# Export environment variables
export PORT=$PORT
if [ -n "$REDIS_URL" ]; then
  export REDIS_URL=$REDIS_URL
fi

echo "🚀 Starting Scrapix Server"
echo "📍 Port: $PORT"
if [ -n "$REDIS_URL" ]; then
  echo "📦 Redis: $REDIS_URL"
else
  echo "📦 Redis: Not configured (using in-memory queue)"
fi
echo ""

# Build server if needed
echo "🔨 Building server..."
(cd "$PROJECT_ROOT/apps/scraper/server" && yarn build)

# Start the server
echo "🌐 Starting server on http://localhost:$PORT"
echo "📖 API Documentation: http://localhost:$PORT/docs"
echo ""
(cd "$PROJECT_ROOT/apps/scraper/server" && yarn start)