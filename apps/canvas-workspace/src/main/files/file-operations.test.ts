import { mkdtemp, readFile, stat, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEntry, renameEntry, trashEntry } from './file-operations';

const roots: string[] = [];

const createRoot = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'pulse-folder-operations-'));
  roots.push(root);
  return root;
};

afterEach(async () => {
  vi.restoreAllMocks();
  const { rm } = await import('fs/promises');
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('folder file operations', () => {
  it('creates a file or directory without overwriting an existing entry', async () => {
    const root = await createRoot();

    await expect(createEntry({ rootPath: root, parentPath: root, name: 'draft.md', kind: 'file' }))
      .resolves.toEqual({ ok: true, path: join(root, 'draft.md') });
    await expect(readFile(join(root, 'draft.md'), 'utf8')).resolves.toBe('');

    await expect(createEntry({ rootPath: root, parentPath: root, name: 'notes', kind: 'directory' }))
      .resolves.toEqual({ ok: true, path: join(root, 'notes') });
    await expect(stat(join(root, 'notes'))).resolves.toMatchObject({});

    await expect(createEntry({ rootPath: root, parentPath: root, name: 'draft.md', kind: 'file' }))
      .resolves.toMatchObject({ ok: false });
  });

  it('renames a child entry but never the opened root or an existing destination', async () => {
    const root = await createRoot();
    await writeFile(join(root, 'before.txt'), 'hello');
    await writeFile(join(root, 'occupied.txt'), 'occupied');

    await expect(renameEntry({ rootPath: root, entryPath: join(root, 'before.txt'), newName: 'after.txt' }))
      .resolves.toEqual({ ok: true, path: join(root, 'after.txt') });
    await expect(readFile(join(root, 'after.txt'), 'utf8')).resolves.toBe('hello');

    await expect(renameEntry({ rootPath: root, entryPath: join(root, 'after.txt'), newName: 'occupied.txt' }))
      .resolves.toMatchObject({ ok: false });
    await expect(renameEntry({ rootPath: root, entryPath: root, newName: 'moved' }))
      .resolves.toMatchObject({ ok: false });
  });

  it('rejects path traversal and parent symlinks that escape the opened root', async () => {
    const root = await createRoot();
    const outside = await createRoot();
    await symlink(outside, join(root, 'escape'));

    await expect(createEntry({ rootPath: root, parentPath: root, name: '../outside.txt', kind: 'file' }))
      .resolves.toMatchObject({ ok: false });
    await expect(createEntry({ rootPath: root, parentPath: join(root, 'escape'), name: 'outside.txt', kind: 'file' }))
      .resolves.toMatchObject({ ok: false });
  });

  it('moves a child entry to trash through the injected platform operation', async () => {
    const root = await createRoot();
    const path = join(root, 'remove.txt');
    await writeFile(path, 'remove me');
    const moveToTrash = vi.fn().mockResolvedValue(undefined);

    await expect(trashEntry({ rootPath: root, entryPath: path }, moveToTrash))
      .resolves.toEqual({ ok: true, path });
    expect(moveToTrash).toHaveBeenCalledWith(path);

    await expect(trashEntry({ rootPath: root, entryPath: root }, moveToTrash))
      .resolves.toMatchObject({ ok: false });
  });

  it('rejects rename and trash requests outside the opened root', async () => {
    const root = await createRoot();
    const outside = await createRoot();
    const outsidePath = join(outside, 'outside.txt');
    await writeFile(outsidePath, 'outside');
    const moveToTrash = vi.fn().mockResolvedValue(undefined);

    await expect(renameEntry({ rootPath: root, entryPath: outsidePath, newName: 'renamed.txt' }))
      .resolves.toMatchObject({ ok: false });
    await expect(trashEntry({ rootPath: root, entryPath: outsidePath }, moveToTrash))
      .resolves.toMatchObject({ ok: false });
    expect(moveToTrash).not.toHaveBeenCalled();
    await expect(readFile(outsidePath, 'utf8')).resolves.toBe('outside');
  });
});
