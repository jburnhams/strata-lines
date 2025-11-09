/**
 * Test if dispatchEvent works with addEventListener on img elements
 */

describe('dispatchEvent Investigation', () => {
  it('should test if manually dispatched events reach addEventListener listeners', async () => {
    await import('leaflet-node'); // Load leaflet-node first

    const img = document.createElement('img');
    document.body.appendChild(img);

    let eventFired = false;

    img.addEventListener('load', (e) => {
      console.log('addEventListener fired!', e);
      eventFired = true;
    });

    console.log('Dispatching custom load event...');
    const loadEvent = new Event('load');
    const result = img.dispatchEvent(loadEvent);
    console.log('dispatchEvent returned:', result);
    console.log('eventFired:', eventFired);

    document.body.removeChild(img);

    expect(eventFired).toBe(true);
  });

  it('should test if onload property works', async () => {
    await import('leaflet-node');

    const img = document.createElement('img');
    document.body.appendChild(img);

    let onloadFired = false;

    img.onload = (e) => {
      console.log('onload fired!', e);
      onloadFired = true;
    };

    console.log('Dispatching custom load event via onload...');
    const loadEvent = new Event('load');
    img.dispatchEvent(loadEvent);
    console.log('onloadFired:', onloadFired);

    document.body.removeChild(img);

    expect(onloadFired).toBe(true);
  });

  it('should compare Image class vs createElement img', async () => {
    const leafletNode = await import('leaflet-node');

    // Test 1: Image class (leaflet-node's custom class)
    console.log('=== Testing Image class ===');
    const img1 = new Image();
    let img1EventFired = false;
    let img1OnloadFired = false;

    img1.addEventListener('load', () => {
      console.log('Image class: addEventListener fired');
      img1EventFired = true;
    });
    img1.onload = () => {
      console.log('Image class: onload fired');
      img1OnloadFired = true;
    };

    // Test 2: document.createElement (jsdom's HTMLImageElement)
    console.log('=== Testing document.createElement ===');
    const img2 = document.createElement('img');
    document.body.appendChild(img2);
    let img2EventFired = false;
    let img2OnloadFired = false;

    img2.addEventListener('load', () => {
      console.log('createElement: addEventListener fired');
      img2EventFired = true;
    });
    img2.onload = () => {
      console.log('createElement: onload fired');
      img2OnloadFired = true;
    };

    // Dispatch events
    console.log('Dispatching events...');
    const loadEvent1 = new Event('load');
    const loadEvent2 = new Event('load');
    img1.dispatchEvent(loadEvent1);
    img2.dispatchEvent(loadEvent2);

    console.log('Image class results:', { img1EventFired, img1OnloadFired });
    console.log('createElement results:', { img2EventFired, img2OnloadFired });

    document.body.removeChild(img2);

    expect(img2EventFired).toBe(true);
  });
});
