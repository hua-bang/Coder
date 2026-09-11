import { useEffect, useMemo, useRef, useState } from 'react';
import CodeMirror, { EditorState, EditorView, type Extension, type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { undo, redo, undoDepth, redoDepth } from '@codemirror/commands';
import { ArrowCounterClockwise, ArrowClockwise } from '@phosphor-icons/react';
import { Portal } from '../../../../../components/ui';
import { EditorSearchPanel } from './EditorSearchPanel';
import { useEditorSearchPanel } from './useEditorSearchPanel';
import { Button } from '../../../../../components/ui';
import './search-panel.css';
import { useI18n } from '../../../../../i18n';

interface Props { path: string; content: string; original: string; saving: boolean; onChange: (content: string) => void }

export const CodeEditor = ({ path, content, original, saving, onChange }: Props) => {
  const { t } = useI18n();
  const searchPanel = useEditorSearchPanel();
  const viewRef = useRef<ReactCodeMirrorRef>(null);
  const [history, setHistory] = useState({ undo: false, redo: false });
  const [language, setLanguage] = useState<Extension[]>([]);
  useEffect(() => {
    let active = true;
    setLanguage([]);
    const description = LanguageDescription.matchFilename(languages, path.split(/[\\/]/).pop() ?? path);
    void description?.load().then(extension => { if (active) setLanguage([extension]); }).catch(() => undefined);
    return () => { active = false; };
  }, [path]);
  const separator = original.includes('\r\n') ? '\r\n' : '\n';
  const extensions = useMemo(() => [searchPanel.extension, EditorState.lineSeparator.of(separator), EditorState.phrases.of({
    Find: t('folder.search.find'), Replace: t('folder.search.replacePlaceholder'),
    next: t('folder.search.next'), previous: t('folder.search.previous'),
    'match case': t('folder.search.matchCase'), regexp: t('folder.search.regexp'), 'by word': t('folder.search.wholeWord'),
    replace: t('folder.search.replace'), 'replace all': t('folder.search.replaceAll'), close: t('folder.search.close'),
  }), EditorView.contentAttributes.of({ 'aria-label': t('folder.editor') }), ...language], [separator, language, t, searchPanel.extension]);
  return <div className="folder-code-editor"><CodeMirror ref={viewRef} value={content} extensions={extensions} height="100%"
    theme="none" readOnly={saving} onChange={onChange} aria-label={t('folder.editor')}
    onUpdate={update => {
      const next = { undo: undoDepth(update.state) > 0, redo: redoDepth(update.state) > 0 };
      setHistory(previous => previous.undo === next.undo && previous.redo === next.redo ? previous : next);
    }}
    basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true, autocompletion: false }} />
    {searchPanel.panel && <Portal target={searchPanel.panel.dom}><EditorSearchPanel view={searchPanel.panel.view} revision={searchPanel.panel.revision} /></Portal>}
    {(history.undo || history.redo) && <div className="folder-editor-history" aria-label={t('folder.history')}>
      <Button variant="icon" size="md" disabled={saving || !history.undo} aria-label={t('folder.undo')} title={t('folder.undo')}
        onMouseDown={event => event.preventDefault()} onClick={() => { const view = viewRef.current?.view; if (view) { undo(view); view.focus(); } }}><ArrowCounterClockwise size={16} /></Button>
      <Button variant="icon" size="md" disabled={saving || !history.redo} aria-label={t('folder.redo')} title={t('folder.redo')}
        onMouseDown={event => event.preventDefault()} onClick={() => { const view = viewRef.current?.view; if (view) { redo(view); view.focus(); } }}><ArrowClockwise size={16} /></Button>
    </div>}
  </div>;
};
