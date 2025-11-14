
import React, { useRef, useState, useEffect } from 'react';
import type { AspectRatio, Track } from '@/types';
import { ASPECT_RATIOS, TILE_LAYERS } from '@/constants';

type Notification = {
  type: 'error' | 'info';
  message: string;
};

interface ControlsPanelProps {
  tracks: Track[];
  handleFiles: (files: FileList | null) => void;
  removeTrack: (trackId: string) => void;
  removeAllTracks: () => void;
  toggleTrackVisibility: (trackId: string) => void;
  handleExport: () => void;
  handleExportBase: () => void;
  handleExportLines: () => void;
  handleExportLabels: () => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (res: AspectRatio) => void;
  exportBoundsAspectRatio: number | null;
  exportQuality: number;
  setExportQuality: (quality: number) => void;
  derivedExportZoom: number | null;
  isLoading: boolean;
  isExporting: boolean;
  isExportingBase: boolean;
  isExportingLines: boolean;
  isExportingLabels: boolean;
  notification: Notification | null;
  setNotification: (notification: Notification | null) => void;
  lineColorStart: string;
  setLineColorStart: (color: string) => void;
  lineColorEnd: string;
  setLineColorEnd: (color: string) => void;
  lineThickness: number;
  setLineThickness: (thickness: number) => void;
  viewportMiles: { width: number | null; height: number | null };
  exportDimensions: { width: number | null; height: number | null };
  minLengthFilter: number;
  setMinLengthFilter: (length: number) => void;
  tileLayerKey: string;
  setTileLayerKey: (key: string) => void;
  labelDensity: number;
  setLabelDensity: (density: number) => void;
  onTrackHover: (trackId: string | null) => void;
  handleDownloadAllTracks: () => void;
  isDownloading: boolean;
  maxDimension: number;
  setMaxDimension: (dimension: number) => void;
}

const InfoIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block text-gray-400" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
);

const EyeIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.022 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
);

const EyeOffIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.303 6.546A10.048 10.048 0 01.458 10c1.274 4.057 5.022 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
    </svg>
);

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  tracks,
  handleFiles,
  removeTrack,
  removeAllTracks,
  toggleTrackVisibility,
  handleExport,
  handleExportBase,
  handleExportLines,
  handleExportLabels,
  aspectRatio,
  setAspectRatio,
  exportBoundsAspectRatio,
  exportQuality,
  setExportQuality,
  derivedExportZoom,
  isLoading,
  isExporting,
  isExportingBase,
  isExportingLines,
  isExportingLabels,
  notification,
  setNotification,
  lineColorStart,
  setLineColorStart,
  lineColorEnd,
  setLineColorEnd,
  lineThickness,
  setLineThickness,
  viewportMiles,
  exportDimensions,
  minLengthFilter,
  setMinLengthFilter,
  tileLayerKey,
  setTileLayerKey,
  labelDensity,
  setLabelDensity,
  onTrackHover,
  handleDownloadAllTracks,
  isDownloading,
  maxDimension,
  setMaxDimension,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aspectRatioKey, setAspectRatioKey] = useState<string>('custom');
  const [customRatioInput, setCustomRatioInput] = useState('');

  const isLabelControlDisabled = tileLayerKey !== 'esriImagery';

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

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };
  
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

  const notificationStyles = {
    error: "bg-red-900/50 border-red-700 text-red-300",
    info: "bg-blue-900/50 border-blue-700 text-blue-300",
  };

  const anyExporting = isExporting || isExportingBase || isExportingLines || isExportingLabels || isDownloading;

  return (
    <div className="w-full md:w-96 bg-gray-800 p-6 flex flex-col space-y-6 overflow-y-auto h-[50vh] md:h-screen">
      <header>
        <h1 className="text-3xl font-bold text-orange-400">StrataLines</h1>
        <p className="text-gray-400 mt-2">Weave your routes into a personal tapestry. Visualize GPX/TCX/FIT tracks on a satellite map and export high-resolution images.</p>
      </header>
      
      {notification && (
        <div className={`${notificationStyles[notification.type]} border px-4 py-3 rounded relative`} role="alert">
          <strong className="font-bold">{notification.type === 'error' ? 'Error: ' : 'Info: '}</strong>
          <span className="block sm:inline">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
            <svg className={`fill-current h-6 w-6 ${notification.type === 'error' ? 'text-red-400' : 'text-blue-400'}`} role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </button>
        </div>
      )}

      <section>
        <h2 className="text-xl font-semibold text-gray-200 mb-3">1. Manage GPX / TCX / FIT Files</h2>
        <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleFileClick}
              disabled={isLoading}
              className="col-span-2 w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition-colors duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : 'Add Files'}
            </button>
             <div className="col-span-1">
                <label htmlFor="min-length" className="block text-sm font-medium text-gray-400 text-center">Min Len (km)</label>
                <input
                    type="number"
                    id="min-length"
                    min="0"
                    value={minLengthFilter}
                    onChange={(e) => setMinLengthFilter(parseInt(e.target.value, 10) || 0)}
                    className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm text-center"
                />
            </div>
        </div>
        <input
          type="file"
          accept=".gpx,.tcx,.fit,.gz"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          ref={fileInputRef}
        />

        
        {tracks.length > 0 && (
            <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Loaded Tracks ({tracks.length})</h3>
                <div className="bg-gray-900/50 rounded-md p-2 max-h-48 overflow-y-auto border border-gray-700">
                    <ul className="divide-y divide-gray-700">
                        {tracks.map((track) => (
                            <li 
                              key={track.id} 
                              className="flex items-center text-sm text-gray-300 py-2 transition-colors duration-150 hover:bg-gray-700/50"
                              onMouseEnter={() => onTrackHover(track.id)}
                              onMouseLeave={() => onTrackHover(null)}
                            >
                                <span className="flex-1 truncate pr-2 cursor-default" title={track.name}>{track.name}</span>
                                <span className="text-gray-400 font-mono text-right flex-shrink-0 pr-3">{track.length.toFixed(1)} km</span>
                                <button 
                                    onClick={() => toggleTrackVisibility(track.id)} 
                                    className={`p-1 rounded-full ${track.isVisible ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-600 hover:text-gray-400 hover:bg-gray-600'}`} 
                                    title={track.isVisible ? 'Hide track' : 'Show track'}
                                >
                                    {track.isVisible ? <EyeIcon /> : <EyeOffIcon />}
                                </button>
                                <button onClick={() => removeTrack(track.id)} className="text-red-500 hover:text-red-400 font-bold text-xl leading-none flex-shrink-0 w-8 text-center" title="Remove track">
                                    &times;
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                    <button 
                        onClick={handleDownloadAllTracks} 
                        className="w-full text-center text-sm text-blue-400 hover:text-blue-300 font-semibold py-2 px-3 rounded hover:bg-blue-500/10 flex items-center justify-center disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors" 
                        disabled={isDownloading || anyExporting}
                    >
                        {isDownloading ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span>Zipping...</span>
                            </>
                        ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              Download All
                            </>
                        )}
                    </button>
                    <button 
                        onClick={removeAllTracks} 
                        className="w-full text-center text-sm text-red-500 hover:text-red-400 font-semibold py-2 px-3 rounded hover:bg-red-500/10 disabled:text-gray-500 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors"
                        disabled={isDownloading || anyExporting}
                    >
                        Remove All
                    </button>
                </div>
            </div>
        )}
      </section>

      <section>
          <h2 className="text-xl font-semibold text-gray-200 mb-3">2. Map & Line Style</h2>
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

      <section className="flex-grow flex flex-col justify-end space-y-4">
        <div>
          <label htmlFor="max-dimension" className="block text-sm font-medium text-gray-400 mb-2">
            Max Subdivision Px
          </label>
          <input
            type="number"
            id="max-dimension"
            min="100"
            max="10000"
            step="100"
            value={maxDimension}
            onChange={(e) => setMaxDimension(parseInt(e.target.value, 10) || 4000)}
            className="mb-3 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            placeholder="4000"
          />
          <button
            onClick={handleExport}
            disabled={anyExporting || tracks.filter(t => t.isVisible).length === 0}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded transition-colors duration-200 flex items-center justify-center"
          >
            {isExporting ? (
               <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Exporting...
              </>
            ) : '4. Export PNG (Merged)'}
          </button>
          <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                onClick={handleExportBase}
                disabled={anyExporting}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded transition-colors duration-200 flex items-center justify-center text-sm"
              >
                {isExportingBase ? (
                   <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>...</span>
                  </>
                ) : 'Base'}
              </button>
              <button
                onClick={handleExportLines}
                disabled={anyExporting || tracks.filter(t => t.isVisible).length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded transition-colors duration-200 flex items-center justify-center text-sm"
              >
                {isExportingLines ? (
                   <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>...</span>
                  </>
                ) : 'Lines'}
              </button>
              <button
                onClick={handleExportLabels}
                disabled={anyExporting || isLabelControlDisabled}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-3 rounded transition-colors duration-200 flex items-center justify-center text-sm"
              >
                {isExportingLabels ? (
                   <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>...</span>
                  </>
                ) : 'Labels'}
              </button>
          </div>
        </div>
      </section>
    </div>
  );
};
