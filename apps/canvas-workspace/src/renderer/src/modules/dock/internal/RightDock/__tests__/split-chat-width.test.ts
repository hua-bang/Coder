import { describe, expect, it } from 'vitest';
import { resolveSplitContentWidth } from '../useDockSplitView';

describe('comparison chat width', () => {
  it('keeps right-hand chat compact while giving extra width to the file', () => {
    expect(resolveSplitContentWidth(1200, 'right')).toBe(814);
    expect(resolveSplitContentWidth(1600, 'right')).toBe(1214);
    expect(resolveSplitContentWidth(720, 'right')).toBe(357);
  });
  it('respects chat position and manually chosen width', () => {
    expect(resolveSplitContentWidth(1200, 'left')).toBe(380);
    expect(resolveSplitContentWidth(1200, 'right', 440)).toBe(754);
    expect(resolveSplitContentWidth(1600, 'right', 440)).toBe(1154);
    expect(resolveSplitContentWidth(1200)).toBe(597);
  });
  it('fits both panes when a route caps the dock below the normal split width', () => {
    expect(resolveSplitContentWidth(400, 'right')).toBe(197);
    expect(resolveSplitContentWidth(720, 'right', 900)).toBe(280);
  });
});
