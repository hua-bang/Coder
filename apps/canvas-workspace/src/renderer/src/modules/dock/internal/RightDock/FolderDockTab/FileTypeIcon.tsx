import {
  File, FileCode, FileCss, FileHtml, FileImage, FileJs, FileJsx,
  FilePy, FileText, FileTs, FileTsx, FileZip, GitBranch, MarkdownLogo, Terminal,
} from '@phosphor-icons/react';

/** File glyphs share the app's Phosphor family; only file type carries color. */
export const FileTypeIcon = ({ name }: { name: string }) => {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  const types = {
    ts: [FileTs, 'code'], tsx: [FileTsx, 'code'], js: [FileJs, 'script'], jsx: [FileJsx, 'script'],
    cjs: [FileJs, 'script'], mjs: [FileJs, 'script'], py: [FilePy, 'code'],
    css: [FileCss, 'style'], scss: [FileCss, 'style'], html: [FileHtml, 'script'],
    md: [MarkdownLogo, 'document'], markdown: [MarkdownLogo, 'document'],
    json: [FileCode, 'script'], yaml: [FileCode, 'style'], yml: [FileCode, 'style'], toml: [FileCode, 'style'],
    sh: [Terminal, 'document'], bash: [Terminal, 'document'], zsh: [Terminal, 'document'],
    png: [FileImage, 'image'], jpg: [FileImage, 'image'], jpeg: [FileImage, 'image'], svg: [FileImage, 'image'],
    webp: [FileImage, 'image'], gif: [FileImage, 'image'], zip: [FileZip, 'muted'],
    txt: [FileText, 'muted'], gitignore: [GitBranch, 'script'],
  } as const;
  const [Icon, color] = types[extension as keyof typeof types] ?? [File, 'muted'];
  return <span className={`folder-browser__file-icon folder-browser__file-icon--${color}`} aria-hidden="true">
    <Icon size={16} weight="regular" />
  </span>;
};
