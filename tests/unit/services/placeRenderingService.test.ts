import { renderPlacesOnCanvas, renderPlace, getVisiblePlaces } from '@/services/placeRenderingService';
import { renderIcon } from '@/utils/placeIconRenderer';
import { renderTextWithEffects, wrapText, measureTextBounds } from '@/utils/placeTextRenderer';
import L from 'leaflet';

jest.mock('@/utils/placeIconRenderer');
jest.mock('@/utils/placeTextRenderer');
jest.mock('@/services/titlePositioningService', () => ({
  calculateOptimalPositions: jest.fn(() => new Map()),
}));

describe('placeRenderingService', () => {
  let mockCtx: any;
  let mockCanvas: any;

  beforeEach(() => {
    mockCtx = {
      getContext: jest.fn(),
      textAlign: '',
      textBaseline: '',
    };
    mockCanvas = {
      getContext: jest.fn(() => mockCtx),
      width: 1000,
      height: 1000
    };

    (wrapText as jest.Mock).mockReturnValue(['Line 1']);
    (measureTextBounds as jest.Mock).mockReturnValue({ width: 50, height: 20 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getVisiblePlaces filters correctly', () => {
    const places: any[] = [
      { id: '1', latitude: 10, longitude: 10, isVisible: true },
      { id: '2', latitude: 20, longitude: 20, isVisible: true }, // Outside
      { id: '3', latitude: 10, longitude: 10, isVisible: false }, // Hidden
    ];
    const bounds = L.latLngBounds([5, 5], [15, 15]);

    const visible = getVisiblePlaces(places, bounds);
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe('1');
  });

  test('renderPlace calls renderIcon and renderText', async () => {
    const place: any = {
      title: 'Test Place',
      showIcon: true,
      iconConfig: { style: 'pin', size: 20, color: 'red' },
      textStyle: { fontSize: 12, color: 'black' }
    };
    const settings: any = {
      placeShowIconsGlobally: true,
      placeTitleSize: 50,
      placeTextStyle: {}
    };

    await renderPlace(mockCtx, place, 100, 100, settings, 10);

    expect(renderIcon).toHaveBeenCalledWith(mockCtx, 'pin', 100, 100, 20, 'red');
    expect(wrapText).toHaveBeenCalled();
    expect(renderTextWithEffects).toHaveBeenCalled();
  });

  test('renderPlacesOnCanvas iterates and projects places', async () => {
    const places: any[] = [
      { id: '1', latitude: 0, longitude: 0, isVisible: true, showIcon: true, title: 'Center' },
    ];
    const bounds = L.latLngBounds([-10, -10], [10, 10]);
    const settings: any = { includePlaces: true, placeShowIconsGlobally: true, placeTitleSize: 50, placeTextStyle: {} };

    await renderPlacesOnCanvas(mockCanvas, places, bounds, 4, settings); // Zoom 4

    expect(mockCanvas.getContext).toHaveBeenCalled();
    expect(renderIcon).toHaveBeenCalled();
  });
});
