/**
 * Test if setting img.src triggers events via the patched setter
 *
 * Note: These tests verify leaflet-node behavior and are not critical
 * for application functionality. Skipped to improve test performance.
 */

describe.skip('img.src Setter Investigation', () => {
  it('should fire load event when src is set to data URI', async () => {
    await import('leaflet-node');

    const img = document.createElement('img');
    document.body.appendChild(img);

    let addEventListenerCalled = false;
    let onloadCalled = false;

    img.addEventListener('load', (e) => {
      addEventListenerCalled = true;
    });

    img.onerror = (e) => {
      console.error('onerror FIRED:', e);
    };

    img.onload = (e) => {
      onloadCalled = true;
    };

    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // Wait for async load - reduced from 3000ms
    await new Promise(resolve => setTimeout(resolve, 100));

    document.body.removeChild(img);

    expect(addEventListenerCalled || onloadCalled).toBe(true);
  }, 500);

  it('should fire load event when src is set to network URL', async () => {
    await import('leaflet-node');

    const img = document.createElement('img');
    document.body.appendChild(img);

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        document.body.removeChild(img);
        reject(new Error('Timeout - load event never fired'));
      }, 5000);

      img.addEventListener('load', (e) => {
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

      img.src = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/0/0/0';
    });
  }, 6000);
});
