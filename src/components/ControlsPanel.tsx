import React, { useState, useRef } from 'react';
import type { AspectRatio, Track, Notification, TrackPlaceType } from '@/types';
import { FilesControl } from '@/components/controls/FilesControl';
import { MapStyleControl } from '@/components/controls/MapStyleControl';
import { ExportConfigControl } from '@/components/controls/ExportConfigControl';
import { ExportActionControl, type ExportSelection } from '@/components/controls/ExportActionControl';
import { useIsMobile, useIsLandscape } from '@/hooks/useMediaQuery';
import { MenuIcon, XIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/Icons';
import { PlacesSection } from '@/components/places/PlacesSection';
import { PlaceSettingsPanel } from '@/components/places/PlaceSettingsPanel';
import type { Place } from '@/types';
import { GeocodingResult } from '@/services/geocoding/GeocodingProvider';

interface ControlsPanelProps {
  tracks: Track[];
  places: Place[];
  onAddPlaceClick: (result?: GeocodingResult) => void;
  updatePlace: (id: string, updates: Partial<Place>) => void;
  deletePlace: (id: string) => void;
  togglePlaceVisibility: (id: string) => void;
  toggleAllPlacesVisibility: (visible: boolean) => void;
  placeTitleSize: number;
  setPlaceTitleSize: (size: number) => void;
  showIconsGlobally: boolean;
  setShowIconsGlobally: (show: boolean) => void;
  onZoomToPlace: (place: Place) => void;

  handleFiles: (files: FileList | null) => void;
  removeTrack: (trackId: string) => void;
  removeAllTracks: () => void;
  toggleTrackVisibility: (trackId: string) => void;
  handleExport: (type: 'combined' | 'base' | 'lines' | 'labels' | 'places', includedLayers?: ExportSelection) => void;
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
  activityCounts: Record<string, number>;
  hiddenActivityTypes: Set<string>;
  toggleActivityFilter: (type: string) => void;

  createTrackPlace: (id: string, type: TrackPlaceType, useLocality: boolean) => Promise<any>;
  removeTrackPlace: (id: string, type: TrackPlaceType) => Promise<void>;
  createAllTrackPlaces: (id: string, useLocality: boolean) => Promise<any>;
  removeAllTrackPlaces: (id: string) => Promise<void>;

  autoCreatePlaces: boolean;
  setAutoCreatePlaces: (val: boolean) => void;
  defaultUseLocalityName: boolean;
  setDefaultUseLocalityName: (val: boolean) => void;

  // New props for Global Text Style
  placeTextStyle: import('@/types').PlaceTextStyle;
  setPlaceTextStyle: (style: import('@/types').PlaceTextStyle) => void;
}

// Common Subcomponents
const NotificationBanner = ({ notification, setNotification }: { notification: Notification | null, setNotification: (n: Notification | null) => void }) => {
    if (!notification) return null;
    const notificationStyles = {
        error: "bg-red-900/50 border-red-700 text-red-300",
        info: "bg-blue-900/50 border-blue-700 text-blue-300",
    };
    return (
        <div className={`${notificationStyles[notification.type]} border px-4 py-3 rounded relative mb-4`} role="alert">
            <strong className="font-bold">{notification.type === 'error' ? 'Error: ' : 'Info: '}</strong>
            <span className="block sm:inline">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                <XIcon className={`h-6 w-6 ${notification.type === 'error' ? 'text-red-400' : 'text-blue-400'}`} />
            </button>
        </div>
    );
};

const AdvancedToggle = ({ isAdvancedMode, setIsAdvancedMode }: { isAdvancedMode: boolean, setIsAdvancedMode: (v: boolean) => void }) => (
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

// Layout Props including the hoisted trigger
interface LayoutProps extends ControlsPanelProps {
    onAddFileClick: () => void;
}

const DesktopLayout: React.FC<LayoutProps> = (props) => {
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);
    const [exportSelection, setExportSelection] = useState<ExportSelection>({ base: true, lines: true, labels: true, places: true });

    const handleMainExport = () => {
        props.handleExport('combined', exportSelection);
    };

    const anyExporting = props.isExporting || props.isExportingBase || props.isExportingLines || props.isExportingLabels || props.isDownloading;
    const hasVisibleTracks = props.tracks.some(t => t.isVisible);
    const isLabelControlDisabled = props.tileLayerKey !== 'esriImagery';

    return (
        <div className="hidden md:flex w-96 bg-gray-800 p-6 flex-col space-y-6 overflow-y-auto h-[100dvh] border-l border-gray-700 shadow-xl z-30">
            <header>
                <h1 className="text-3xl font-bold text-orange-400">StrataLines</h1>
                <p className="text-gray-400 mt-2">Weave your routes into a personal tapestry. Visualize GPX/TCX/FIT tracks on a satellite map and export high-resolution images.</p>
            </header>

            <NotificationBanner notification={props.notification} setNotification={props.setNotification} />

            <FilesControl
                tracks={props.tracks}
                onAddFileClick={props.onAddFileClick}
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
                activityCounts={props.activityCounts}
                hiddenActivityTypes={props.hiddenActivityTypes}
                toggleActivityFilter={props.toggleActivityFilter}
                createTrackPlace={props.createTrackPlace}
                removeTrackPlace={props.removeTrackPlace}
                createAllTrackPlaces={props.createAllTrackPlaces}
                removeAllTrackPlaces={props.removeAllTrackPlaces}
            />

            <PlacesSection
                places={props.places}
                onAddPlaceClick={props.onAddPlaceClick}
                updatePlace={props.updatePlace}
                deletePlace={props.deletePlace}
                togglePlaceVisibility={props.togglePlaceVisibility}
                toggleAllPlacesVisibility={props.toggleAllPlacesVisibility}
                onZoomToPlace={props.onZoomToPlace}
            />

            {isAdvancedMode && (
                <PlaceSettingsPanel
                    titleSize={props.placeTitleSize}
                    onTitleSizeChange={props.setPlaceTitleSize}
                    showIconsGlobally={props.showIconsGlobally}
                    onToggleIconsGlobally={props.setShowIconsGlobally}
                    autoCreatePlaces={props.autoCreatePlaces}
                    onToggleAutoCreatePlaces={props.setAutoCreatePlaces}
                    defaultUseLocalityName={props.defaultUseLocalityName}
                    onToggleDefaultUseLocalityName={props.setDefaultUseLocalityName}
                    textStyle={props.placeTextStyle}
                    onTextStyleChange={props.setPlaceTextStyle}
                />
            )}

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

            <AdvancedToggle isAdvancedMode={isAdvancedMode} setIsAdvancedMode={setIsAdvancedMode} />
        </div>
    );
};


const MobileLayout: React.FC<LayoutProps> = (props) => {
    const isLandscape = useIsLandscape();
    const [activeDrawer, setActiveDrawer] = useState<'files' | 'settings' | null>(null);
    const [isAdvancedMode, setIsAdvancedMode] = useState(false);
    const [exportSelection, setExportSelection] = useState<ExportSelection>({ base: true, lines: true, labels: true, places: true });

    const handleMainExport = () => {
        props.handleExport('combined', exportSelection);
    };

    const toggleDrawer = (drawer: 'files' | 'settings') => {
        setActiveDrawer(activeDrawer === drawer ? null : drawer);
    };

    const anyExporting = props.isExporting || props.isExportingBase || props.isExportingLines || props.isExportingLabels || props.isDownloading;
    const hasVisibleTracks = props.tracks.some(t => t.isVisible);
    const isLabelControlDisabled = props.tileLayerKey !== 'esriImagery';

    // Collapsed Button Bars
    const FilesBar = () => (
        <div className={`pointer-events-auto bg-gray-800/90 border-gray-700 shadow-lg p-2 flex items-center gap-2
            ${isLandscape ? 'flex-col border-r h-full w-16 py-4' : 'flex-row border-b w-full h-16 px-4 justify-between'}
        `}>
            {/* Toggle Button */}
            <button
                onClick={() => toggleDrawer('files')}
                className="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600 transition-colors"
                aria-label="Open Files Drawer"
            >
                {isLandscape ? <MenuIcon /> : <MenuIcon />}
            </button>

            {/* Main Action Button (Add Files) */}
            <button
                 onClick={props.onAddFileClick}
                 className={`flex items-center justify-center bg-orange-600 hover:bg-orange-700 text-white font-bold rounded transition-colors
                    ${isLandscape ? 'w-10 h-10 p-0' : 'px-4 py-2'}
                 `}
                 title="Add Files"
            >
                {isLandscape ? <PlusIcon /> : <span className="text-sm">Add Files</span>}
            </button>
        </div>
    );

    const SettingsBar = () => (
         <div className={`pointer-events-auto bg-gray-800/90 border-gray-700 shadow-lg p-2 flex items-center gap-2
            ${isLandscape ? 'flex-col border-l h-full w-16 py-4' : 'flex-row border-t w-full h-16 px-4 justify-between'}
        `}>
             {/* Main Action Button (Export) */}
             <button
                 onClick={handleMainExport}
                 disabled={anyExporting}
                 className={`flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold rounded transition-colors
                    ${isLandscape ? 'w-10 h-10 p-0' : 'px-4 py-2 order-last'}
                 `}
                 title="Export"
            >
               {isLandscape ? (
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
               ) : <span className="text-sm">Export</span>}
            </button>

            {/* Toggle Button */}
            <button
                onClick={() => toggleDrawer('settings')}
                className="p-2 bg-gray-700 rounded-full text-white hover:bg-gray-600 transition-colors"
                aria-label="Open Settings Drawer"
            >
                {isLandscape ? <MenuIcon /> : <MenuIcon />}
            </button>
        </div>
    );

    // Full Screen Drawer Overlay
    const DrawerOverlay = ({ type, children }: { type: 'files' | 'settings', children: React.ReactNode }) => (
        <div className="absolute inset-0 z-50 bg-gray-900 flex flex-col pointer-events-auto overflow-hidden animate-fade-in">
             <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-800">
                <h2 className="text-lg font-bold text-orange-400">
                    {type === 'files' ? 'Files & Tracks' : 'Settings & Export'}
                </h2>
                <button
                    onClick={() => setActiveDrawer(null)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full"
                    aria-label="Close Drawer"
                >
                    <XIcon />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <NotificationBanner notification={props.notification} setNotification={props.setNotification} />
                {children}
            </div>
        </div>
    );

    return (
        <div className={`absolute inset-0 z-[2000] pointer-events-none flex ${isLandscape ? 'flex-row' : 'flex-col'} justify-between overflow-hidden`}>

            {/* Conditional Rendering: If drawer is active, show overlay. Else show bars. */}
            {activeDrawer ? (
                <DrawerOverlay type={activeDrawer}>
                    {activeDrawer === 'files' ? (
                         <>
                             <FilesControl
                                tracks={props.tracks}
                                onAddFileClick={props.onAddFileClick}
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
                                activityCounts={props.activityCounts}
                                hiddenActivityTypes={props.hiddenActivityTypes}
                                toggleActivityFilter={props.toggleActivityFilter}
                                createTrackPlace={props.createTrackPlace}
                                removeTrackPlace={props.removeTrackPlace}
                                createAllTrackPlaces={props.createAllTrackPlaces}
                                removeAllTrackPlaces={props.removeAllTrackPlaces}
                            />
                            <PlacesSection
                                places={props.places}
                                onAddPlaceClick={props.onAddPlaceClick}
                                updatePlace={props.updatePlace}
                                deletePlace={props.deletePlace}
                                togglePlaceVisibility={props.togglePlaceVisibility}
                                toggleAllPlacesVisibility={props.toggleAllPlacesVisibility}
                                onZoomToPlace={props.onZoomToPlace}
                            />
                        </>
                    ) : (
                        <>
                            {isAdvancedMode && (
                                <PlaceSettingsPanel
                                    titleSize={props.placeTitleSize}
                                    onTitleSizeChange={props.setPlaceTitleSize}
                                    showIconsGlobally={props.showIconsGlobally}
                                    onToggleIconsGlobally={props.setShowIconsGlobally}
                                    autoCreatePlaces={props.autoCreatePlaces}
                                    onToggleAutoCreatePlaces={props.setAutoCreatePlaces}
                                    defaultUseLocalityName={props.defaultUseLocalityName}
                                    onToggleDefaultUseLocalityName={props.setDefaultUseLocalityName}
                                    textStyle={props.placeTextStyle}
                                    onTextStyleChange={props.setPlaceTextStyle}
                                />
                            )}

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

                            <AdvancedToggle isAdvancedMode={isAdvancedMode} setIsAdvancedMode={setIsAdvancedMode} />
                        </>
                    )}
                </DrawerOverlay>
            ) : (
                <>
                    <FilesBar />
                    {/* Empty space in the middle for map interaction */}
                    <SettingsBar />
                </>
            )}
        </div>
    );
};

export const ControlsPanel: React.FC<ControlsPanelProps> = (props) => {
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerAddFile = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        accept=".gpx,.tcx,.fit,.gz"
        multiple
        onChange={(e) => {
            props.handleFiles(e.target.files);
            e.target.value = '';
        }}
        className="hidden"
        ref={fileInputRef}
        data-testid="hidden-file-input"
      />
      {isMobile ? (
        <MobileLayout {...props} onAddFileClick={triggerAddFile} />
      ) : (
        <DesktopLayout {...props} onAddFileClick={triggerAddFile} />
      )}
    </>
  );
};
