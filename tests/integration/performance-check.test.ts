/**
 * Check where performance object exists in test environment
 */

describe('Performance Object Check', () => {
  it('should check performance availability', async () => {
    await import('leaflet-node');

    console.log('typeof performance:', typeof performance);
    console.log('typeof window.performance:', typeof (window as any).performance);
    console.log('typeof globalThis.performance:', typeof globalThis.performance);
    console.log('typeof global.performance:', typeof (global as any).performance);

    console.log('performance:', performance);
    console.log('performance.markResourceTiming:', (performance as any)?.markResourceTiming);

    expect(true).toBe(true);
  });
});
