# Contributing to Scrapix

Thank you for your interest in contributing to Scrapix! This document provides guidelines and instructions for contributing to the project.

## 🏗️ Project Structure

Scrapix is a monorepo managed with Turborepo and Yarn workspaces:

```
scrapix/
├── apps/
│   ├── scraper/
│   │   ├── core/      # Core crawling library
│   │   ├── server/    # REST API server
│   │   └── cli/       # Command-line interface
│   ├── proxy/         # HTTP/HTTPS proxy server
│   ├── playground/    # Test website (Next.js)
│   └── docs/          # Documentation site
├── misc/
│   ├── config_examples/  # Example configurations
│   └── tests/           # Test files
└── turbo.json          # Turborepo configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Yarn 1.22+
- Redis (for server development)
- Docker (optional)

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/meilisearch/scrapix.git
cd scrapix

# Install dependencies
yarn install

# Build all packages
yarn build
```

## 🛠️ Development Workflow

### Running in Development Mode

```bash
# Run all apps in development mode with hot-reload
yarn dev

# Run specific apps
cd apps/scraper/core && yarn dev
cd apps/scraper/server && yarn dev
cd apps/proxy && yarn dev
```

### Building

```bash
# Build all packages
yarn build

# Build specific workspace
yarn workspace @scrapix/core build
```

### Testing

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
yarn test:watch
```

### Linting and Code Style

```bash
# Run ESLint across all packages
yarn lint

# Auto-fix linting errors
yarn lint:fix

# Format code with Prettier
yarn format
```

## 🧪 Testing Your Changes

### Using the Playground

The playground app provides a test environment for crawler development:

```bash
# Start the playground
cd apps/playground && yarn dev

# In another terminal, test with CLI
cd apps/scraper/cli
yarn start -p ../../../misc/config_examples/default-simple.json
```

### Testing with Docker Compose

```bash
# Start all services (Meilisearch, Redis, apps)
docker-compose up

# Services available at:
# - Meilisearch: http://localhost:7700
# - Scraper API: http://localhost:8080
# - Playground: http://localhost:3000
```

### Writing Tests

Tests use Jest and should follow these patterns:

```typescript
// Unit test example
describe('Sender', () => {
  it('should batch documents correctly', async () => {
    const sender = new Sender(mockConfig);
    await sender.add({ uid: '1', content: 'test' });
    expect(sender.queue).toHaveLength(1);
  });
});

// Integration test example
describe('Crawler E2E', () => {
  it('should crawl and index pages', async () => {
    const config = { /* test config */ };
    const result = await runCrawler(config);
    expect(result.pagesIndexed).toBeGreaterThan(0);
  });
});
```

## 📝 Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode in tsconfig.json
- Provide JSDoc comments for public APIs
- Use interfaces over type aliases when possible

### Error Handling

- Use the custom error classes from `utils/error_handler.ts`
- Provide meaningful error messages with context
- Implement retry logic for network operations

### Example Code Style

```typescript
/**
 * Process a document through the feature pipeline
 * 
 * @param document - The document to process
 * @param config - Feature configuration
 * @returns Processed document
 */
export async function processDocument(
  document: Document,
  config: FeatureConfig
): Promise<ProcessedDocument> {
  try {
    // Implementation
    return processedDoc;
  } catch (error) {
    throw new ScrapixError(
      ErrorCode.PROCESSING_FAILED,
      'Failed to process document',
      { documentId: document.id, error }
    );
  }
}
```

## 🔄 Making Changes

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Write clean, documented code
- Add tests for new functionality
- Update documentation if needed
- Follow existing patterns and conventions

### 3. Commit Your Changes

Follow conventional commit format:

```bash
git commit -m "feat: add support for custom headers"
git commit -m "fix: resolve memory leak in Cheerio crawler"
git commit -m "docs: update proxy configuration examples"
```

### 4. Run Tests and Checks

```bash
# Run full test suite
yarn test

# Run linting
yarn lint

# Build all packages
yarn build
```

### 5. Submit a Pull Request

- Push your branch to GitHub
- Create a pull request with a clear description
- Link any related issues
- Wait for code review

## 🐛 Debugging

### Enable Debug Logs

```bash
# Enable all debug logs
DEBUG=* yarn dev

# Enable specific module logs
DEBUG=scrapix:* yarn dev
DEBUG=scrapix:crawler yarn dev
```

### Common Issues

1. **Module not found errors**: Run `yarn build` first
2. **Redis connection errors**: Ensure Redis is running
3. **TypeScript errors**: Check that all workspaces are built

## 📦 Publishing Packages

For maintainers only:

```bash
# Update version in package.json
cd apps/scraper/core
npm version patch/minor/major

# Build and publish
yarn build
npm publish

# Update other packages that depend on it
```

## 🤝 Code Review Process

1. All changes require review before merging
2. Tests must pass in CI
3. Documentation should be updated
4. Breaking changes need discussion

## 📄 License

By contributing to Scrapix, you agree that your contributions will be licensed under the MIT License.

## 🙋 Getting Help

- Check existing issues and discussions
- Join our Discord community
- Read the documentation at docs.scrapix.dev
- Contact the maintainers

Thank you for contributing to Scrapix! 🚀