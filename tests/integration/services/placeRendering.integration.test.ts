import { renderPlacesOnCanvas } from '@/services/placeRenderingService';
import { createCompatibleCanvas } from '@/utils/canvasUtils';
import type { Place, ExportSettings } from '@/types';
import L from 'leaflet';

describe('placeRendering integration', () => {
  it('renders places to canvas without errors', async () => {
    const canvas = createCompatibleCanvas(200, 200);
    const places: Place[] = [
      {
        id: '1',
        latitude: 0,
        longitude: 0,
        title: 'Test Place',
        isVisible: true,
        showIcon: true,
        iconConfig: { style: 'pin', size: 20, color: 'red' },
        source: 'manual',
        createdAt: Date.now()
      }
    ];
    const bounds = L.latLngBounds([-0.1, -0.1], [0.1, 0.1]);
    const settings: ExportSettings = {
      includePlaces: true,
      placeTitleSize: 50,
      placeShowIconsGlobally: true,
      placeTextStyle: {
        fontSize: 12,
        fontFamily: 'Arial',
        fontWeight: 'bold',
        color: 'black',
        strokeColor: 'white',
        strokeWidth: 2
      }
    };

    await renderPlacesOnCanvas(canvas, places, bounds, 10, settings);

    // Verify content (simple check for non-empty)
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const data = ctx.getImageData(0, 0, 200, 200).data;
        const hasContent = data.some(v => v > 0);
        expect(hasContent).toBe(true);
    }
  });
});
