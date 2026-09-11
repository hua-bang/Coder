import { describe, expect, it } from 'vitest';
import { EditorState } from '@uiw/react-codemirror';
import { SearchQuery } from '@codemirror/search';
import { summarizeSearchMatches } from '../EditorSearchPanel';

describe('editor search match counter', () => {
  it('reports the selected match and honors case and whole-word options', () => {
    const state = EditorState.create({ doc: 'same Same sameish', selection: { anchor: 0, head: 4 } });
    expect(summarizeSearchMatches(state, new SearchQuery({ search: 'same' }))).toEqual({ current: 1, total: '3' });
    expect(summarizeSearchMatches(state, new SearchQuery({ search: 'same', caseSensitive: true, wholeWord: true }))).toEqual({ current: 1, total: '1' });
  });
  it('handles empty and invalid regular expressions without throwing', () => {
    const state = EditorState.create({ doc: 'same' });
    for (const query of [new SearchQuery({ search: '' }), new SearchQuery({ search: '[', regexp: true })]) {
      expect(summarizeSearchMatches(state, query)).toEqual({ current: 0, total: '0' });
    }
  });
  it('bounds counting work and distinguishes an exact limit', () => {
    const query = new SearchQuery({ search: 'a' });
    expect(summarizeSearchMatches(EditorState.create({ doc: 'a '.repeat(1000) }), query).total).toBe('1000');
    expect(summarizeSearchMatches(EditorState.create({ doc: 'a '.repeat(1001) }), query).total).toBe('1000+');
  });
});
