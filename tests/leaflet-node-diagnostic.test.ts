/**
 * Diagnostic test to understand leaflet-node image loading issues
 */

describe('Leaflet-Node Diagnostic', () => {
  it('should be able to dynamically import undici', async () => {
    const undici = await import('undici');
    expect(undici).toBeDefined();
    expect(undici.ProxyAgent).toBeDefined();
    expect(undici.fetch).toBeDefined();
  });

  it('should check proxy environment variables', () => {
    console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY);
    console.log('HTTP_PROXY:', process.env.HTTP_PROXY);
    expect(process.env.HTTPS_PROXY || process.env.HTTP_PROXY).toBeDefined();
  });

  it('should be able to create a simple HTMLImageElement', async () => {
    const leafletNode = await import('leaflet-node');
    const L = leafletNode.default;

    // Check if the custom Image class is set up
    console.log('global.Image:', global.Image);
    console.log('window.Image:', (global as any).window?.Image);

    expect(global.Image).toBeDefined();
  });

  it('should attempt to load a tile with leaflet-node', async () => {
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

    // Set up event listeners to see what happens
    tileLayer.on('tileloadstart', (e) => {
      console.log('Tile load started:', e);
    });

    tileLayer.on('tileload', (e) => {
      console.log('Tile loaded successfully:', e);
    });

    tileLayer.on('tileerror', (e) => {
      console.error('Tile error:', e);
      console.error('Error details:', (e as any).error);
    });

    tileLayer.on('load', () => {
      console.log('All tiles loaded');
    });

    tileLayer.addTo(map);

    // Wait a bit to see what happens
    await new Promise(resolve => setTimeout(resolve, 5000));

    map.remove();
    document.body.removeChild(container);
  }, 10000);
});
