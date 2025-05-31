# Manual Deployment Commands

Since your app is created but not deployed, run these commands in order:

## 1. Create the main app (if not already created)
```bash
flyctl apps create scrapix

## 2. Deploy the main app
```bash
flyctl deploy --config fly.toml --wait-timeout 600
```

## 3. Set your Upstash Redis connection URL
```bash
flyctl secrets set REDIS_URL="your-upstash-redis-url" --app scrapix
```

## 4. Set your required environment variables
```bash
# Optional: For AI features
flyctl secrets set OPENAI_API_KEY="your-openai-api-key" --app scrapix
```

## 5. Check deployment status
```bash
flyctl status --app scrapix
```

## 6. View logs if needed
```bash
flyctl logs --app scrapix
```

## Finding Your Upstash Redis URL
```bash
flyctl redis list
flyctl redis status <redis-name>
```

## Troubleshooting

If main app deployment fails, check:
```bash
flyctl logs --app scrapix
```

Your scraper will be available at: `https://scrapix.fly.dev`