# Scrapix Strategies

## Default Strategy

The default strategy is an advanced content extraction method that combines multiple extraction techniques with AI capabilities. It allows you to enable, disable, and configure various features independently for different parts of your website.

### Features

#### Block Split
- **Description**: Splits the page into logical content blocks based on HTML structure
- **Default**: Enabled
- **Configuration**:
  ```typescript
  features: {
    block_split: {
      activated: true,
      include_pages: ["*"], // All pages by default
      exclude_pages: [] // No exclusions by default
    }
  }
  ```

#### Meta Data
- **Description**: Extracts meta information from the page (title, description, etc.)
- **Default**: Enabled
- **Configuration**:
  ```typescript
  features: {
    meta_data: {
      activated: true,
      include_pages: ["*"], // All pages by default
      exclude_pages: [] // No exclusions by default
    }
  }
  ```

#### Custom Selectors
- **Description**: Allows defining custom CSS selectors for content extraction
- **Default**: Disabled
- **Configuration**:
  ```typescript
  features: {
    custom_selectors: {
      activated: false,
      include_pages: ["*"], // All pages by default
      exclude_pages: [], // No exclusions by default
      selectors: {
        title: "h1",
        content: ["p", "div.content"]
      }
    }
  }
  ```

#### Markdown
- **Description**: Converts HTML content to Markdown format
- **Default**: Disabled
- **Configuration**:
  ```typescript
  features: {
    markdown: {
      activated: false,
      include_pages: ["*"], // All pages by default
      exclude_pages: [] // No exclusions by default
    }
  }
  ```

#### PDF
- **Description**: Extracts content and metadata from PDF files
- **Default**: Disabled
- **Configuration**:
  ```typescript
  features: {
    pdf: {
      activated: false,
      include_pages: ["*"], // All pages by default
      exclude_pages: [], // No exclusions by default
      extract_content: false, // Whether to extract PDF content
      extract_metadata: true // Whether to extract PDF metadata
    }
  }
  ```

#### Schema
- **Description**: Extracts structured data from Schema.org markup
- **Default**: Disabled
- **Configuration**:
  ```typescript
  features: {
    schema: {
      activated: false,
      include_pages: ["*"], // All pages by default
      exclude_pages: [], // No exclusions by default
      convert_dates: false, // Whether to convert dates to timestamp format
      only_type: null // Only extract data from specified type
    }
  }
  ```

#### AI Extraction
- **Description**: Uses AI to extract specific information from pages
- **Default**: Disabled
- **Configuration**:
  ```typescript
  features: {
    ai_extraction: {
      activated: false,
      include_pages: ["*"], // All pages by default
      exclude_pages: [], // No exclusions by default
      model_config: {
        model: null, // Use default model
        api_key: null // Use default API key
      },
      prompts: [
        {
          prompt: "Extract the main topics discussed in this article",
          include_pages: ["/blog/*"],
          exclude_pages: []
        }
      ]
    }
  }
  ```

#### AI Summary
- **Description**: Generates AI-powered summaries of page content
- **Default**: Disabled
- **Configuration**:
  ```typescript
  features: {
    ai_summary: {
      activated: false,
      include_pages: ["*"], // All pages by default
      exclude_pages: [], // No exclusions by default
      model_config: {
        model: null, // Use default model
        api_key: null // Use default API key
      }
    }
  }
  ```

### Example Configuration

Here's a complete example showing how to configure multiple features:

```typescript
{
  strategy: "default",
  features: {
    block_split: {
      activated: true,
      include_pages: ["*"],
      exclude_pages: ["/admin/*"]
    },
    meta_data: {
      activated: true
    },
    custom_selectors: {
      activated: true,
      include_pages: ["/products/*"],
      selectors: {
        title: "h1.product-title",
        price: "span.price",
        description: "div.product-description"
      }
    },
    markdown: {
      activated: true,
      include_pages: ["/docs/*"]
    },
    pdf: {
      activated: true,
      include_pages: ["/downloads/*"],
      extract_content: true,
      extract_metadata: true
    },
    schema: {
      activated: true,
      convert_dates: true,
      only_type: "Product"
    },
    ai_extraction: {
      activated: true,
      include_pages: ["/blog/*"],
      prompts: [
        {
          prompt: "Extract the main topics and key points from this article",
          include_pages: ["/blog/*"]
        }
      ]
    },
    ai_summary: {
      activated: true,
      include_pages: ["/articles/*"]
    }
  }
}
```

### Wildcard Patterns

The `include_pages` and `exclude_pages` fields support wildcard patterns:
- `*` matches any sequence within a path segment
- `**` matches across path segments

Examples:
- `"/blog/*"` matches all pages under `/blog/`
- `"/docs/**"` matches all pages under `/docs/` and its subdirectories
- `"*.pdf"` matches all PDF files
- `"/products/*/specs"` matches all product specification pages 