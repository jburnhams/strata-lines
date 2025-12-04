import {
  renderIcon,
  renderPinIcon,
  renderDotIcon,
  renderCircleIcon,
  renderMarkerIcon,
  renderFlagIcon,
  renderStarIcon,
  renderIconShadow,
  resetIconCache
} from '@/utils/placeIconRenderer';
import { createCompatibleCanvas } from '@/utils/canvasUtils';

// Mock canvasUtils
jest.mock('@/utils/canvasUtils', () => ({
  createCompatibleCanvas: jest.fn(),
}));

describe('placeIconRenderer', () => {
  let mockCtx: any;
  let mockCanvas: any;

  beforeEach(() => {
    mockCtx = {
      beginPath: jest.fn(),
      arc: jest.fn(),
      lineTo: jest.fn(),
      moveTo: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      closePath: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      quadraticCurveTo: jest.fn(),
      drawImage: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      lineCap: '',
      filter: '',
    };

    mockCanvas = {
      getContext: jest.fn(() => mockCtx),
      width: 100,
      height: 100,
    };

    (createCompatibleCanvas as jest.Mock).mockReturnValue(mockCanvas);
    resetIconCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renderPinIcon draws correctly', () => {
    renderPinIcon(mockCtx, 50, 50, 20, '#ff0000');
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    // Check main color fill
    expect(mockCtx.fillStyle).toBe('rgba(255, 255, 255, 0.3)'); // Last fill style set was highlight
  });

  test('renderDotIcon draws correctly', () => {
    renderDotIcon(mockCtx, 50, 50, 20, '#00ff00');
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalledWith(50, 50, 10, 0, Math.PI * 2);
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  test('renderCircleIcon draws correctly', () => {
    renderCircleIcon(mockCtx, 50, 50, 20, '#0000ff');
    expect(mockCtx.arc).toHaveBeenCalledWith(50, 50, 10, 0, Math.PI * 2);
    expect(mockCtx.fillStyle).toBe('#ffffff');
    expect(mockCtx.strokeStyle).toBe('#0000ff');
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  test('renderMarkerIcon draws correctly', () => {
    renderMarkerIcon(mockCtx, 50, 50, 20, '#ffff00');
    expect(mockCtx.quadraticCurveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
  });

  test('renderFlagIcon draws correctly', () => {
    renderFlagIcon(mockCtx, 50, 50, 20, '#00ffff');
    expect(mockCtx.moveTo).toHaveBeenCalled();
    expect(mockCtx.lineTo).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled(); // Pole
    expect(mockCtx.fill).toHaveBeenCalled();   // Flag
  });

  test('renderStarIcon draws correctly', () => {
    renderStarIcon(mockCtx, 50, 50, 20, '#ff00ff');
    expect(mockCtx.lineTo).toHaveBeenCalled(); // Many lines
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();
  });

  test('renderIconShadow draws shadow for supported styles', () => {
    renderIconShadow(mockCtx, 'pin', 50, 50, 20);
    expect(mockCtx.save).toHaveBeenCalled();
    expect(mockCtx.scale).toHaveBeenCalledWith(1, 0.3);
    expect(mockCtx.fillStyle).toBe('rgba(0,0,0,0.3)');
    expect(mockCtx.restore).toHaveBeenCalled();
  });

  test('renderIconShadow ignores unsupported styles', () => {
    renderIconShadow(mockCtx, 'dot', 50, 50, 20);
    expect(mockCtx.save).not.toHaveBeenCalled();
  });

  test('renderIcon uses factory and caches result', () => {
    // First call
    renderIcon(mockCtx, 'pin', 50, 50, 20, '#ff0000');
    expect(createCompatibleCanvas).toHaveBeenCalledTimes(1);
    expect(createCompatibleCanvas).toHaveBeenCalledWith(40, 40); // ceil(20*2)
    expect(mockCtx.drawImage).toHaveBeenCalled(); // Draw from cache to dest

    // Second call with same params should use cache
    renderIcon(mockCtx, 'pin', 100, 100, 20, '#ff0000');
    expect(createCompatibleCanvas).toHaveBeenCalledTimes(1); // No new canvas
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(2);
  });

  test('renderIcon creates new cache for different params', () => {
    renderIcon(mockCtx, 'pin', 50, 50, 20, '#ff0000');
    renderIcon(mockCtx, 'dot', 50, 50, 20, '#ff0000');
    expect(createCompatibleCanvas).toHaveBeenCalledTimes(2);
  });
});
