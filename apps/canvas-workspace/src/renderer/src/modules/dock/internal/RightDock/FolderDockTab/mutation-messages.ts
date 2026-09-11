import { useCallback } from 'react';
import { useI18n } from '../../../../../i18n';

const en = {
  newFile: 'New file',
  newFolder: 'New folder',
  newFileIn: 'New file in {name}',
  newFolderIn: 'New folder in {name}',
  createIn: 'Create in {name}',
  moreActions: 'More actions for {name}',
  newFileName: 'New file name',
  newFolderName: 'New folder name',
  renameEntry: 'Rename {name}',
  trashEntry: 'Move {name} to Trash',
  confirmName: 'Confirm name',
  cancelName: 'Cancel',
  trashTitle: 'Move “{name}” to Trash?',
  trashDescription: 'This item will be removed from the opened folder and can be restored from the system Trash.',
  trashConfirm: 'Move to Trash',
  operationFailed: 'File operation failed',
  mutationUnavailable: 'Restart Pulse Canvas to enable file and folder management.',
} as const;

const zh: Record<keyof typeof en, string> = {
  newFile: '新建文件',
  newFolder: '新建文件夹',
  newFileIn: '在 {name} 中新建文件',
  newFolderIn: '在 {name} 中新建文件夹',
  createIn: '在 {name} 中新建',
  moreActions: '{name} 的更多操作',
  newFileName: '新文件名称',
  newFolderName: '新文件夹名称',
  renameEntry: '重命名 {name}',
  trashEntry: '将 {name} 移到废纸篓',
  confirmName: '确认名称',
  cancelName: '取消',
  trashTitle: '将“{name}”移到废纸篓？',
  trashDescription: '该项目会从当前打开的文件夹中移除，并可从系统废纸篓恢复。',
  trashConfirm: '移到废纸篓',
  operationFailed: '文件操作失败',
  mutationUnavailable: '请重启 Pulse Canvas 以启用文件和文件夹管理。',
};

type MutationMessageKey = keyof typeof en;
type Params = Record<string, string | number>;

const interpolate = (template: string, params?: Params): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => (
    params[key] == null ? match : String(params[key])
  ));
};

export const useMutationMessages = () => {
  const { language } = useI18n();
  return useCallback((key: MutationMessageKey, params?: Params) => (
    interpolate((language === 'zh' ? zh : en)[key], params)
  ), [language]);
};
