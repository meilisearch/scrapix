import { cleanHtml } from '../../utils/html_cleaner'
import * as cheerio from 'cheerio'

describe('cleanHtml', () => {
  it('should remove script tags', () => {
    const $ = cheerio.load(`
      <html>
        <body>
          <h1>Title</h1>
          <script>alert('test');</script>
          <p>Content</p>
          <script src="external.js"></script>
        </body>
      </html>
    `)

    const cleaned = cleanHtml($)
    
    expect(cleaned).not.toContain('<script')
    expect(cleaned).not.toContain('alert')
    expect(cleaned).toContain('Title')
    expect(cleaned).toContain('Content')
  })

  it('should remove style tags', () => {
    const $ = cheerio.load(`
      <html>
        <head>
          <style>
            body { color: red; }
          </style>
        </head>
        <body>
          <h1>Title</h1>
          <style>.hidden { display: none; }</style>
          <p>Content</p>
        </body>
      </html>
    `)

    const cleaned = cleanHtml($)
    
    expect(cleaned).not.toContain('<style')
    expect(cleaned).not.toContain('color: red')
    expect(cleaned).toContain('Title')
    expect(cleaned).toContain('Content')
  })

  it('should remove comments', () => {
    const $ = cheerio.load(`
      <html>
        <body>
          <!-- This is a comment -->
          <h1>Title</h1>
          <!-- Another comment -->
          <p>Content</p>
          <!-- 
            Multi-line
            comment
          -->
        </body>
      </html>
    `)

    const cleaned = cleanHtml($)
    
    expect(cleaned).not.toContain('<!--')
    expect(cleaned).not.toContain('comment')
    expect(cleaned).toContain('Title')
    expect(cleaned).toContain('Content')
  })

  it('should preserve semantic HTML structure', () => {
    const $ = cheerio.load(`
      <article>
        <header>
          <h1>Article Title</h1>
          <time>2024-01-01</time>
        </header>
        <section>
          <p>First paragraph</p>
          <p>Second paragraph</p>
        </section>
        <footer>
          <p>Author: John Doe</p>
        </footer>
      </article>
    `)

    const cleaned = cleanHtml($)
    
    expect(cleaned).toContain('Article Title')
    expect(cleaned).toContain('2024-01-01')
    expect(cleaned).toContain('First paragraph')
    expect(cleaned).toContain('Second paragraph')
    expect(cleaned).toContain('Author: John Doe')
  })

  it('should handle empty or minimal HTML', () => {
    const emptyHtml = cheerio.load('')
    expect(cleanHtml(emptyHtml)).toBe('')

    const minimalHtml = cheerio.load('<p>Test</p>')
    expect(cleanHtml(minimalHtml)).toContain('Test')
  })

  it('should remove inline styles and event handlers', () => {
    const $ = cheerio.load(`
      <div style="color: red;" onclick="alert('clicked')">
        <p style="font-size: 20px;">Styled content</p>
        <button onmouseover="highlight()">Hover me</button>
      </div>
    `)

    const cleaned = cleanHtml($)
    
    // Should still contain the text content
    expect(cleaned).toContain('Styled content')
    expect(cleaned).toContain('Hover me')
    
    // But not the styles or handlers
    expect(cleaned).not.toContain('style=')
    expect(cleaned).not.toContain('onclick=')
    expect(cleaned).not.toContain('onmouseover=')
  })

  it('should handle special characters and entities', () => {
    const $ = cheerio.load(`
      <p>Price: &pound;50.99</p>
      <p>Copyright &copy; 2024</p>
      <p>Temperature: 25&deg;C</p>
    `)

    const cleaned = cleanHtml($)
    
    // Should preserve the text representation
    expect(cleaned).toMatch(/Price:.*50\.99/)
    expect(cleaned).toMatch(/Copyright.*2024/)
    expect(cleaned).toMatch(/Temperature:.*25.*C/)
  })

  it('should handle nested structures', () => {
    const $ = cheerio.load(`
      <div>
        <div>
          <div>
            <p>Deeply nested content</p>
          </div>
        </div>
      </div>
    `)

    const cleaned = cleanHtml($)
    expect(cleaned).toContain('Deeply nested content')
  })
})