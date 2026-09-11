import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, Code, SidebarSimple, ChatCircle, CaretRight } from '@phosphor-icons/react';
import { FolderIcon } from '../../../../../components/icons';
import { Button, EmptyState } from '../../../../../components/ui';
import { useI18n } from '../../../../../i18n';
import { useAppShell } from '../../../../../shared/appShell';
import type { DockPreviewTab, DockStore } from '../dock-store';
import { useFileChatAction } from './useFileChatAction';
import { FileTypeIcon } from './FileTypeIcon';
import { FileTree } from './FileTree';
import { FileContent, isImage, isMarkdown } from './FileContent';
import { isFileDirty } from '../dock-folder-editor';
import { useFileEditor } from './useFileEditor';
import { UnsavedFileDialog } from './UnsavedFileDialog';
import { matchShortcut, formatShortcutId } from '../../../../../shortcuts/registry';
import type { ShortcutIdFor } from '../../../../../shortcuts/definitions';
import './index.css';
const CodeEditor = lazy(() => import('./CodeEditor').then(m => ({ default: m.CodeEditor })));

interface Props {
  tab: Extract<DockPreviewTab, { kind: 'folder' }>;
  store: DockStore;
  active: boolean;
}
interface Preview { path: string; content?: string; version?: string; upgradeRequired?: boolean; imagePath?: string; error?: string; loading?: boolean }

export const FolderDockTab = ({ tab, store, active }: Props) => {
  const { t } = useI18n();
  const { notify } = useAppShell();
  const editing = useFileEditor(store);
  const { state: editState, editor, scope } = editing;
  const draft = editState.draft?.path === tab.selectedPath ? editState.draft : undefined;
  const { addToChat, adding, available } = useFileChatAction(store, tab.id);
  const [treeVisible, setTreeVisible] = useState(true);
  const [source, setSource] = useState(false);
  const [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const addDirectory = (directory: string) => editing.guard(() => { void addToChat(directory, true); });
  const path = tab.selectedPath;
  const pathRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = pathRef.current;
    if (!element) return;
    const revealFile = () => { element.scrollLeft = element.scrollWidth; };
    const observer = new ResizeObserver(revealFile);
    observer.observe(element);
    revealFile();
    return () => observer.disconnect();
  }, [path]);
  const segments = path?.slice(tab.folderPath.replace(/[\\/]$/, '').length + 1).split(/[\\/]/) ?? [];

  useEffect(() => {
    if (!active || !path) return;
    const existing = editor.get(scope);
    if (isFileDirty(existing) || existing.saving) return;
    let current = true;
    setPreview({ path, loading: true });
    const load = async (): Promise<Preview> => {
      if (isImage(path)) {
        const result = await window.canvasWorkspace.file.getImagePreview(path, 1600);
        return result.ok && result.preview
          ? { path, imagePath: result.preview.path }
          : { path, error: result.error || t('folder.readFailed') };
      }
      const result = await window.canvasWorkspace.file.preview(path);
      if (!result.ok) return { path, error: result.error };
      if (result.kind === 'text') return { path, content: result.content, version: result.version,
        upgradeRequired: !result.version || typeof window.canvasWorkspace.file.savePreview !== 'function' };
      return { path, error: t(result.kind === 'too-large' ? 'folder.tooLarge' : 'folder.unsupported') };
    };
    void load().then(result => {
      if (!current) return;
      const latest = editor.get(scope);
      if (isFileDirty(latest) || latest.saving) return;
      setPreview(result);
      if (result.content !== undefined && result.version && !result.upgradeRequired) editor.update(scope, {
        draft: { path, content: result.content, original: result.content, version: result.version }, error: undefined,
      });
      else if (latest.draft?.path === path) editor.discard(scope);
    })
      .catch(error => { if (current) setPreview({ path, error: String(error) }); });
    return () => { current = false; };
  }, [active, path, revision, t, editor, scope, Boolean(draft)]);

  const openInVSCode = async (filePath: string) => {
    try {
      const result = await window.canvasWorkspace.file.openInVSCode(filePath);
      if (!result.ok) throw new Error(result.error || t('folder.openFailed'));
    } catch (error) {
      notify({ tone: 'error', title: t('folder.openFailed'), description: String(error) });
    }
  };
  const current: Preview | null = draft ? { path: draft.path, content: draft.content, version: draft.version } : preview?.path === path ? preview : null;
  return (
    <section className="folder-browser" onKeyDownCapture={event => {
      if (!draft || event.nativeEvent.isComposing) return;
      const handlers: Record<ShortcutIdFor<'file-editor'>, () => void> = { 'fileEditor.save': () => { void editing.save(); } };
      const match = matchShortcut(event, 'file-editor');
      if (match) { event.preventDefault(); event.stopPropagation(); handlers[match.id as ShortcutIdFor<'file-editor'>](); }
    }}>
      <header className="folder-browser__toolbar">
        <nav ref={pathRef} className="folder-browser__path" aria-label={t('folder.path')} title={path || tab.folderPath}>
          <Button size="xs" className="folder-browser__root" onClick={() => store.selectFolderFile(tab.id)}>{tab.title}</Button>
          {segments.map((segment, index) => <span className="folder-browser__segment" key={index}>
            <CaretRight size={12} />
            {index === segments.length - 1 && <FileTypeIcon name={segment} />}
            <span className={index === segments.length - 1 ? 'folder-browser__current-file' : undefined}>{segment}</span>
          </span>)}
        </nav>
        {draft && (editing.dirty || editState.saving) && <Button variant="icon" size="xs" className="folder-browser__save-dot"
          disabled={editState.saving} aria-label={t('folder.save')} title={`${t('folder.unsaved')} · ${formatShortcutId('fileEditor.save')}`}
          onClick={() => { void editing.save(); }}><span aria-hidden="true">●</span></Button>}
        {path && <Button variant="icon" size="sm" aria-label={t('folder.addToChat')} title={t('folder.addToChat')}
          disabled={!available || adding} onClick={() => editing.guard(() => { setTreeVisible(false); void addToChat(path); })}><ChatCircle size={16} /></Button>}
        <Button size="xs" title={t('folder.openFileVSCode')} onClick={() => editing.guard(() => { void openInVSCode(path || tab.folderPath); })}>
          <Code size={14} />{t('folder.vscode')}
        </Button>
        <Button variant="icon" size="sm" aria-label={t('folder.toggleTree')} title={t('folder.toggleTree')}
          aria-pressed={treeVisible} onClick={() => setTreeVisible(v => !v)}><SidebarSimple size={16} /></Button>
      </header>
      {current?.upgradeRequired && <div className="folder-browser__hint" role="status">{t('folder.restartRequired')}</div>}
      {draft && editState.error && <div className="folder-browser__hint" role="alert">{editState.error}</div>}
      <div className="folder-browser__body">
        <section className="folder-browser__preview">
          {path && isMarkdown(path) && <div className="folder-browser__mode">
            <Button size="xs" aria-pressed={source} onClick={() => setSource(v => !v)}>
              {t(source ? 'folder.showPreview' : 'folder.showSource')}
            </Button>
          </div>}
          {draft && (!isMarkdown(draft.path) || source) ? <Suspense fallback={<div className="folder-browser__hint">{t('folder.loading')}</div>}>
            <CodeEditor key={`${scope}:${draft.path}`} path={draft.path} content={draft.content} original={draft.original}
              saving={Boolean(editState.saving)} onChange={content => editor.edit(scope, content)} />
          </Suspense> : !path ? <EmptyState icon={<FolderIcon size={28} />} title={t('folder.chooseFile')} description={t('folder.chooseHint')} />
            : !current || current.loading ? <div className="folder-browser__hint">{t('folder.loading')}</div>
            : current.error ? <div className="folder-browser__hint" role="alert">{current.error}</div>
            : <FileContent key={path} path={path} content={draft?.content ?? current.content ?? ''} source={source} imagePath={current.imagePath} />}
        </section>
        {treeVisible && <aside className="folder-browser__tree" aria-label={t('folder.files')}>
          <div className="folder-browser__tree-header folder-browser__directory-row"><span>{tab.title}</span>
            {available && <Button variant="icon" size="xs" className="folder-browser__directory-chat" disabled={adding}
              title={t('folder.addDirectory', { name: tab.title })} aria-label={t('folder.addDirectory', { name: tab.title })}
              onClick={() => addDirectory(tab.folderPath)}><ChatCircle size={14} /></Button>}
            <Button variant="icon" size="xs" aria-label={t('folder.refresh')} title={t('folder.refresh')}
              onClick={() => editing.guard(() => { editor.discard(scope); setRevision(v => v + 1); })}><ArrowsClockwise size={14} /></Button>
          </div>
          <FileTree key={tab.folderPath} path={tab.folderPath} selectedPath={path} revision={revision}
            onAddDirectory={available ? addDirectory : undefined} adding={adding}
            onSelect={selected => { setSource(false); store.selectFolderFile(tab.id, selected); }} />
        </aside>}
      </div>
      <UnsavedFileDialog controller={editing} />
    </section>
  );
};
