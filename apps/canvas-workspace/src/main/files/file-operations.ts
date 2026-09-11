import { constants } from 'fs';
import { access, mkdir, realpath, rename, writeFile } from 'fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'path';
import type {
  FileCreateEntryRequest,
  FileEntryOperationResult,
  FileRenameEntryRequest,
  FileTrashEntryRequest,
} from '../../shared/files';

const formatError = (error: unknown): string => error instanceof Error ? error.message : String(error);

const isWithin = (root: string, target: string): boolean => {
  const child = relative(root, target);
  return child === '' || (!child.startsWith(`..${sep}`) && child !== '..' && !isAbsolute(child));
};

const validateName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed || trimmed === '.' || trimmed === '..' || /[\\/\0]/.test(trimmed)) {
    throw new Error('Enter a valid file or folder name');
  }
  return trimmed;
};

const resolveRoot = async (rootPath: string): Promise<string> => {
  if (!isAbsolute(rootPath)) throw new Error('Expected an absolute folder root');
  return realpath(resolve(rootPath));
};

const resolveSafeParent = async (rootPath: string, parentPath: string): Promise<{ root: string; parent: string }> => {
  if (!isAbsolute(parentPath)) throw new Error('Expected an absolute parent path');
  const root = await resolveRoot(rootPath);
  const parent = resolve(parentPath);
  if (!isWithin(resolve(rootPath), parent)) throw new Error('Path is outside the opened folder');
  const realParent = await realpath(parent);
  if (!isWithin(root, realParent)) throw new Error('Path resolves outside the opened folder');
  return { root, parent };
};

const rejectExisting = async (path: string): Promise<void> => {
  try {
    await access(path, constants.F_OK);
    throw new Error('A file or folder with that name already exists');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'ENOENT') throw error;
  }
};

const failure = (error: unknown): FileEntryOperationResult => ({ ok: false, error: formatError(error) });

export const createEntry = async (request: FileCreateEntryRequest): Promise<FileEntryOperationResult> => {
  try {
    const name = validateName(request.name);
    const { parent } = await resolveSafeParent(request.rootPath, request.parentPath);
    const path = join(parent, name);
    await rejectExisting(path);
    if (request.kind === 'directory') await mkdir(path);
    else await writeFile(path, '', { encoding: 'utf8', flag: 'wx' });
    return { ok: true, path };
  } catch (error) {
    return failure(error);
  }
};

export const renameEntry = async (request: FileRenameEntryRequest): Promise<FileEntryOperationResult> => {
  try {
    const name = validateName(request.newName);
    const root = await resolveRoot(request.rootPath);
    const entryPath = resolve(request.entryPath);
    if (entryPath === resolve(request.rootPath) || entryPath === root) throw new Error('The opened folder cannot be renamed');
    const { parent } = await resolveSafeParent(request.rootPath, dirname(entryPath));
    const source = join(parent, entryPath.split(/[\\/]/).pop() || '');
    await access(source, constants.F_OK);
    const path = join(parent, name);
    if (path === source) return { ok: true, path };
    await rejectExisting(path);
    await rename(source, path);
    return { ok: true, path };
  } catch (error) {
    return failure(error);
  }
};

export const trashEntry = async (
  request: FileTrashEntryRequest,
  moveToTrash: (path: string) => Promise<void>,
): Promise<FileEntryOperationResult> => {
  try {
    const root = await resolveRoot(request.rootPath);
    const entryPath = resolve(request.entryPath);
    if (entryPath === resolve(request.rootPath) || entryPath === root) throw new Error('The opened folder cannot be deleted');
    const { parent } = await resolveSafeParent(request.rootPath, dirname(entryPath));
    const path = join(parent, entryPath.split(/[\\/]/).pop() || '');
    await access(path, constants.F_OK);
    await moveToTrash(path);
    return { ok: true, path };
  } catch (error) {
    return failure(error);
  }
};
