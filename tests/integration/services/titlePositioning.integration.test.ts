import { calculateOptimalPositions } from '@/services/titlePositioningService';
import { Place, ExportSettings } from '@/types';
import L from 'leaflet';

jest.mock('@/utils/canvasUtils', () => ({
  createCompatibleCanvas: (w: number, h: number) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createCanvas } = require('@napi-rs/canvas');
    return createCanvas(w, h);
  }
}));

describe('titlePositioningService Integration', () => {
  const map = L.map(document.createElement('div'), {
    center: [0, 0],
    zoom: 10
  });

  const settings: ExportSettings = {
    includePlaces: true,
    placeTitleSize: 50,
    placeShowIconsGlobally: true,
    placeTextStyle: {
      fontSize: 12,
      fontFamily: 'Noto Sans',
      fontWeight: 'bold',
      color: '#000000'
    }
  };

  test('calculates positions with real canvas measurement', () => {
    const places: Place[] = [
      {
        id: 'p1',
        latitude: 0,
        longitude: 0,
        title: 'Wide Title Here',
        createdAt: 0,
        source: 'manual',
        isVisible: true,
        showIcon: true,
        iconStyle: 'pin',
        textStyle: { fontSize: 12 } as any
      }
    ];

    const result = calculateOptimalPositions(places, map, settings);
    expect(result.size).toBe(1);
    expect(result.get('p1')).toBe('right');
  });

  test('resolves overlap using text dimensions', () => {
     const places: Place[] = [
      {
        id: 'p1',
        latitude: 0,
        longitude: 0,
        title: 'First Place',
        createdAt: 0,
        source: 'manual',
        isVisible: true,
        showIcon: true,
        iconStyle: 'pin',
        textStyle: { fontSize: 12 } as any
      },
      {
        id: 'p2',
        latitude: 0,
        longitude: 0.005,
        title: 'Second Place',
        createdAt: 0,
        source: 'manual',
        isVisible: true,
        showIcon: true,
        iconStyle: 'pin',
        textStyle: { fontSize: 12 } as any
      }
    ];

    const result = calculateOptimalPositions(places, map, settings);
    const p1 = result.get('p1');
    const p2 = result.get('p2');

    // They should choose different sides to avoid overlap
    expect(p1).not.toBe(p2);
  });
});
