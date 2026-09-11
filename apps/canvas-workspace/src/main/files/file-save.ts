import { randomUUID } from 'node:crypto';
import { access, chmod, open, realpath, rename, stat, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import type { FileSaveRequest, FileSaveResult } from '../../shared/files';
import { FILE_PREVIEW_MAX_BYTES, readFilePreview, fileVersion } from './file-preview';

const lanes = new Map<string, Promise<unknown>>();

/** Compare the bytes read by the editor before publishing an atomic replace.
 * Serialized per real path for saves originating in this application. */
export const saveFilePreview = async (request: FileSaveRequest): Promise<FileSaveResult> => {
  if (!request || typeof request.filePath !== 'string' || !isAbsolute(request.filePath)
    || typeof request.content !== 'string' || typeof request.expectedVersion !== 'string'
    || !request.expectedVersion || Buffer.byteLength(request.content) > FILE_PREVIEW_MAX_BYTES
    || request.content.includes('\0')) return { ok: false, error: 'Invalid file save request' };
  try {
    const target = await realpath(request.filePath);
    const previous = lanes.get(target) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(async (): Promise<FileSaveResult> => {
      const original = await readFilePreview(target);
      if (!original.ok || original.kind !== 'text' || original.version !== request.expectedVersion) {
        return { ok: false, conflict: true, error: 'File changed outside this editor. Reload before saving.' };
      }
      await access(target, constants.W_OK);
      const metadata = await stat(target);
      const temporary = join(dirname(target), `.pulse-edit-${randomUUID()}`);
      try {
        const file = await open(temporary, 'wx', metadata.mode);
        try { await file.writeFile(request.content, 'utf8'); await file.sync(); }
        finally { await file.close(); }
        await chmod(temporary, metadata.mode);
        const latest = await readFilePreview(target);
        if (await realpath(request.filePath) !== target || !latest.ok || latest.kind !== 'text'
          || latest.version !== request.expectedVersion) {
          return { ok: false, conflict: true, error: 'File changed outside this editor. Reload before saving.' };
        }
        await rename(temporary, target);
        // Return the exact written version, not a possibly newer external edit.
        return { ok: true, version: fileVersion(Buffer.from(request.content)) };
      } finally { await unlink(temporary).catch(() => undefined); }
    });
    lanes.set(target, operation);
    try { return await operation; }
    finally { if (lanes.get(target) === operation) lanes.delete(target); }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
};
