// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EditorView } from '@uiw/react-codemirror';
import { findNext } from '@codemirror/search';
import { findNextWhileTyping } from '../EditorSearchPanel';

vi.mock('@codemirror/search', async importOriginal => ({
  ...await importOriginal<typeof import('@codemirror/search')>(),
  // This is the documented side effect of the native command when its
  // [main-field] search input has focus.
  findNext: vi.fn(() => { (document.activeElement as HTMLInputElement)?.select(); return true; }),
}));
const view = {} as EditorView;
let input: HTMLInputElement;
afterEach(() => { input?.remove(); vi.clearAllMocks(); });
const mount = (value = '') => {
  input = document.createElement('input'); input.value = value;
  document.body.appendChild(input); input.focus();
};

describe('live search typing', () => {
  it('accumulates successive characters instead of replacing the selected query', () => {
    mount();
    for (const character of 'Agent') {
      input.setRangeText(character, input.selectionStart!, input.selectionEnd!, 'end');
      findNextWhileTyping(view, input);
    }
    expect(input.value).toBe('Agent');
    expect(input.selectionStart).toBe(5);
    expect(input.selectionEnd).toBe(5);
    expect(findNext).toHaveBeenCalledTimes(5);
  });
  it('preserves a backwards selection when searching while editing a query', () => {
    mount('agent'); input.setSelectionRange(1, 4, 'backward');
    findNextWhileTyping(view, input);
    expect([input.selectionStart, input.selectionEnd, input.selectionDirection]).toEqual([1, 4, 'backward']);
  });
  it('does not invoke selection-changing commands during composition', () => {
    mount('中文'); input.setSelectionRange(2, 2);
    findNextWhileTyping(view, input, true);
    expect(findNext).not.toHaveBeenCalled();
    expect(input.selectionStart).toBe(2);
  });
});
