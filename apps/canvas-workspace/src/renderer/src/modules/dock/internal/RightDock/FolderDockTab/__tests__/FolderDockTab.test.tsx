// @vitest-environment happy-dom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../../../../../../i18n';
import { FolderDockTab } from '..';
import { DockStore } from '../../dock-store';
import type { FilePreviewResult } from '../../../../../../types';

const { deliver, notify, activeTarget, listeners } = vi.hoisted(() => ({ deliver: vi.fn(), notify: vi.fn(), activeTarget: vi.fn(), listeners: new Set<() => void>() }));
vi.mock('../../../../../chat', () => ({ useOptionalChatTargetBroker: () => ({ deliver, getActiveTarget: activeTarget, subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); } }) }));
vi.mock('../../../../../chat/delivery', () => ({ useChatDeliveryNotifier: () => notify }));
vi.mock('../../../../../../shared/appShell', () => ({ useAppShell: () => ({ notify }) }));
vi.mock('../CodeEditor', () => ({ CodeEditor: ({ content }: { content: string }) => <textarea aria-label="Code editor" value={content} readOnly /> }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLDivElement;
let root: Root;
let store: DockStore;
const preview = vi.fn();
const savePreview = vi.fn();
const listDir = vi.fn();
const openInVSCode = vi.fn();
const getImagePreview = vi.fn();
const originalApi = window.canvasWorkspace;

beforeEach(() => {
  vi.clearAllMocks();
  listeners.clear();
  activeTarget.mockReturnValue({ scopeId: 'workspace' });
  savePreview.mockResolvedValue({ ok: true, version: 'v2' });
  listDir.mockResolvedValue({ ok: true, entries: [{ name: 'a.ts', type: 'file' }, { name: 'b.md', type: 'file' }] });
  preview.mockResolvedValue({ ok: true, kind: 'text', version: 'v1', content: 'const value = 1;\n' });
  openInVSCode.mockResolvedValue({ ok: true });
  deliver.mockResolvedValue({ status: 'delivered', target: { surface: 'dock' } });
  Object.defineProperty(window, 'canvasWorkspace', { configurable: true, value: { file: { preview, savePreview, listDir, openInVSCode, getImagePreview } } });
  store = new DockStore();
  store.setActiveWorkspace('workspace');
  store.openFolder('/work');
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); Object.defineProperty(window, 'canvasWorkspace', { configurable: true, value: originalApi }); });
const render = async (path: string | null = '/work/a.ts') => {
  act(() => store.selectFolderFile('folder', path ?? undefined));
  const tab = store.getSnapshot().tabs[0];
  if (tab.kind !== 'folder') throw new Error('Expected folder tab');
  await act(async () => root.render(<I18nProvider><FolderDockTab tab={tab} store={store} active /></I18nProvider>));
};
const click = async (label: string) => {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.getAttribute('aria-label') === label || b.textContent === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => button.click());
};

describe('folder preview interactions', () => {
  it('renders highlighted source with line numbers and opens the exact file or directory in VS Code', async () => {
    await render();
    expect(host.querySelector('textarea')?.value).toBe('const value = 1;\n');
    expect(host.querySelector('.folder-browser__edit-bar')).toBeNull();
    expect(host.querySelector('[aria-label=Save]')).toBeNull();
    expect(listDir).toHaveBeenCalledWith('/work', 0, true);
    await click('VS Code');
    expect(openInVSCode).toHaveBeenCalledWith('/work/a.ts');
    expect(host.querySelector('.folder-browser__open-folder')).toBeNull();
  });
  it('inserts a file reference and reveals chat beside the file', async () => {
    await render(); await click('Add to conversation');
    expect(deliver).toHaveBeenCalledWith({ kind: 'file', filePath: '/work/a.ts' });
    expect(store.getSnapshot().splitTabIds).toEqual(['folder', 'chat']);
  });
  it('ignores stale file reads and supports Markdown source switching', async () => {
    let finish: (value: FilePreviewResult) => void = () => undefined;
    preview.mockReturnValueOnce(new Promise<FilePreviewResult>(resolve => { finish = resolve; }));
    await render();
    preview.mockResolvedValue({ ok: true, kind: 'text', version: 'v1', content: '# New document' });
    await render('/work/b.md');
    await act(async () => finish({ ok: true, kind: 'text', version: 'v1', content: 'OLD FILE' }));
    expect(host.querySelector('h1')?.textContent).toBe('New document');
    expect(host.textContent).not.toContain('OLD FILE');
    await click('Source');
    expect(host.querySelector('textarea')?.value).toBe('# New document');
  });
  it('shows read failures and keeps the external editor action available', async () => {
    preview.mockResolvedValue({ ok: false, error: 'Permission denied' });
    await render();
    expect(host.querySelector('[role="alert"]')?.textContent).toBe('Permission denied');
    await click('VS Code');
    expect(openInVSCode).toHaveBeenCalledWith('/work/a.ts');
  });
  it('previews images through the existing image service', async () => {
    getImagePreview.mockResolvedValue({ ok: true, preview: { path: '/preview/image.png' } });
    await render('/work/image.png');
    expect(getImagePreview).toHaveBeenCalledWith('/work/image.png', 1600);
    expect(host.querySelector('img')?.getAttribute('src')).toContain('image.png');
    expect(preview).not.toHaveBeenCalled();
  });
});


it('waits for first chat mount before delivering the exact file', async () => {
  activeTarget.mockReturnValue(null);
  await render(); await click('Add to conversation');
  expect(deliver).not.toHaveBeenCalled();
  expect(store.getSnapshot().splitTabIds).toContain('chat');
  activeTarget.mockReturnValue({ scopeId: 'workspace' });
  await act(async () => { for (const listener of [...listeners]) listener(); });
  expect(deliver).toHaveBeenCalledWith({ kind: 'file', filePath: '/work/a.ts' });
  expect(listeners.size).toBe(0);
});

it('does not deliver a pending file to a different workspace', async () => {
  activeTarget.mockReturnValue(null);
  await render(); await click('Add to conversation');
  store.setActiveWorkspace('other');
  activeTarget.mockReturnValue({ scopeId: 'workspace' });
  await act(async () => { for (const listener of [...listeners]) listener(); });
  expect(deliver).not.toHaveBeenCalled();
});


it('uses the root breadcrumb to return to the folder and open it in VS Code', async () => {
  await render();
  await click('work');
  expect(store.getSnapshot().tabs[0]).toMatchObject({ selectedPath: undefined });
  await render(null);
  await click('VS Code');
  expect(openInVSCode).toHaveBeenCalledWith('/work');
  expect(host.querySelector('.folder-browser__open-folder')).toBeNull();
});


it('saves the exact edited content through the version checked API with Command-S', async () => {
  await render();
  act(() => store.folderEditor.edit('workspace', 'const changed = 2;'));
  const textarea = host.querySelector('textarea');
  expect(textarea?.value).toBe('const changed = 2;');
  await act(async () => textarea?.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true })));
  expect(savePreview).toHaveBeenCalledWith({ filePath: '/work/a.ts', content: 'const changed = 2;', expectedVersion: 'v1' });
  expect(store.folderEditor.get('workspace').draft).toMatchObject({ original: 'const changed = 2;', version: 'v2' });
});

it('keeps the draft on conflict and lets Cancel or Discard resolve a blocked close', async () => {
  await render();
  act(() => store.folderEditor.edit('workspace', 'draft'));
  savePreview.mockResolvedValue({ ok: false, conflict: true, error: 'changed externally' });
  await click('Save');
  expect(host.querySelector('[role=alert]')?.textContent).toContain('changed outside');
  expect(store.folderEditor.get('workspace').draft?.content).toBe('draft');
  act(() => store.close('folder'));
  expect(document.querySelector('[role=dialog]')).not.toBeNull();
  const dialogClick = async (label: string) => {
    const button = [...document.querySelectorAll<HTMLButtonElement>('[role=dialog] button')].find(b => b.textContent === label);
    await act(async () => button?.click());
  };
  await dialogClick('Cancel');
  expect(store.getSnapshot().tabs).toHaveLength(1);
  act(() => store.close('folder'));
  await dialogClick('Discard');
  expect(store.getSnapshot().tabs).toHaveLength(0);
});


it('explains the required restart when an old main process cannot support safe editing', async () => {
  preview.mockResolvedValue({ ok: true, kind: 'text', content: 'const legacy = true;' });
  await render();
  expect(host.querySelector('[role=status]')?.textContent).toContain('Restart Pulse Canvas');
  expect(host.querySelector('.folder-browser__code')?.textContent).toContain('const legacy = true;');
  expect(host.querySelector('textarea')).toBeNull();
  expect(store.folderEditor.get('workspace').draft).toBeUndefined();
});


it('adds a collapsed directory without toggling it, preserving the absolute directory identity', async () => {
  listDir.mockResolvedValue({ ok: true, entries: [{ name: 'source', type: 'dir' }] });
  await render();
  await click('Add source folder to conversation');
  expect(deliver).toHaveBeenCalledWith({ kind: 'file', filePath: '/work/source', isDirectory: true });
  expect(host.querySelector('.folder-browser__children')).toBeNull();
  expect(store.getSnapshot().splitTabIds).toContain('chat');
});

it('also offers the opened root directory as a conversation reference', async () => {
  await render();
  await click('Add work folder to conversation');
  expect(deliver).toHaveBeenCalledWith({ kind: 'file', filePath: '/work', isDirectory: true });
});
