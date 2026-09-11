import { useMemo, useState } from 'react';
import type { EditorState, EditorView } from '@uiw/react-codemirror';
import { runScopeHandlers } from '@uiw/react-codemirror';
import { SearchQuery, closeSearchPanel, findNext, findPrevious, getSearchQuery, replaceAll, replaceNext, setSearchQuery } from '@codemirror/search';
import { ArrowUp, ArrowDown, CaretRight, CaretDown, X } from '@phosphor-icons/react';
import { Button, TextField } from '../../../../../components/ui';
import { useI18n } from '../../../../../i18n';

export const summarizeSearchMatches = (state: EditorState, query: SearchQuery) => {
  if (!query.valid) return { current: 0, total: '0' };
  const cursor = query.getCursor(state);
  const selection = state.selection.main;
  let total = 0, current = 0;
  while (total < 1000) {
    const match = cursor.next();
    if (match.done) return { current, total: String(total) };
    total++;
    if (match.value.from === selection.from && match.value.to === selection.to) current = total;
  }
  return { current, total: cursor.next().done ? '1000' : '1000+' };
};

/** Native findNext selects the search input. Typing must keep its caret,
 * otherwise the next character overwrites the entire query. */
export const findNextWhileTyping = (view: EditorView, input: HTMLInputElement, composing = false) => {
  if (composing) return;
  const { selectionStart, selectionEnd, selectionDirection } = input;
  findNext(view);
  if (input.isConnected && selectionStart !== null && selectionEnd !== null) {
    input.setSelectionRange(selectionStart, selectionEnd, selectionDirection ?? undefined);
  }
};

export const EditorSearchPanel = ({ view, revision }: { view: EditorView; revision: number }) => {
  const { t } = useI18n();
  const [replaceOpen, setReplaceOpen] = useState(false);
  const query = getSearchQuery(view.state);
  const matches = useMemo(() => summarizeSearchMatches(view.state, query), [view, revision, query]);
  const update = (patch: Partial<Pick<SearchQuery, 'search' | 'replace' | 'caseSensitive' | 'regexp' | 'wholeWord'>>, input?: HTMLInputElement, composing = false) => {
    view.dispatch({ effects: setSearchQuery.of(new SearchQuery({ ...query, ...patch })),
      ...(patch.search !== undefined ? { selection: { anchor: view.state.selection.main.from } } : {}) });
    if (patch.search !== undefined && input) findNextWhileTyping(view, input, composing);
  };
  const close = () => { closeSearchPanel(view); view.focus(); };
  return <div className="file-search" onKeyDown={event => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault(); event.stopPropagation();
      if (event.target instanceof HTMLInputElement && event.target.name === 'replace') replaceNext(view);
      else (event.shiftKey ? findPrevious : findNext)(view);
    } else if (runScopeHandlers(view, event.nativeEvent, 'search-panel')) {
      event.preventDefault(); event.stopPropagation();
    }
  }}>
    <div className="file-search__row">
      <Button variant="icon" size="sm" aria-label={t('folder.search.toggleReplace')} title={t('folder.search.toggleReplace')}
        aria-expanded={replaceOpen} onClick={() => setReplaceOpen(open => !open)}>{replaceOpen ? <CaretDown size={13} /> : <CaretRight size={13} />}</Button>
      <div className="file-search__query">
        <TextField autoFocus name="search" data-main-field="true" main-field="true" value={query.search}
          placeholder={t('folder.search.find')} aria-label={t('folder.search.find')}
          aria-invalid={Boolean(query.search && !query.valid)} onChange={event => update({ search: event.target.value }, event.currentTarget, Boolean((event.nativeEvent as InputEvent).isComposing))} />
        <Button variant="icon" size="sm" aria-pressed={query.caseSensitive} aria-label={t('folder.search.matchCase')} title={t('folder.search.matchCase')}
          onClick={() => update({ caseSensitive: !query.caseSensitive })}>Aa</Button>
        <Button variant="icon" size="sm" aria-pressed={query.wholeWord} aria-label={t('folder.search.wholeWord')} title={t('folder.search.wholeWord')}
          onClick={() => update({ wholeWord: !query.wholeWord })}><span className="file-search__word">ab</span></Button>
        <Button variant="icon" size="sm" aria-pressed={query.regexp} aria-label={t('folder.search.regexp')} title={t('folder.search.regexp')}
          onClick={() => update({ regexp: !query.regexp })}>.*</Button>
      </div>
      <div className="file-search__actions">
      <span className="file-search__count" aria-live="polite">{matches.current} / {matches.total}</span>
      <Button variant="icon" size="sm" disabled={!query.valid} aria-label={t('folder.search.previous')} title={t('folder.search.previous')} onClick={() => findPrevious(view)}><ArrowUp size={16} /></Button>
      <Button variant="icon" size="sm" disabled={!query.valid} aria-label={t('folder.search.next')} title={t('folder.search.next')} onClick={() => findNext(view)}><ArrowDown size={16} /></Button>
      <Button variant="icon" size="sm" aria-label={t('folder.search.close')} title={t('folder.search.close')} onClick={close}><X size={16} /></Button>
      </div>
    </div>
    {replaceOpen && !view.state.readOnly && <div className="file-search__replace">
      <TextField name="replace" value={query.replace} aria-label={t('folder.search.replacePlaceholder')}
        placeholder={t('folder.search.replacePlaceholder')} onChange={event => update({ replace: event.target.value })} />
      <Button size="xs" disabled={!query.valid} onClick={() => replaceNext(view)}>{t('folder.search.replace')}</Button>
      <Button size="xs" disabled={!query.valid} onClick={() => replaceAll(view)}>{t('folder.search.replaceAll')}</Button>
    </div>}
  </div>;
};
