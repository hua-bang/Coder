import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useDragResize } from '../../../../components/ui';

const DEFAULT_SPLIT_WIDTH = 720;
const MIN_SPLIT_PANE_WIDTH = 280;
const CHAT_SPLIT_WIDTH = 380;
const SPLIT_DIVIDER_WIDTH = 6;
const KEYBOARD_RESIZE_STEP = 24;
const RESIZING_CLASS = 'right-dock-resizing';
type ChatPane = 'left' | 'right';

interface Options {
  active: boolean;
  dockWidth: number;
  chatPane?: ChatPane;
  setDockWidth: (update: (current: number) => number) => void;
  clampDockWidth: (value: number) => number;
}

export const resolveSplitContentWidth = (dockWidth: number, chatPane?: ChatPane, preferredWidth?: number): number => {
  const available = Math.max(0, dockWidth - SPLIT_DIVIDER_WIDTH);
  const minimum = Math.min(MIN_SPLIT_PANE_WIDTH, Math.floor(available / 2));
  const preferred = preferredWidth ?? (chatPane ? Math.min(CHAT_SPLIT_WIDTH, available / 2) : available / 2);
  return Math.round(Math.min(available - minimum, Math.max(minimum, chatPane === 'right' ? available - preferred : preferred)));
};

export const useDockSplitView = ({ active, dockWidth, chatPane, setDockWidth, clampDockWidth }: Options) => {
  // For chat comparisons remember the CHAT width, so widening the workbench
  // gives the file more room instead of stretching the conversation.
  const [preferredWidths, setPreferredWidths] = useState<Partial<Record<ChatPane | 'content', number>>>({});
  const preferenceKey = chatPane ?? 'content';
  const contentWidth = resolveSplitContentWidth(dockWidth, chatPane, preferredWidths[preferenceKey]);
  const minContentWidth = Math.min(MIN_SPLIT_PANE_WIDTH, Math.floor(Math.max(0, dockWidth - SPLIT_DIVIDER_WIDTH) / 2));
  const maxContentWidth = Math.max(minContentWidth, dockWidth - minContentWidth - SPLIT_DIVIDER_WIDTH);
  const setContentWidth = (value: number) => {
    const clamped = Math.min(maxContentWidth, Math.max(minContentWidth, value));
    setPreferredWidths(current => ({ ...current, [preferenceKey]: chatPane === 'right' ? dockWidth - SPLIT_DIVIDER_WIDTH - clamped : clamped }));
  };

  useEffect(() => {
    if (active) setDockWidth((current) => clampDockWidth(Math.max(current, DEFAULT_SPLIT_WIDTH)));
  }, [active, clampDockWidth, setDockWidth]);

  const resize = useDragResize({
    axis: 'x', value: contentWidth, min: minContentWidth, max: maxContentWidth,
    onChange: setContentWidth,
    onDragStart: () => document.documentElement.classList.add(RESIZING_CLASS),
    onDragEnd: () => document.documentElement.classList.remove(RESIZING_CLASS),
  });

  const onDividerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    event.stopPropagation();
    setContentWidth(contentWidth + (event.key === 'ArrowLeft' ? -1 : 1) * KEYBOARD_RESIZE_STEP);
  };

  return { contentWidth, dividerWidth: SPLIT_DIVIDER_WIDTH, minContentWidth, maxContentWidth,
    onDividerMouseDown: resize.onMouseDown, onDividerKeyDown };
};
