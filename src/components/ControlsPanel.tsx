import React, { useState } from 'react';
import type { AspectRatio, Track, Notification } from '@/types';
import { FilesControl } from '@/components/controls/FilesControl';
import { MapStyleControl } from '@/components/controls/MapStyleControl';
import { ExportConfigControl } from '@/components/controls/ExportConfigControl';
import { ExportActionControl, type ExportSelection } from '@/components/controls/ExportActionControl';

interface ControlsPanelProps {
  tracks: Track[];
  handleFiles: (files: FileList | null) => void;
  removeTrack: (trackId: string) => void;
  removeAllTracks: () => void;
  toggleTrackVisibility: (trackId: string) => void;
  handleExport: (type: 'combined' | 'base' | 'lines' | 'labels', includedLayers?: ExportSelection) => void;
  handleExportBase: () => void;
  handleExportLines: () => void;
  handleExportLabels: () => void;
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

export const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [exportSelection, setExportSelection] = useState<ExportSelection>({ base: true, lines: true, labels: true });
  
  // Drawers state
  const [isFilesOpen, setIsFilesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleMainExport = () => {
      props.handleExport('combined', exportSelection);
  };

  const notificationStyles = {
    error: "bg-red-900/50 border-red-700 text-red-300",
    info: "bg-blue-900/50 border-blue-700 text-blue-300",
  };

  const NotificationBanner = () => props.notification ? (
    <div className={`${notificationStyles[props.notification.type]} border px-4 py-3 rounded relative mb-4`} role="alert">
      <strong className="font-bold">{props.notification.type === 'error' ? 'Error: ' : 'Info: '}</strong>
      <span className="block sm:inline">{props.notification.message}</span>
      <button onClick={() => props.setNotification(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
        <svg className={`fill-current h-6 w-6 ${props.notification.type === 'error' ? 'text-red-400' : 'text-blue-400'}`} role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
      </button>
    </div>
  ) : null;

  const anyExporting = props.isExporting || props.isExportingBase || props.isExportingLines || props.isExportingLabels || props.isDownloading;
  const hasVisibleTracks = props.tracks.some(t => t.isVisible);
  const isLabelControlDisabled = props.tileLayerKey !== 'esriImagery';

  const AdvancedToggle = () => (
      <div className="pt-4 border-t border-gray-700">
        <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={isAdvancedMode} onChange={() => setIsAdvancedMode(!isAdvancedMode)} />
                <div className={`block w-10 h-6 rounded-full transition-colors ${isAdvancedMode ? 'bg-orange-600' : 'bg-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${isAdvancedMode ? 'translate-x-4' : ''}`}></div>
            </div>
            <div className="ml-3 text-gray-400 font-medium">
                Advanced Mode
            </div>
        </label>
     </div>
  );

  return (
    <>
    {/* Desktop Layout */}
    <div className="hidden md:flex w-96 bg-gray-800 p-6 flex-col space-y-6 overflow-y-auto h-screen border-l border-gray-700 shadow-xl z-30">
      <header>
        <h1 className="text-3xl font-bold text-orange-400">StrataLines</h1>
        <p className="text-gray-400 mt-2">Weave your routes into a personal tapestry. Visualize GPX/TCX/FIT tracks on a satellite map and export high-resolution images.</p>
      </header>
      
      <NotificationBanner />

      <FilesControl
        tracks={props.tracks}
        handleFiles={props.handleFiles}
        removeTrack={props.removeTrack}
        removeAllTracks={props.removeAllTracks}
        toggleTrackVisibility={props.toggleTrackVisibility}
        isLoading={props.isLoading}
        minLengthFilter={props.minLengthFilter}
        setMinLengthFilter={props.setMinLengthFilter}
        onTrackHover={props.onTrackHover}
        handleDownloadAllTracks={props.handleDownloadAllTracks}
        isDownloading={props.isDownloading}
        anyExporting={anyExporting}
        isAdvancedMode={isAdvancedMode}
      />

      {isAdvancedMode && (
        <MapStyleControl
            tileLayerKey={props.tileLayerKey}
            setTileLayerKey={props.setTileLayerKey}
            labelDensity={props.labelDensity}
            setLabelDensity={props.setLabelDensity}
            lineColorStart={props.lineColorStart}
            setLineColorStart={props.setLineColorStart}
            lineColorEnd={props.lineColorEnd}
            setLineColorEnd={props.setLineColorEnd}
            lineThickness={props.lineThickness}
            setLineThickness={props.setLineThickness}
        />
      )}

      {isAdvancedMode && (
        <ExportConfigControl
            aspectRatio={props.aspectRatio}
            setAspectRatio={props.setAspectRatio}
            exportBoundsAspectRatio={props.exportBoundsAspectRatio}
            exportQuality={props.exportQuality}
            setExportQuality={props.setExportQuality}
            outputFormat={props.outputFormat}
            setOutputFormat={props.setOutputFormat}
            jpegQuality={props.jpegQuality}
            setJpegQuality={props.setJpegQuality}
            derivedExportZoom={props.derivedExportZoom}
            viewportMiles={props.viewportMiles}
            exportDimensions={props.exportDimensions}
        />
      )}

      <ExportActionControl
        maxDimension={props.maxDimension}
        setMaxDimension={props.setMaxDimension}
        onExport={handleMainExport}
        anyExporting={anyExporting}
        isExporting={props.isExporting}
        exportSelection={exportSelection}
        setExportSelection={setExportSelection}
        isAdvancedMode={isAdvancedMode}
        hasVisibleTracks={hasVisibleTracks}
        isLabelControlDisabled={isLabelControlDisabled}
      />

      <AdvancedToggle />
    </div>

    {/* Mobile Layout Overlay */}
    <div className="md:hidden absolute inset-0 z-20 pointer-events-none flex flex-col justify-between overflow-hidden">
        {/* Floating Buttons */}
        <div className="pointer-events-auto absolute top-4 left-4 z-30">
             {!isFilesOpen && (
                <button onClick={() => setIsFilesOpen(true)} className="bg-gray-800/90 text-white p-3 rounded-full shadow-lg border border-gray-600 hover:bg-gray-700 transition-colors">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.414.586l4.337 4.337a1 1 0 01.172.668V19a2 2 0 01-2 2z" />
                      </svg>
                </button>
             )}
        </div>
        <div className="pointer-events-auto absolute bottom-4 right-4 z-30">
             {!isSettingsOpen && (
                <button onClick={() => setIsSettingsOpen(true)} className="bg-gray-800/90 text-white p-3 rounded-full shadow-lg border border-gray-600 hover:bg-gray-700 transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                </button>
             )}
        </div>

        {/* Files Drawer */}
        <div className={`pointer-events-auto bg-gray-800 absolute
            transition-transform duration-300 ease-in-out transform z-40 shadow-2xl overflow-y-auto
            top-0 left-0
            w-full landscape:w-80
            max-h-[60vh] landscape:max-h-full landscape:h-full
            rounded-b-xl landscape:rounded-b-none landscape:rounded-r-xl
            border-b landscape:border-b-0 landscape:border-r border-gray-700
            ${isFilesOpen ? 'translate-0' : '-translate-y-full landscape:-translate-y-0 landscape:-translate-x-full'}
        `}>
            <div className="p-4">
                 <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-orange-400">Files & Tracks</h2>
                      <button onClick={() => setIsFilesOpen(false)} className="text-gray-400 hover:text-white p-2">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>
                  <NotificationBanner />
                  <FilesControl
                    tracks={props.tracks}
                    handleFiles={props.handleFiles}
                    removeTrack={props.removeTrack}
                    removeAllTracks={props.removeAllTracks}
                    toggleTrackVisibility={props.toggleTrackVisibility}
                    isLoading={props.isLoading}
                    minLengthFilter={props.minLengthFilter}
                    setMinLengthFilter={props.setMinLengthFilter}
                    onTrackHover={props.onTrackHover}
                    handleDownloadAllTracks={props.handleDownloadAllTracks}
                    isDownloading={props.isDownloading}
                    anyExporting={anyExporting}
                    isAdvancedMode={isAdvancedMode}
                  />
            </div>
        </div>

        {/* Settings Drawer */}
        <div className={`pointer-events-auto bg-gray-800 absolute
            transition-transform duration-300 ease-in-out transform z-40 shadow-2xl overflow-y-auto
            bottom-0 left-0 landscape:bottom-auto landscape:left-auto landscape:top-0 landscape:right-0
            w-full landscape:w-80
            max-h-[80vh] landscape:max-h-full landscape:h-full
            rounded-t-xl landscape:rounded-t-none landscape:rounded-l-xl
            border-t landscape:border-t-0 landscape:border-l border-gray-700
            ${isSettingsOpen ? 'translate-0' : 'translate-y-full landscape:translate-y-0 landscape:translate-x-full'}
        `}>
             <div className="p-4 space-y-6">
                <div className="flex justify-between items-center">
                      <h2 className="text-lg font-bold text-orange-400">Settings & Export</h2>
                      <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white p-2">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                </div>

                {isAdvancedMode && (
                    <MapStyleControl
                        tileLayerKey={props.tileLayerKey}
                        setTileLayerKey={props.setTileLayerKey}
                        labelDensity={props.labelDensity}
                        setLabelDensity={props.setLabelDensity}
                        lineColorStart={props.lineColorStart}
                        setLineColorStart={props.setLineColorStart}
                        lineColorEnd={props.lineColorEnd}
                        setLineColorEnd={props.setLineColorEnd}
                        lineThickness={props.lineThickness}
                        setLineThickness={props.setLineThickness}
                    />
                )}

                {isAdvancedMode && (
                    <ExportConfigControl
                        aspectRatio={props.aspectRatio}
                        setAspectRatio={props.setAspectRatio}
                        exportBoundsAspectRatio={props.exportBoundsAspectRatio}
                        exportQuality={props.exportQuality}
                        setExportQuality={props.setExportQuality}
                        outputFormat={props.outputFormat}
                        setOutputFormat={props.setOutputFormat}
                        jpegQuality={props.jpegQuality}
                        setJpegQuality={props.setJpegQuality}
                        derivedExportZoom={props.derivedExportZoom}
                        viewportMiles={props.viewportMiles}
                        exportDimensions={props.exportDimensions}
                    />
                )}

                <ExportActionControl
                    maxDimension={props.maxDimension}
                    setMaxDimension={props.setMaxDimension}
                    onExport={handleMainExport}
                    anyExporting={anyExporting}
                    isExporting={props.isExporting}
                    exportSelection={exportSelection}
                    setExportSelection={setExportSelection}
                    isAdvancedMode={isAdvancedMode}
                    hasVisibleTracks={hasVisibleTracks}
                    isLabelControlDisabled={isLabelControlDisabled}
                />

                <AdvancedToggle />
             </div>
        </div>

    </div>
    </>
  );
};
