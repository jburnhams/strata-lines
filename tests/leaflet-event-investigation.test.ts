/**
 * Test to understand how Leaflet attaches listeners and why events don't fire
 */

describe('Leaflet Event Listener Investigation', () => {
  it('should show how Leaflet attaches tile listeners', async () => {
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
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );

    // Intercept document.createElement to see when img elements are created
    const originalCreateElement = document.createElement;
    const createdImages: HTMLImageElement[] = [];

    (document as any).createElement = function(tagName: string, options?: any) {
      const element = originalCreateElement.call(this, tagName, options);
      if (tagName.toLowerCase() === 'img') {
        console.log('IMG CREATED via document.createElement');
        createdImages.push(element as HTMLImageElement);

        // Check what listeners are attached
        setTimeout(() => {
          const img = element as HTMLImageElement;
          console.log('IMG properties:', {
            hasOnload: typeof img.onload === 'function',
            hasOnerror: typeof img.onerror === 'function',
            src: img.src?.substring(0, 50)
          });
        }, 10);
      }
      return element;
    };

    tileLayer.addTo(map);

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`Total images created: ${createdImages.length}`);

    // Restore
    (document as any).createElement = originalCreateElement;
    map.remove();
    document.body.removeChild(container);
  }, 5000);

  it('should test if dispatchEvent works on created img elements', async () => {
    const leafletNode = await import('leaflet-node');

    // Create an img via document.createElement (like Leaflet does)
    const img = document.createElement('img');
    document.body.appendChild(img);

    let loadCalled = false;
    let addEventListenerCalled = false;

    // Test both methods Leaflet might use
    img.onload = () => {
      console.log('img.onload() called');
      loadCalled = true;
    };

    img.addEventListener('load', () => {
      console.log('addEventListener("load") called');
      addEventListenerCalled = true;
    });

    // Set src to data URI
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Results:', { loadCalled, addEventListenerCalled });

    document.body.removeChild(img);

    expect(loadCalled || addEventListenerCalled).toBe(true);
  }, 5000);
});
