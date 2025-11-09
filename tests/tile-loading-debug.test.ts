/**
 * Test to debug why tiles aren't loading in leaflet-node
 */

describe('Tile Loading Debug', () => {
  it('should show what happens when tiles are added to a map', async () => {
    const leafletNode = await import('leaflet-node');
    const L = leafletNode.default;

    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);

    const map = L.map(container, {
      preferCanvas: true,
      attributionControl: false,
      zoomControl: false,
    });

    map.setView([51.5, -0.1], 10, { animate: false });

    const tileLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: '' }
    );

    let tileLoadStartCount = 0;
    let tileLoadCount = 0;
    let tileErrorCount = 0;

    tileLayer.on('tileloadstart', (e: any) => {
      tileLoadStartCount++;
      console.log(`Tile load START (${tileLoadStartCount}):`, {
        coords: e.coords,
        url: e.tile?.src?.substring(0, 80)
      });
    });

    tileLayer.on('tileload', (e: any) => {
      tileLoadCount++;
      console.log(`Tile LOADED (${tileLoadCount}):`, {
        coords: e.coords,
        width: e.tile?.width,
        height: e.tile?.height
      });
    });

    tileLayer.on('tileerror', (e: any) => {
      tileErrorCount++;
      console.error(`Tile ERROR (${tileErrorCount}):`, {
        coords: e.coords,
        error: e.error?.message || e.error
      });
    });

    tileLayer.on('load', () => {
      console.log('ALL TILES LOADED!', {
        started: tileLoadStartCount,
        loaded: tileLoadCount,
        errors: tileErrorCount
      });
    });

    tileLayer.addTo(map);

    // Wait to see what happens
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('Final counts:', {
      started: tileLoadStartCount,
      loaded: tileLoadCount,
      errors: tileErrorCount,
      isLoading: tileLayer.isLoading()
    });

    map.remove();
    document.body.removeChild(container);

    expect(tileLoadStartCount).toBeGreaterThan(0);
  }, 15000);
});
