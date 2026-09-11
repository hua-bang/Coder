import { useEffect, useState } from 'react';
import { CaretDown, CaretRight, ChatCircle } from '@phosphor-icons/react';
import { FileTypeIcon } from './FileTypeIcon';
import { Button } from '../../../../../components/ui';
import { useI18n } from '../../../../../i18n';
import type { DirEntry } from '../../../../../types';

interface Props {
  path: string;
  selectedPath?: string;
  onSelect: (path: string) => void;
  revision: number;
  onAddDirectory?: (path: string) => void;
  adding?: boolean;
}

export const joinFilePath = (parent: string, name: string): string => `${parent.replace(/[\\/]$/, '')}/${name}`;

const DirectoryRow = ({ entry, parent, ...props }: Omit<Props, 'path'> & { entry: DirEntry; parent: string }) => {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const path = joinFilePath(parent, entry.name);
  return (
    <div>
      <div className="folder-browser__directory-row">
      <Button size="xs" className="folder-browser__tree-row" aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}>
        {expanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
        <span>{entry.name}</span>
      </Button>
      {props.onAddDirectory && <Button variant="icon" size="xs" className="folder-browser__directory-chat"
        disabled={props.adding} title={t('folder.addDirectory', { name: entry.name })}
        aria-label={t('folder.addDirectory', { name: entry.name })}
        onClick={() => props.onAddDirectory?.(path)}><ChatCircle size={14} /></Button>}
      </div>
      {expanded && <div className="folder-browser__children"><FileTree path={path} {...props} /></div>}
    </div>
  );
};

export const FileTree = ({ path, selectedPath, onSelect, revision, onAddDirectory, adding }: Props) => {
  const { t } = useI18n();
  const [entries, setEntries] = useState<DirEntry[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let current = true;
    setEntries(null);
    setError('');
    void window.canvasWorkspace.file.listDir(path, 0, true).then(result => {
      if (!current) return;
      if (result.ok) setEntries(result.entries ?? []);
      else setError(result.error || t('folder.readFailed'));
    }).catch(error => { if (current) setError(String(error)); });
    return () => { current = false; };
  }, [path, revision, t]);
  if (error) return <div className="folder-browser__hint" role="alert">{error}</div>;
  if (!entries) return <div className="folder-browser__hint">{t('folder.loading')}</div>;
  if (!entries.length) return <div className="folder-browser__hint">{t('folder.empty')}</div>;
  return <>{entries.map(entry => entry.type === 'dir' ? (
    <DirectoryRow key={entry.name} entry={entry} parent={path} selectedPath={selectedPath} onSelect={onSelect} revision={revision} onAddDirectory={onAddDirectory} adding={adding} />
  ) : (
    <Button key={entry.name} size="xs" className="folder-browser__tree-row"
      aria-pressed={selectedPath === joinFilePath(path, entry.name)}
      title={entry.name} onClick={() => onSelect(joinFilePath(path, entry.name))}>
      <FileTypeIcon name={entry.name} /><span className="folder-browser__file-label">{entry.name}</span>
    </Button>
  ))}</>;
};
