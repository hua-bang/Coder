// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { afterEach, expect, it } from 'vitest';

const markdownCss = readFileSync('src/renderer/src/modules/chat/components/ChatMessage/MarkdownContent/index.css', 'utf8');
const chatCss = readFileSync('src/renderer/src/modules/chat/components/ChatMessages/index.css', 'utf8');
const styles: HTMLStyleElement[] = [];
let fixture: HTMLDivElement | undefined;
afterEach(() => { styles.splice(0).forEach(style => style.remove()); fixture?.remove(); });

it.each([['markdown first', markdownCss, chatCss], ['chat first', chatCss, markdownCss]])(
  'preserves Markdown spacing and avoids a second width cap when loading %s', (_name, first, second) => {
    for (const css of [first, second]) {
      const style = document.createElement('style'); style.textContent = css;
      document.head.appendChild(style); styles.push(style);
    }
    fixture = document.createElement('div');
    fixture.className = 'chat-message chat-message-assistant';
    fixture.innerHTML = '<div class="chat-message-body"><div class="chat-message-content chat-md"><p>Tools</p>\n<ul>\n<li>Models</li>\n<li>Skills</li>\n</ul>\n<pre class="chat-code-block-pre"><code>line one\nline two</code></pre></div></div>';
    document.body.appendChild(fixture);
    const markdown = fixture.querySelector<HTMLElement>('.chat-md')!;
    expect(getComputedStyle(markdown).whiteSpace).toBe('normal');
    expect(getComputedStyle(markdown).maxWidth).not.toBe('85%');
    expect(getComputedStyle(fixture.querySelector('pre')!).whiteSpace).toBe('pre-wrap');
  },
);
