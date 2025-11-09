/**
 * Test which jsdom instance we're using
 */

describe('JSDOM Instance Investigation', () => {
  it('should check if document is from leaflet-node or Jest', async () => {
    console.log('BEFORE leaflet-node import:');
    console.log('typeof document:', typeof document);
    console.log('typeof window:', typeof window);
    console.log('document constructor:', document?.constructor?.name);

    const leafletNode = await import('leaflet-node');

    console.log('\nAFTER leaflet-node import:');
    console.log('typeof document:', typeof document);
    console.log('typeof window:', typeof window);
    console.log('document constructor:', document?.constructor?.name);

    // Check if HTMLImageElement.prototype has the patched src
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    console.log('\nHTMLImageElement.prototype.src descriptor:', {
      hasSetter: !!descriptor?.set,
      hasGetter: !!descriptor?.get,
      configurable: descriptor?.configurable
    });

    // Create an img and check its src descriptor
    const img = document.createElement('img');
    const imgDescriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(img), 'src');
    console.log('img element src descriptor:', {
      hasSetter: !!imgDescriptor?.set,
      hasGetter: !!imgDescriptor?.get
    });

    expect(true).toBe(true);
  });
});
