export type FilePreviewResult =
  | { ok: true; kind: 'text'; content: string; version: string }
  | { ok: true; kind: 'unsupported' | 'too-large' }
  | { ok: false; error: string };

export interface DirEntry {
  name: string;
  type: 'file' | 'dir';
  children?: DirEntry[];
}

export interface FileSaveRequest { filePath: string; content: string; expectedVersion: string }
export type FileSaveResult = { ok: true; version: string } | { ok: false; error: string; conflict?: boolean };
