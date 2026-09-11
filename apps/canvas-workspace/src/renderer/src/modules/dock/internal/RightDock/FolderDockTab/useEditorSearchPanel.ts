import { useMemo, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { search, getSearchQuery } from '@codemirror/search';

/** CodeMirror owns panel lifecycle and query state; React owns its controls. */
export const useEditorSearchPanel = () => {
  const [panel, setPanel] = useState<{ dom: HTMLElement; view: EditorView; revision: number } | null>(null);
  const extension = useMemo(() => search({
    top: true,
    createPanel(view) {
      const dom = document.createElement('div');
      dom.className = 'file-search-host';
      setPanel({ dom, view, revision: 0 });
      return {
        dom,
        top: true,
        update: update => {
          if (update.docChanged || update.selectionSet || update.state.readOnly !== update.startState.readOnly
            || getSearchQuery(update.state) !== getSearchQuery(update.startState)) {
            setPanel(current => current?.dom === dom ? { ...current, revision: current.revision + 1 } : current);
          }
        },
        destroy: () => setPanel(current => current?.dom === dom ? null : current),
      };
    },
  }), []);
  return { panel, extension };
};
