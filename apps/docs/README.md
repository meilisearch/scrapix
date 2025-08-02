# Scrapix Documentation

Official documentation for Scrapix, built with [Mintlify](https://mintlify.com).

## 📚 Overview

This documentation provides comprehensive guides, API references, and best practices for using Scrapix. Visit the live documentation at [docs.scrapix.com](https://docs.scrapix.com).

## 🏗️ Structure

```
docs/
├── Documentation/          # User guides and tutorials
│   ├── getting-started.mdx
│   └── choosing-best-configuration.mdx
├── Internals/             # Technical deep-dives
│   └── crawling.mdx
├── References/            # API and configuration references
│   ├── api-reference.mdx
│   ├── cli-reference.mdx
│   ├── config-reference.mdx
│   └── strategies.mdx
├── introduction.mdx       # Landing page
├── tests.mdx             # Testing guide
└── mint.json             # Mintlify configuration
```

## 🚀 Development

### Local Development

```bash
# Install Mintlify CLI
npm i -g mintlify

# Run development server
mintlify dev

# The docs will be available at http://localhost:3000
```

### Preview Changes

Before deploying, preview your changes:

```bash
mintlify dev --port 3333
```

## 📝 Writing Documentation

### File Format

All documentation files use MDX format, which supports:
- Markdown syntax
- React components
- Code highlighting
- Interactive examples

### Frontmatter

Each page should include frontmatter:

```mdx
---
title: "Page Title"
description: "Brief description for SEO"
icon: "icon-name"
---
```

### Code Examples

Use triple backticks with language specification:

````mdx
```typescript
const config = {
  crawler_type: "cheerio",
  start_urls: ["https://example.com"]
}
```
````

### Components

Mintlify provides several components:

```mdx
<Note>
  Important information for users
</Note>

<Warning>
  Critical warnings or breaking changes
</Warning>

<CodeGroup>
```bash npm
npm install @scrapix/core
```

```bash yarn
yarn add @scrapix/core
```
</CodeGroup>
```

## 🎨 Configuration

The `mint.json` file controls:
- Navigation structure
- Theme and colors
- API references
- Search settings
- Analytics

### Adding a New Page

1. Create a new `.mdx` file in the appropriate directory
2. Add frontmatter with title and description
3. Update `mint.json` navigation:

```json
{
  "navigation": [
    {
      "group": "Getting Started",
      "pages": [
        "Documentation/getting-started",
        "Documentation/your-new-page"
      ]
    }
  ]
}
```

## 🔍 SEO Best Practices

1. **Clear Titles**: Use descriptive, keyword-rich titles
2. **Meta Descriptions**: Include unique descriptions for each page
3. **Headings**: Use proper heading hierarchy (H1 → H2 → H3)
4. **Alt Text**: Add descriptions to all images
5. **Internal Links**: Link between related documentation

## 🚢 Deployment

Documentation is automatically deployed when changes are pushed to the main branch. Mintlify handles:
- Building static files
- CDN distribution
- Search indexing
- Version management

### Manual Deployment

If needed, trigger a manual deployment:

```bash
mintlify deploy
```

## 🐛 Troubleshooting

### Common Issues

1. **Broken Links**: Run `mintlify broken-links` to check
2. **Build Errors**: Check MDX syntax and frontmatter
3. **Missing Pages**: Ensure pages are listed in `mint.json`

### Getting Help

- Check [Mintlify docs](https://mintlify.com/docs)
- Open an issue in the Scrapix repository
- Contact Mintlify support for platform issues

## 🤝 Contributing

To contribute to the documentation:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `mintlify dev`
5. Submit a pull request

### Writing Style

- Use clear, concise language
- Include practical examples
- Explain the "why" not just the "how"
- Keep paragraphs short
- Use lists for multiple items

## 📄 License

The documentation is part of the Scrapix project and follows the same MIT license.