import React from 'react';
import { TILE_LAYERS } from '@/constants';

interface MapStyleControlProps {
  tileLayerKey: string;
  setTileLayerKey: (key: string) => void;
  labelDensity: number;
  setLabelDensity: (density: number) => void;
  lineColorStart: string;
  setLineColorStart: (color: string) => void;
  lineColorEnd: string;
  setLineColorEnd: (color: string) => void;
  lineThickness: number;
  setLineThickness: (thickness: number) => void;
}

export const MapStyleControl: React.FC<MapStyleControlProps> = ({
  tileLayerKey,
  setTileLayerKey,
  labelDensity,
  setLabelDensity,
  lineColorStart,
  setLineColorStart,
  lineColorEnd,
  setLineColorEnd,
  lineThickness,
  setLineThickness,
}) => {
  const isLabelControlDisabled = tileLayerKey !== 'esriImagery';

  return (
      <section>
          <h2 className="text-xl font-semibold text-gray-200 mb-3">Map & Line Style</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="tile-layer" className="block text-sm font-medium text-gray-400">Map Style</label>
              <select
                  id="tile-layer"
                  value={tileLayerKey}
                  onChange={(e) => setTileLayerKey(e.target.value)}
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              >
                  {TILE_LAYERS.map(layer => <option key={layer.key} value={layer.key}>{layer.name}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="label-density" className={`block text-sm font-medium ${isLabelControlDisabled ? 'text-gray-500' : 'text-gray-400'}`}>Label Density ({labelDensity < 0 ? 'Off' : labelDensity})</label>
              <input
                  id="label-density"
                  type="range"
                  min="-1"
                  max="3"
                  step="1"
                  value={labelDensity}
                  onChange={(e) => setLabelDensity(parseInt(e.target.value, 10))}
                  disabled={isLabelControlDisabled}
                  className="mt-1 block w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />
              {isLabelControlDisabled && (
                <p className="text-xs text-gray-500 mt-1">
                    Only available for Satellite map style.
                </p>
              )}
            </div>

            <h3 className="text-lg font-semibold text-gray-300 pt-2">Line Style</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="line-color-start" className="block text-sm font-medium text-gray-400">Color Start</label>
                <input
                  type="color"
                  id="line-color-start"
                  value={lineColorStart}
                  onChange={(e) => setLineColorStart(e.target.value)}
                  className="mt-1 block w-full h-10 bg-gray-700 border border-gray-600 rounded-md shadow-sm p-1 cursor-pointer focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
               <div>
                <label htmlFor="line-color-end" className="block text-sm font-medium text-gray-400">Color End</label>
                <input
                  type="color"
                  id="line-color-end"
                  value={lineColorEnd}
                  onChange={(e) => setLineColorEnd(e.target.value)}
                  className="mt-1 block w-full h-10 bg-gray-700 border border-gray-600 rounded-md shadow-sm p-1 cursor-pointer focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label htmlFor="line-thickness" className="block text-sm font-medium text-gray-400">Thickness</label>
                <input
                  type="number"
                  id="line-thickness"
                  min="1"
                  max="20"
                  value={lineThickness}
                  onChange={(e) => setLineThickness(parseInt(e.target.value) || 1)}
                  className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
      </section>
  );
};
