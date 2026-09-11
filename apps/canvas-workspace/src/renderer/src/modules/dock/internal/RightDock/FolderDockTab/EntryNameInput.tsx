import { useState } from 'react';
import { Check, X } from '@phosphor-icons/react';
import { Button, TextField } from '../../../../../components/ui';
import { useI18n } from '../../../../../i18n';

interface Props {
  ariaLabel: string;
  initialValue?: string;
  placeholder?: string;
  onCancel: () => void;
  onSubmit: (name: string) => Promise<string | undefined>;
}

export const EntryNameInput = ({ ariaLabel, initialValue = '', placeholder, onCancel, onSubmit }: Props) => {
  const { t } = useI18n();
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    const nextError = await onSubmit(name);
    setSubmitting(false);
    if (nextError) setError(nextError);
  };

  return (
    <div className="folder-browser__entry-editor">
      <div className="folder-browser__entry-editor-row">
        <TextField aria-label={ariaLabel} value={name} placeholder={placeholder} autoFocus
          className="folder-browser__entry-input" onFocus={event => event.currentTarget.select()}
          onChange={event => setName(event.target.value)} onKeyDown={event => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'Enter') { event.preventDefault(); void submit(); }
            if (event.key === 'Escape') { event.preventDefault(); onCancel(); }
          }} />
        <Button variant="icon" size="xs" disabled={submitting} aria-label={t('folder.confirmName')}
          onClick={() => { void submit(); }}><Check size={13} /></Button>
        <Button variant="icon" size="xs" disabled={submitting} aria-label={t('folder.cancelName')}
          onClick={onCancel}><X size={13} /></Button>
      </div>
      {error && <div className="folder-browser__entry-error" role="alert">{error}</div>}
    </div>
  );
};
