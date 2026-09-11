import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FILE_PREVIEW_MAX_BYTES, readFilePreview } from './file-preview';

let dir: string;
beforeEach(async () => { dir = await mkdtemp(join(tmpdir(), 'file-preview-')); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });
describe('bounded file preview', () => {
  it('preserves UTF-8, indentation, empty files and source markup', async () => {
    const path = join(dir, '测试.ts');
    const content = 'const text = "中文 <script>";\n  // comment\n';
    await writeFile(path, content);
    expect(await readFilePreview(path)).toMatchObject({ ok: true, kind: 'text', content });
    await writeFile(path, '');
    expect(await readFilePreview(path)).toMatchObject({ ok: true, kind: 'text', content: '' });
  });
  it('rejects binary, invalid UTF-8 and large files without returning partial content', async () => {
    const path = join(dir, 'data');
    for (const data of [Buffer.from([0, 1, 2]), Buffer.from([0xff])]) {
      await writeFile(path, data);
      expect(await readFilePreview(path)).toEqual({ ok: true, kind: 'unsupported' });
    }
    await writeFile(path, Buffer.alloc(FILE_PREVIEW_MAX_BYTES + 1, 65));
    expect(await readFilePreview(path)).toEqual({ ok: true, kind: 'too-large' });
  });
  it('reports missing paths and rejects directories and relative paths', async () => {
    expect((await readFilePreview(join(dir, 'missing'))).ok).toBe(false);
    expect((await readFilePreview('relative.ts')).ok).toBe(false);
    await mkdir(join(dir, 'sub'));
    expect(await readFilePreview(join(dir, 'sub'))).toEqual({ ok: true, kind: 'unsupported' });
  });
});
