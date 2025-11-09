/**
 * Test if the src setter is actually being called
 */

describe('Setter Invocation Test', () => {
  it('should verify src setter is called', async () => {
    await import('leaflet-node');

    const img = document.createElement('img');
    document.body.appendChild(img);

    // Wrap the setter to log when it's called
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      'src'
    );

    console.log('Original descriptor:', {
      hasGet: !!originalDescriptor?.get,
      hasSet: !!originalDescriptor?.set,
      configurable: originalDescriptor?.configurable
    });

    let setterCalled = false;
    let getterCalled = false;

    if (originalDescriptor?.set && originalDescriptor?.get) {
      const originalSetter = originalDescriptor.set;
      const originalGetter = originalDescriptor.get;

      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        enumerable: true,
        get: function() {
          console.log('>>> GETTER CALLED');
          getterCalled = true;
          return originalGetter.call(this);
        },
        set: function(value) {
          console.log('>>> SETTER CALLED with value:', value.substring(0, 50));
          setterCalled = true;
          return originalSetter.call(this, value);
        }
      });
    }

    console.log('Setting img.src...');
    img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    console.log('Getting img.src...');
    const src = img.src;
    console.log('Got src:', src.substring(0, 50));

    console.log('Results:', { setterCalled, getterCalled });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Restore
    if (originalDescriptor) {
      Object.defineProperty(HTMLImageElement.prototype, 'src', originalDescriptor);
    }

    document.body.removeChild(img);

    expect(setterCalled).toBe(true);
  }, 5000);
});
