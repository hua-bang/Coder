import { useId } from 'react';
import { Button, Modal } from '../../../../../components/ui';
import { useI18n } from '../../../../../i18n';
import type { useFileEditor } from './useFileEditor';

export const UnsavedFileDialog = ({ controller }: { controller: ReturnType<typeof useFileEditor> }) => {
  const { state, editor, scope, save } = controller;
  const { t } = useI18n();
  const titleId = useId();
  return <Modal open={Boolean(state.pending)} onClose={() => { if (!state.saving) editor.update(scope, { pending: undefined }); }} labelledBy={titleId} width={420}>
    <div className="folder-editor-dialog">
      <h3 id={titleId}>{t('folder.unsavedTitle')}</h3>
      <p>{state.draft?.path.split(/[\\/]/).pop()}</p>
      <p>{t('folder.unsavedHint')}</p>
      {state.error && <p role="alert">{state.error}</p>}
      <div className="folder-editor-dialog__actions">
        <Button size="sm" disabled={state.saving} onClick={() => editor.update(scope, { pending: undefined })}>{t('folder.cancel')}</Button>
        <Button size="sm" disabled={state.saving} onClick={() => { editor.discard(scope); editor.proceed(scope); }}>{t('folder.discard')}</Button>
        <Button size="sm" variant="primary" disabled={state.saving} onClick={() => { void save().then(ok => { if (ok) editor.proceed(scope); }); }}>{t('folder.save')}</Button>
      </div>
    </div>
  </Modal>;
};
