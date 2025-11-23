import React, { useState, useEffect } from 'react';
import type { AspectRatio } from '@/types';
import { ASPECT_RATIOS } from '@/constants';
import { InfoIcon } from '@/components/Icons';

interface ExportConfigControlProps {
  aspectRatio: AspectRatio;
  setAspectRatio: (res: AspectRatio) => void;
  exportBoundsAspectRatio: number | null;
  exportQuality: number;
  setExportQuality: (quality: number) => void;
  outputFormat: 'png' | 'jpeg';
  setOutputFormat: (format: 'png' | 'jpeg') => void;
  jpegQuality: number;
  setJpegQuality: (quality: number) => void;
  derivedExportZoom: number | null;
  viewportMiles: { width: number | null; height: number | null };
  exportDimensions: { width: number | null; height: number | null };
}

export const ExportConfigControl: React.FC<ExportConfigControlProps> = ({
  aspectRatio,
  setAspectRatio,
  exportBoundsAspectRatio,
  exportQuality,
  setExportQuality,
  outputFormat,
  setOutputFormat,
  jpegQuality,
  setJpegQuality,
  derivedExportZoom,
  viewportMiles,
  exportDimensions,
}) => {
  const [aspectRatioKey, setAspectRatioKey] = useState<string>('custom');
  const [customRatioInput, setCustomRatioInput] = useState('');

  // Effect to sync the dropdown FROM the actual calculated ratio
  useEffect(() => {
    if (exportBoundsAspectRatio === null) {
        setAspectRatioKey('custom');
        return;
    }
    const found = ASPECT_RATIOS.find(r => Math.abs((r.width / r.height) - exportBoundsAspectRatio) < 0.01);
    const key = found ? found.key : 'custom';
    setAspectRatioKey(key);
  }, [exportBoundsAspectRatio]);

  // Effect to sync the custom input box FROM the actual calculated ratio
  useEffect(() => {
    if (exportBoundsAspectRatio !== null) {
        setCustomRatioInput(exportBoundsAspectRatio.toFixed(2));
    } else {
        setCustomRatioInput('');
    }
  }, [exportBoundsAspectRatio]);

  // This handler syncs FROM the dropdown TO the app state
  const handleAspectRatioKeyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newKey = e.target.value;
    setAspectRatioKey(newKey); // Update local state for immediate feedback
    if (newKey !== 'custom') {
        const selected = ASPECT_RATIOS.find(r => r.key === newKey);
        if (selected) {
            setAspectRatio({ width: selected.width, height: selected.height });
        }
    }
  };

  // This handler syncs FROM the input box TO the app state
  const handleCustomRatioCommit = () => {
    const numValue = parseFloat(customRatioInput);
    if (isNaN(numValue) || numValue <= 0) {
        // On invalid input, revert to showing the current actual ratio
        if (exportBoundsAspectRatio !== null) {
            setCustomRatioInput(exportBoundsAspectRatio.toFixed(2));
        }
        return;
    }

    const currentTargetRatio = aspectRatio.width / aspectRatio.height;
    // Only fire an update if the new ratio is meaningfully different
    if (Math.abs(currentTargetRatio - numValue) > 0.005) {
        setAspectRatio({ width: numValue, height: 1 });
    }
  };

  // This handler updates the local state of the input box and switches the dropdown to "custom"
  const handleCustomRatioInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomRatioInput(e.target.value);
    if (aspectRatioKey !== 'custom') {
        setAspectRatioKey('custom');
    }
  };

  return (
      <section>
        <h2 className="text-xl font-semibold text-gray-200 mb-3">3. Configure Export</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <label htmlFor="aspect-ratio" className="block text-sm font-medium text-gray-400">Aspect Ratio</label>
              <select
                  id="aspect-ratio"
                  value={aspectRatioKey}
                  onChange={handleAspectRatioKeyChange}
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              >
                  {ASPECT_RATIOS.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
                  <option value="custom">Custom</option>
              </select>
            </div>
             <div className="col-span-1">
                <label htmlFor="aspect-ratio-val" className="block text-sm font-medium text-gray-400">
                    Ratio Value
                </label>
                <input
                    type="number"
                    id="aspect-ratio-val"
                    step="0.01"
                    value={customRatioInput}
                    onChange={handleCustomRatioInputChange}
                    onBlur={handleCustomRatioCommit}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                    placeholder={exportBoundsAspectRatio ? `~ ${exportBoundsAspectRatio.toFixed(2)}` : 'e.g. 1.78'}
                />
            </div>
          </div>

          <div>
            <label htmlFor="output-format" className="block text-sm font-medium text-gray-400">Output Format</label>
            <select
                id="output-format"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as 'png' | 'jpeg')}
                className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            >
                <option value="png">PNG (Lossless)</option>
                <option value="jpeg">JPEG (Lossy)</option>
            </select>
          </div>

          {outputFormat === 'jpeg' && (
            <div>
              <label htmlFor="jpeg-quality" className="block text-sm font-medium text-gray-400">
                JPEG Quality <span className="font-mono text-white">({jpegQuality})</span>
              </label>
              <input
                type="range"
                id="jpeg-quality"
                min="1"
                max="100"
                step="1"
                value={jpegQuality}
                onChange={(e) => setJpegQuality(parseInt(e.target.value, 10))}
                className="mt-1 block w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Lower size</span>
                <span>Higher quality</span>
              </div>
            </div>
          )}

           <div>
            <label htmlFor="export-quality" className="block text-sm font-medium text-gray-400">
              Export Quality <span className="font-mono text-white">({exportQuality})</span>
            </label>
            <input
              type="range"
              id="export-quality"
              min="0"
              max="5"
              step="1"
              value={exportQuality}
              onChange={(e) => setExportQuality(parseInt(e.target.value, 10))}
              className="mt-1 block w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-400 bg-gray-900/50 p-3 rounded-md">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <h4 className="col-span-2 font-semibold text-gray-300 mb-1">Export Info</h4>
                 <span>Zoom Level:</span>
                <span className="font-mono text-orange-400 text-right">{derivedExportZoom ? derivedExportZoom.toFixed(1) : '...'}</span>
                <span>Dimensions (px):</span>
                <span className="font-mono text-white text-right">
                    {exportDimensions.width ? `${exportDimensions.width} x ${exportDimensions.height}` : '...'}
                </span>
                <span>Viewport Width:</span>
                <span className="font-mono text-white text-right">
                    {viewportMiles.width ? `${viewportMiles.width.toFixed(1)} mi` : '...'}
                </span>
                <span>Viewport Height:</span>
                <span className="font-mono text-white text-right">
                    {viewportMiles.height ? `${viewportMiles.height.toFixed(1)} mi` : '...'}
                </span>
            </div>

            <div className="group relative text-center pt-2 mt-2 border-t border-gray-700/50">
                <div className="inline-block">
                    <InfoIcon />
                </div>
                <div className="absolute bottom-full mb-2 w-72 bg-gray-900 text-white text-xs rounded py-2 px-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                    <b>Zoom Level</b> is the map tile level. Higher is more detailed. You can change this by using the mouse wheel on the map.
                    <br />
                    <b>Viewport Width/Height</b> is the real-world distance shown on the map, in miles.
                    <svg className="absolute text-gray-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255"><polygon className="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                </div>
            </div>
        </div>
      </section>
  );
};
