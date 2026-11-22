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

    it('strips <style> tags after inline text', () => {
      const html = renderMarkdown('hi <style>header{display:none}</style>');
      expect(html).not.toContain('<style');
      expect(html).not.toContain('display:none');
    });

    it('strips style attributes', () => {
      const html = renderMarkdown('<a href="https://x" style="position:fixed;inset:0">x</a>');
      expect(html).not.toContain('style=');
      expect(html).toContain('href="https://x"');
    });

    it('strips class and id attributes', () => {
      const html = renderMarkdown(
        '<div class="activity-weights-drawer" id="activity-weights-drawer"><a href="https://evil.example/">Sign in</a></div>',
      );
      expect(html).not.toContain('class=');
      expect(html).not.toContain('id=');
      expect(html).not.toContain('activity-weights-drawer');
      expect(html).toContain('href="https://evil.example/"');
    });

    it('strips forms and form controls', () => {
      const html = renderMarkdown(
        '<form action="https://evil.example/"><input type="password"><button>Login</button></form>',
      );
      expect(html).not.toContain('<form');
      expect(html).not.toContain('password');
      expect(html).not.toContain('<button');
      expect(html).not.toContain('evil.example');
    });

    it('keeps task list checkboxes disabled', () => {
      const html = renderMarkdown('- [x] done\n- [ ] todo');
      expect(html).toContain('<li><input type="checkbox" disabled="" checked=""> done</li>');
      expect(html).toContain('<li><input type="checkbox" disabled=""> todo</li>');
    });

    it('turns any other input into a disabled checkbox', () => {
      const html = renderMarkdown(
        '<input type="text" name="user" value="x" formaction="https://evil.example/" autofocus>',
      );
      expect(html).toBe('<input type="checkbox" disabled="">');
    });

    it('strips dialogs but keeps their content inline', () => {
      const html = renderMarkdown(
        '<dialog open><a href="https://evil.example/"><img width="3000" height="3000" src="https://evil.example/x.png"></a></dialog>',
      );
      expect(html).not.toContain('<dialog');
      expect(html).not.toContain('open=');
      expect(html).toContain('href="https://evil.example/"');
    });

    it('strips SVG and MathML', () => {
      const html = renderMarkdown(
        '<svg width="1" height="1" overflow="visible"><a href="https://evil.example/"><rect x="-5000" y="-5000" width="10000" height="10000" fill="white"/></a></svg>' +
          '<math><mpadded voffset="-5000px"><mtext>x</mtext></mpadded></math>',
      );
      expect(html).not.toContain('<svg');
      expect(html).not.toContain('<rect');
      expect(html).not.toContain('overflow=');
      expect(html).not.toContain('<math');
      expect(html).not.toContain('<mpadded');
    });

    it('keeps open details blocks', () => {
      const html = renderMarkdown('<details open><summary>More</summary>text</details>');
      expect(html).toContain('<details open="">');
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
