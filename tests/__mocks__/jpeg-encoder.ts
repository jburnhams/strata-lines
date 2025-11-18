/**
 * Mock for jpeg-encoder package to avoid ESM import.meta issues in Jest
 */

export const WasmColorType = {
  Rgba: 0,
  Rgb: 1,
  Grayscale: 2,
};

export class StreamingJpegEncoder {
  constructor(
    public width: number,
    public height: number,
    public colorType: number,
    public quality: number
  ) {}

  encode_strip(strip: Uint8Array): Uint8Array {
    // Mock implementation - return empty array
    return new Uint8Array(0);
  }

  finish(): Uint8Array {
    // Mock implementation - return minimal JPEG structure
    // JPEG SOI (Start of Image) + EOI (End of Image) markers
    return new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  }
}

export default async function init(_module?: any): Promise<void> {
  // Mock WASM initialization - no-op
  return Promise.resolve();
}

export async function initSync(_module?: any): Promise<void> {
  // Mock WASM initialization - no-op
}
