import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown.ts';

describe('renderMarkdown', () => {
  it('renders basic markdown', () => {
    const html = renderMarkdown('**hello** _world_');
    expect(html).toContain('<strong>hello</strong>');
    expect(html).toContain('<em>world</em>');
  });

  it('returns empty string for empty input', () => {
    expect(renderMarkdown('')).toBe('');
  });

  describe('topHeadingLevel', () => {
    it('keeps heading levels without the option', () => {
      expect(renderMarkdown('# Title\n\n## Part')).toMatch(/<h1[^>]*>Title<\/h1>[\s\S]*<h2[^>]*>Part<\/h2>/);
    });

    it('moves the highest heading to the given level and keeps the distance of the others', () => {
      const html = renderMarkdown('# Title\n\n## Part\n\n#### Detail', { topHeadingLevel: 3 });
      expect(html).toMatch(/<h3[^>]*>Title<\/h3>/);
      expect(html).toMatch(/<h4[^>]*>Part<\/h4>/);
      expect(html).toMatch(/<h6[^>]*>Detail<\/h6>/);
      expect(html).not.toMatch(/<h[12][\s>]/);
    });

    it('starts from the highest heading the text uses', () => {
      const html = renderMarkdown('## Part\n\n### Detail', { topHeadingLevel: 3 });
      expect(html).toMatch(/<h3[^>]*>Part<\/h3>/);
      expect(html).toMatch(/<h4[^>]*>Detail<\/h4>/);
    });

    it('stops at h6', () => {
      const html = renderMarkdown('# Top\n\n##### Deep\n\n###### Deeper', { topHeadingLevel: 3 });
      expect(html).toMatch(/<h6[^>]*>Deep<\/h6>/);
      expect(html).toMatch(/<h6[^>]*>Deeper<\/h6>/);
    });

    it('leaves headings already below the level in place', () => {
      const html = renderMarkdown('#### Detail', { topHeadingLevel: 3 });
      expect(html).toMatch(/<h4[^>]*>Detail<\/h4>/);
    });

    it('moves raw HTML headings and keeps their content and attributes', () => {
      const html = renderMarkdown('<h1 title="t">Hello <em>there</em></h1>\n\nText', { topHeadingLevel: 3 });
      expect(html).toContain('<h3 title="t">Hello <em>there</em></h3>');
      expect(html).not.toContain('<h1');
    });

    it('still sanitizes the content of moved headings', () => {
      const html = renderMarkdown('<h1 onclick="alert(1)">A <img src=x onerror=alert(2)></h1>', { topHeadingLevel: 3 });
      expect(html).toMatch(/<h3>A <img src="x"><\/h3>/);
      expect(html).not.toContain('alert');
    });

    it('leaves text without headings unchanged', () => {
      expect(renderMarkdown('**hi**', { topHeadingLevel: 3 })).toBe(renderMarkdown('**hi**'));
    });

    it('does not shift the next call without the option', () => {
      renderMarkdown('# A', { topHeadingLevel: 3 });
      expect(renderMarkdown('# B')).toMatch(/<h1[^>]*>B<\/h1>/);
    });
  });

  describe('XSS protection', () => {
    it('strips raw <script> tags', () => {
      const html = renderMarkdown('hello\n\n<script>alert(1)</script>');
      expect(html).not.toContain('<script');
      expect(html).not.toContain('alert(1)');
    });

    it('strips inline event handlers', () => {
      const html = renderMarkdown('<img src="x" onerror="alert(1)">');
      expect(html).not.toContain('onerror');
      expect(html).not.toContain('alert(1)');
    });

    it('blocks javascript: URLs in markdown links', () => {
      const html = renderMarkdown('[click](javascript:alert(1))');
      expect(html).not.toContain('javascript:');
      expect(html).not.toContain('alert(1)');
    });

    it('blocks javascript: URLs in raw <a> tags', () => {
      const html = renderMarkdown('<a href="javascript:alert(1)">click</a>');
      expect(html).not.toContain('javascript:');
    });

    it('blocks data: URLs that could carry HTML', () => {
      const html = renderMarkdown('[click](data:text/html,<script>alert(1)</script>)');
      expect(html).not.toContain('data:text/html');
      expect(html).not.toContain('<script');
    });

    it('blocks vbscript: URLs', () => {
      const html = renderMarkdown('[click](vbscript:msgbox(1))');
      expect(html).not.toContain('vbscript:');
    });

    it('escapes HTML in link text', () => {
      const html = renderMarkdown('[<img src=x onerror=alert(1)>](https://example.com)');
      expect(html).not.toContain('onerror');
    });

    it('strips <iframe> tags', () => {
      const html = renderMarkdown('<iframe src="https://evil.example.com"></iframe>');
      expect(html).not.toContain('<iframe');
    });

    it('strips <object> and <embed> tags', () => {
      const html = renderMarkdown('<object data="evil.swf"></object><embed src="evil.swf">');
      expect(html).not.toContain('<object');
      expect(html).not.toContain('<embed');
    });

    it('strips <style> tags to prevent CSS-based attacks', () => {
      const html = renderMarkdown('<style>body { background: url("javascript:alert(1)") }</style>');
      expect(html).not.toContain('<style');
    });

    it('does not execute javascript: in image src', () => {
      const html = renderMarkdown('![alt](javascript:alert(1))');
      expect(html).not.toContain('javascript:');
    });

    it('preserves http and https links', () => {
      const html = renderMarkdown('[a](https://example.com) [b](http://example.com)');
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('href="http://example.com"');
    });

    it('preserves mailto links', () => {
      const html = renderMarkdown('[mail](mailto:user@example.com)');
      expect(html).toContain('mailto:user@example.com');
    });
  });
});
