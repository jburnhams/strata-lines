/**
 * Test if setting img.src triggers events via the patched setter
 */

describe('img.src Setter Investigation', () => {
  it('should fire load event when src is set to data URI', async () => {
    await import('leaflet-node');

    const img = document.createElement('img');
    document.body.appendChild(img);

    let addEventListenerCalled = false;
    let onloadCalled = false;

    console.log('Attaching listeners...');
    img.addEventListener('load', (e) => {
      console.log('addEventListener("load") FIRED!', { width: img.width, height: img.height });
      addEventListenerCalled = true;
    });

    img.onerror = (e) => {
      console.error('onerror FIRED:', e);
    };

    img.onload = (e) => {
      console.log('img.onload FIRED!', { width: img.width, height: img.height });
      onloadCalled = true;
    };

    console.log('Setting img.src to data URI...');
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    console.log('img.src set, waiting...');

    // Wait for async load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Results:', { addEventListenerCalled, onloadCalled, width: img.width, height: img.height });

    document.body.removeChild(img);

    expect(addEventListenerCalled || onloadCalled).toBe(true);
  }, 5000);

  it('should fire load event when src is set to network URL', async () => {
    await import('leaflet-node');

    const img = document.createElement('img');
    document.body.appendChild(img);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('TIMEOUT - no event fired');
        console.log('Image state:', { width: img.width, height: img.height, src: img.src.substring(0, 80) });
        document.body.removeChild(img);
        reject(new Error('Timeout - load event never fired'));
      }, 8000);

      img.addEventListener('load', (e) => {
        console.log('addEventListener("load") FIRED for network image!', { width: img.width, height: img.height });
        clearTimeout(timeout);
        document.body.removeChild(img);
        resolve();
      });

      img.onerror = (e: any) => {
        console.error('onerror FIRED:', e.error?.message || e);
        clearTimeout(timeout);
        document.body.removeChild(img);
        reject(e);
      };

      console.log('Setting img.src to network URL...');
      img.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/0/0/0';
    });
  }, 10000);
});
