import { wrapText, measureTextBounds, renderTextStroke, renderTextWithEffects } from '@/utils/placeTextRenderer';
import { createCompatibleCanvas } from '@/utils/canvasUtils';

// Mock canvasUtils
jest.mock('@/utils/canvasUtils', () => ({
  createCompatibleCanvas: jest.fn(),
}));

describe('placeTextRenderer', () => {
  let mockCtx: any;

  beforeEach(() => {
    mockCtx = {
      measureText: jest.fn((text) => ({ width: text.length * 10 })), // Simple mock: 10px per char
      font: '',
      textAlign: '',
      save: jest.fn(),
      restore: jest.fn(),
      strokeText: jest.fn(),
      fillText: jest.fn(),
      lineJoin: '',
      miterLimit: 0,
      strokeStyle: '',
      lineWidth: 0,
      fillStyle: '',
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('wrapText', () => {
    test('wraps text correctly', () => {
      const text = 'This is a long text to wrap';
      // Width limit 50.
      // "This" (40) fits.
      // "This is" (70) > 50. New line.
      // "is" (20) fits. "is a" (40) fits. "is a long" (90) > 50.
      // "long" (40) fits. "long text" (90) > 50.
      // "text" (40) fits. "text to" (70) > 50.
      // Lines so far: "This", "is a", "long", "text". 4 lines.
      // Next is "to wrap". Loop continues.
      // Next word "to".
      // width of "text to" > 50. "text" pushed.
      // lines.length is now 4.
      // "line" is now "to".
      // lines.length >= maxLines (4).
      // Return lines with ellipsis.

      const lines = wrapText(text, 50, mockCtx);

      expect(lines.length).toBe(4);
      expect(lines[3]).toContain('...');
    });

    test('handles short text', () => {
      const text = 'Short';
      const lines = wrapText(text, 100, mockCtx);
      expect(lines).toEqual(['Short']);
    });
  });

  describe('measureTextBounds', () => {
    test('calculates bounds', () => {
      const lines = ['Line 1', 'Line 2']; // 6 chars -> 60 width
      const bounds = measureTextBounds(lines, 12, 'Arial', mockCtx);
      expect(bounds.width).toBe(60);
      expect(bounds.height).toBe(lines.length * 12 * 1.2);
      expect(mockCtx.font).toBe('12px Arial');
    });
  });

  describe('renderTextStroke', () => {
    test('renders stroke', () => {
      renderTextStroke(mockCtx, 'Test', 0, 0, '#000', 2);
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.lineWidth).toBe(4); // 2 * 2
      expect(mockCtx.strokeText).toHaveBeenCalledWith('Test', 0, 0);
      expect(mockCtx.restore).toHaveBeenCalled();
    });
  });

  describe('renderTextWithEffects', () => {
    test('renders text with style', () => {
      const style = {
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: '#ff0000',
        strokeColor: '#000',
        strokeWidth: 1,
        glowColor: '#fff',
        glowBlur: 5
      };

      renderTextWithEffects(mockCtx, ['Test'], 0, 0, style);

      // Should render stroke
      expect(mockCtx.strokeText).toHaveBeenCalledWith('Test', 0, 0);

      // Should render glow (shadow)
      expect(mockCtx.shadowColor).toBe('#fff');

      // Should render fill
      expect(mockCtx.fillStyle).toBe('#ff0000');
      expect(mockCtx.fillText).toHaveBeenCalledWith('Test', 0, 0);
    });
  });
});
