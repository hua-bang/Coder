import { useEffect, useState } from 'react';
import {
  CaretDown,
  CaretRight,
  ChatCircle,
  FilePlus,
  FolderPlus,
  PencilSimple,
  Trash,
} from '@phosphor-icons/react';
import { Button } from '../../../../../components/ui';
import { useI18n } from '../../../../../i18n';
import type { DirEntry } from '../../../../../types';
import { EntryNameInput } from './EntryNameInput';
import { FileTypeIcon } from './FileTypeIcon';

export interface FolderMutation {
  id: number;
  parentPath: string;
}

interface Props {
  path: string;
  selectedPath?: string;
  onSelect: (path: string) => void;
  revision: number;
  mutation?: FolderMutation;
  onAddDirectory?: (path: string) => void;
  onCreate: (parentPath: string, kind: 'file' | 'directory', name: string) => Promise<string | undefined>;
  onRename: (path: string, name: string) => Promise<string | undefined>;
  onTrash: (path: string, name: string) => void;
  requestAction: (action: () => void) => void;
  adding?: boolean;
}

type EditMode = 'file' | 'directory' | 'rename' | null;

export const joinFilePath = (parent: string, name: string): string => `${parent.replace(/[\\/]$/, '')}/${name}`;

const EntryActions = ({ name, path, directory, adding, onAddDirectory, onEdit, onTrash, requestAction }: {
  name: string;
  path: string;
  directory: boolean;
  adding?: boolean;
  onAddDirectory?: () => void;
  onEdit: (mode: Exclude<EditMode, null>) => void;
  onTrash: Props['onTrash'];
  requestAction: Props['requestAction'];
}) => {
  const { t } = useI18n();
  return (
    <div className="folder-browser__entry-actions">
      {directory && onAddDirectory && <Button variant="icon" size="xs" disabled={adding}
        title={t('folder.addDirectory', { name })} aria-label={t('folder.addDirectory', { name })}
        onClick={onAddDirectory}><ChatCircle size={14} /></Button>}
      {directory && <>
        <Button variant="icon" size="xs" aria-label={t('folder.newFileIn', { name })}
          title={t('folder.newFileIn', { name })} onClick={() => requestAction(() => onEdit('file'))}>
          <FilePlus size={13} />
        </Button>
        <Button variant="icon" size="xs" aria-label={t('folder.newFolderIn', { name })}
          title={t('folder.newFolderIn', { name })} onClick={() => requestAction(() => onEdit('directory'))}>
          <FolderPlus size={13} />
        </Button>
      </>}
      <Button variant="icon" size="xs" aria-label={t('folder.renameEntry', { name })}
        title={t('folder.renameEntry', { name })} onClick={() => requestAction(() => onEdit('rename'))}>
        <PencilSimple size={13} />
      </Button>
      <Button variant="icon" size="xs" aria-label={t('folder.trashEntry', { name })}
        title={t('folder.trashEntry', { name })} onClick={() => requestAction(() => onTrash(path, name))}>
        <Trash size={13} />
      </Button>
    </div>
  );
};

const DirectoryRow = ({ entry, parent, ...props }: Omit<Props, 'path'> & { entry: DirEntry; parent: string }) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>(null);
  const path = joinFilePath(parent, entry.name);
  const submit = async (name: string): Promise<string | undefined> => {
    const error = editMode === 'rename'
      ? await props.onRename(path, name)
      : await props.onCreate(path, editMode === 'directory' ? 'directory' : 'file', name);
    if (!error) {
      if (editMode !== 'rename') setExpanded(true);
      setEditMode(null);
    }
    return error;
  };

  return (
    <div>
      <div className="folder-browser__directory-row folder-browser__entry-row">
        <Button size="xs" className="folder-browser__tree-row" aria-expanded={expanded}
          onClick={() => setExpanded(value => !value)}>
          {expanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
          <span>{entry.name}</span>
        </Button>
        <EntryActions name={entry.name} path={path} directory adding={props.adding}
          onAddDirectory={props.onAddDirectory ? () => props.onAddDirectory?.(path) : undefined}
          onEdit={setEditMode} onTrash={props.onTrash} requestAction={props.requestAction} />
      </div>
      {editMode && <EntryNameInput
        ariaLabel={editMode === 'rename'
          ? t('folder.renameEntry', { name: entry.name })
          : t(editMode === 'file' ? 'folder.newFileName' : 'folder.newFolderName')}
        initialValue={editMode === 'rename' ? entry.name : ''}
        onCancel={() => setEditMode(null)}
        onSubmit={submit}
      />}
      {expanded && <div className="folder-browser__children">
        <FileTree {...props} path={path} />
      </div>}
    </div>
  );
};

const FileRow = ({ entry, path, selectedPath, onSelect, onRename, onTrash, requestAction }: {
  entry: DirEntry;
  path: string;
  selectedPath?: string;
  onSelect: Props['onSelect'];
  onRename: Props['onRename'];
  onTrash: Props['onTrash'];
  requestAction: Props['requestAction'];
}) => {
  const { t } = useI18n();
  const [renaming, setRenaming] = useState(false);
  const filePath = joinFilePath(path, entry.name);
  return <>
    <div className="folder-browser__entry-row">
      <Button size="xs" className="folder-browser__tree-row" aria-pressed={selectedPath === filePath}
        title={entry.name} onClick={() => onSelect(filePath)}>
        <FileTypeIcon name={entry.name} /><span className="folder-browser__file-label">{entry.name}</span>
      </Button>
      <EntryActions name={entry.name} path={filePath} directory={false} onEdit={() => setRenaming(true)}
        onTrash={onTrash} requestAction={requestAction} />
    </div>
    {renaming && <EntryNameInput ariaLabel={t('folder.renameEntry', { name: entry.name })} initialValue={entry.name}
      onCancel={() => setRenaming(false)} onSubmit={async name => {
        const error = await onRename(filePath, name);
        if (!error) setRenaming(false);
        return error;
      }} />}
  </>;
};

export const FileTree = (props: Props) => {
  const { t } = useI18n();
  const [entries, setEntries] = useState<DirEntry[] | null>(null);
  const [error, setError] = useState('');
  const mutationId = props.mutation?.parentPath === props.path ? props.mutation.id : 0;

  useEffect(() => {
    let current = true;
    setEntries(null);
    setError('');
    void window.canvasWorkspace.file.listDir(props.path, 0, true).then(result => {
      if (!current) return;
      if (result.ok) setEntries(result.entries ?? []);
      else setError(result.error || t('folder.readFailed'));
    }).catch(error => { if (current) setError(String(error)); });
    return () => { current = false; };
  }, [props.path, props.revision, mutationId, t]);

  if (error) return <div className="folder-browser__hint" role="alert">{error}</div>;
  if (!entries) return <div className="folder-browser__hint">{t('folder.loading')}</div>;
  if (!entries.length) return <div className="folder-browser__hint">{t('folder.empty')}</div>;
  return <>{entries.map(entry => entry.type === 'dir' ? (
    <DirectoryRow key={entry.name} entry={entry} parent={props.path} {...props} />
  ) : (
    <FileRow key={entry.name} entry={entry} path={props.path} selectedPath={props.selectedPath}
      onSelect={props.onSelect} onRename={props.onRename} onTrash={props.onTrash} requestAction={props.requestAction} />
  ))}</>;
};
