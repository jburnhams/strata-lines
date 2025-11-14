import { jest } from '@jest/globals';
import type { Mock } from 'jest-mock';

type ToBlobCallback = (blob: Blob | null) => void;
type ToBlobFn = (callback: ToBlobCallback, type?: string, quality?: any) => void;

export interface CreateMockCanvasOptions {
  toBlob?: ToBlobFn;
  contextOverrides?: Partial<CanvasRenderingContext2D>;
  elementOverrides?: Partial<HTMLCanvasElement>;
}

export const createMockBlob = (): Blob =>
  new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], {
    type: 'image/png',
  });

export const createMockCanvas = (
  width: number,
  height: number,
  options: CreateMockCanvasOptions = {}
): HTMLCanvasElement => {
  const { toBlob, contextOverrides, elementOverrides } = options;

  const canvas: any = {
    width,
    height,
    style: {},
    ...elementOverrides,
  };

  const context: any = {
    drawImage: jest.fn(),
    clearRect: jest.fn(),
    ...contextOverrides,
  };

  canvas.getContext = jest.fn(() => context);
  context.canvas = canvas;

  canvas.toBlob = toBlob
    ? (callback: ToBlobCallback, type?: string, quality?: any) => toBlob(callback, type, quality)
    : (callback: ToBlobCallback) => callback(createMockBlob());

  canvas.getBoundingClientRect = jest.fn(() => ({
    width: canvas.width,
    height: canvas.height,
    top: 0,
    left: 0,
    right: canvas.width,
    bottom: canvas.height,
  }));

  return canvas as HTMLCanvasElement;
};

export interface InstallCanvasSpiesOptions {
  defaultCanvasSize?: { width: number; height: number };
  canvasFactory?: () => HTMLCanvasElement;
  anchorFactory?: () => HTMLAnchorElement;
  containerFactory?: () => HTMLDivElement;
}

export interface CanvasSpyHandles {
  createElementSpy: ReturnType<typeof jest.spyOn>;
  appendChildSpy: ReturnType<typeof jest.spyOn>;
  removeChildSpy: ReturnType<typeof jest.spyOn>;
  restore: () => void;
}

export const installMockCanvasSpies = (
  options: InstallCanvasSpiesOptions = {}
): CanvasSpyHandles => {
  const { defaultCanvasSize = { width: 100, height: 100 }, canvasFactory, anchorFactory, containerFactory } = options;
  const originalCreateElement = document.createElement.bind(document);

  const createElementSpy = jest
    .spyOn(document, 'createElement')
    .mockImplementation((tagName: string): any => {
      const lower = tagName.toLowerCase();
      if (lower === 'canvas') {
        return canvasFactory ? canvasFactory() : createMockCanvas(defaultCanvasSize.width, defaultCanvasSize.height);
      }
      if (lower === 'a') {
        if (anchorFactory) {
          return anchorFactory();
        }
        return {
          download: '',
          href: '',
          click: jest.fn(),
          style: {},
        } as unknown as HTMLAnchorElement;
      }
      if (lower === 'div') {
        if (containerFactory) {
          return containerFactory();
        }
        return {
          style: {},
          classList: { add: jest.fn(), remove: jest.fn() },
        } as unknown as HTMLDivElement;
      }
      return originalCreateElement(tagName);
    });

  const appendChildSpy = jest
    .spyOn(document.body, 'appendChild')
    .mockImplementation(() => null as unknown as HTMLElement);
  const removeChildSpy = jest
    .spyOn(document.body, 'removeChild')
    .mockImplementation(() => null as unknown as HTMLElement);

  const restore = () => {
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  };

  return { createElementSpy, appendChildSpy, removeChildSpy, restore };
};
