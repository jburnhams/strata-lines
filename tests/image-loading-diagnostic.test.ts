/**
 * Diagnostic to test leaflet-node image loading directly
 */

describe('Image Loading Diagnostic', () => {
  it('should load an image using leaflet-node Image class', async () => {
    const leafletNode = await import('leaflet-node');
    const L = leafletNode.default;

    // Create a test image element
    const img = new Image();

    console.log('Image class:', img.constructor.name);
    console.log('Has custom src setter:', Object.getOwnPropertyDescriptor(Object.getPrototypeOf(img), 'src'));

    const loadPromise = new Promise((resolve, reject) => {
      img.onload = () => {
        console.log('Image loaded successfully!', { width: img.width, height: img.height });
        resolve(true);
      };
      img.onerror = (err) => {
        console.error('Image error:', err);
        reject(err);
      };
    });

    // Set a real tile URL
    console.log('Setting image src to tile URL...');
    img.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/10/340/511';

    // Wait for load or timeout
    const result = await Promise.race([
      loadPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout waiting for image')), 8000)
      )
    ]);

    expect(result).toBe(true);
  }, 10000);

  it('should check HTMLImageElement prototype', async () => {
    const leafletNode = await import('leaflet-node');
    const L = leafletNode.default;

    // Create a container and check if jsdom's HTMLImageElement is patched
    const container = document.createElement('div');
    document.body.appendChild(container);

    const img = document.createElement('img');
    container.appendChild(img);

    console.log('HTMLImageElement:', img.constructor.name);
    console.log('Prototype chain:', Object.getPrototypeOf(img).constructor.name);

    const srcDescriptor = Object.getOwnPropertyDescriptor(
      Object.getPrototypeOf(Object.getPrototypeOf(img)),
      'src'
    );
    console.log('src descriptor on HTMLImageElement.prototype:', srcDescriptor);

    document.body.removeChild(container);
  });
});
