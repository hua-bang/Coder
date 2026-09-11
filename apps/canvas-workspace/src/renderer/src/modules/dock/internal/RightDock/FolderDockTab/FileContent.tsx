import { useMemo, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import { syntaxHighlightLanguages } from '../../../../../utils/syntaxHighlightLanguages';
import { MarkdownContent } from '../../../../chat/components/ChatMessage/MarkdownContent';
import { renderMarkdown } from '../../../../chat/components/utils/markdown';
import { useI18n } from '../../../../../i18n';
import { copyTextToClipboard } from '../../../../../utils/clipboard';
import { toFileUrl } from '../../../../../utils/fileUrl';

for (const [name, language] of Object.entries(syntaxHighlightLanguages)) hljs.registerLanguage(name, language);
const languages: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  py: 'python', rs: 'rust', sh: 'bash', zsh: 'bash', yml: 'yaml', toml: 'ini', html: 'xml', svg: 'xml',
  h: 'c', cc: 'cpp', hpp: 'cpp', cs: 'csharp', kt: 'kotlin', rb: 'ruby', md: 'markdown', mdx: 'markdown',
};
const escape = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const isMarkdown = (path: string): boolean => /\.(md|markdown)$/i.test(path);
export const isImage = (path: string): boolean => /\.(png|jpe?g|webp|gif|bmp|ico)$/i.test(path);

interface Props { path: string; content: string; source: boolean; imagePath?: string }

export const FileContent = ({ path, content, source, imagePath }: Props) => {
  const { t } = useI18n();
  const bodyRef = useRef<HTMLDivElement>(null);
  const markdown = isMarkdown(path) && !source;
  const html = useMemo(() => {
    if (markdown) return renderMarkdown(content);
    const extension = path.split('.').pop()?.toLowerCase() ?? '';
    const language = languages[extension] ?? extension;
    return hljs.getLanguage(language)
      ? hljs.highlight(content, { language, ignoreIllegals: true }).value : escape(content);
  }, [path, content, markdown]);
  if (imagePath) return <div className="folder-browser__image"><img src={toFileUrl(imagePath)} alt={path.split(/[\\/]/).pop()} /></div>;
  if (markdown) return <div className="folder-browser__markdown" onClick={event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-action="copy-code"]');
    if (!button) return;
    const code = button.closest('.chat-code-block')?.querySelector('code')?.textContent ?? '';
    void copyTextToClipboard(code.replace(/\n$/, '')).then(() => {
      button.textContent = t('chat.copied');
    }).catch(() => { button.textContent = t('chat.copy'); });
  }}><MarkdownContent bodyRef={bodyRef} html={html} /></div>;
  return (
    <div className="folder-browser__code">
      <pre className="folder-browser__line-numbers" aria-hidden="true">{content.split('\n').map((_, i) => i + 1).join('\n')}</pre>
      <pre><code className="hljs" dangerouslySetInnerHTML={{ __html: html }} /></pre>
    </div>
  );
};
