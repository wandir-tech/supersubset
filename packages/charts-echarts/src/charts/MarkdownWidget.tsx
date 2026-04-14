/**
 * Markdown / Rich Text widget — renders user-provided markdown as HTML.
 * config.content: string — markdown/HTML content to render
 *
 * Uses a minimal markdown-to-HTML converter (no external dependency).
 * For security, only basic markdown syntax is supported — no raw script injection.
 */
import { useMemo } from 'react';
import type { WidgetProps } from '@supersubset/runtime';

export function MarkdownWidget({ config, title }: WidgetProps) {
  const content = (config.content as string) ?? '';

  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className="ss-markdown"
      style={{
        padding: '12px 16px',
        fontFamily: 'var(--ss-font-family, inherit)',
        fontSize: 'var(--ss-font-size, 14px)',
        color: 'var(--ss-color-text, #1f1f1f)',
        lineHeight: 1.6,
      }}
    >
      {title && <div style={{ fontWeight: 600, marginBottom: '8px' }}>{title}</div>}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * Minimal markdown→HTML. Supports: headers, bold, italic, links, lists, code, paragraphs.
 * Sanitizes script tags and event handlers for XSS prevention.
 */
function renderMarkdown(md: string): string {
  let html = md
    // Escape HTML entities first (prevent XSS)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold + Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links: [text](url) — only allow http/https/mailto
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr/>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Wrap in paragraph
  html = '<p>' + html + '</p>';

  // Clean up list items into ul
  html = html.replace(/(<li>.+<\/li>)/gs, '<ul>$1</ul>');

  return html;
}
