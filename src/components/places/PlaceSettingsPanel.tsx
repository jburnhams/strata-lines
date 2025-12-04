import React from 'react';

interface PlaceSettingsPanelProps {
  titleSize: number;
  onTitleSizeChange: (size: number) => void;
  showIconsGlobally: boolean;
  onToggleIconsGlobally: (show: boolean) => void;
  autoCreatePlaces: boolean;
  onToggleAutoCreatePlaces: (val: boolean) => void;
  defaultUseLocalityName: boolean;
  onToggleDefaultUseLocalityName: (val: boolean) => void;
}

export const PlaceSettingsPanel: React.FC<PlaceSettingsPanelProps> = ({
  titleSize,
  onTitleSizeChange,
  showIconsGlobally,
  onToggleIconsGlobally,
  autoCreatePlaces,
  onToggleAutoCreatePlaces,
  defaultUseLocalityName,
  onToggleDefaultUseLocalityName
}) => {
  return (
    <div className="bg-white rounded-md border p-3 mt-4 space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Place Settings</h4>
        <div className="flex items-center justify-between">
            <label htmlFor="showIcons" className="text-sm text-gray-600">Show Icons</label>
            <input
                id="showIcons"
                type="checkbox"
                checked={showIconsGlobally}
                onChange={(e) => onToggleIconsGlobally(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Track Integration</h4>
        <div className="flex items-center justify-between mb-2">
            <label htmlFor="autoCreatePlaces" className="text-sm text-gray-600" title="Automatically create Start/Middle/End places when uploading tracks">Auto-create Places</label>
            <input
                id="autoCreatePlaces"
                type="checkbox"
                checked={autoCreatePlaces}
                onChange={(e) => onToggleAutoCreatePlaces(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
        </div>
        <div className="flex items-center justify-between">
            <label htmlFor="useLocalityNames" className="text-sm text-gray-600" title="Use geocoded locality name instead of track name for places">Use Locality Names</label>
            <input
                id="useLocalityNames"
                type="checkbox"
                checked={defaultUseLocalityName}
                onChange={(e) => onToggleDefaultUseLocalityName(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
        </div>
      </div>

      <div>
        <label htmlFor="titleSize" className="text-sm text-gray-600 flex justify-between mb-1">
            <span>Title Size</span>
            <span className="text-xs text-gray-400">{titleSize}%</span>
        </label>
        <input
          id="titleSize"
          type="range"
          min="1"
          max="100"
          value={titleSize}
          onChange={(e) => onTitleSizeChange(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div className="p-3 bg-gray-50 rounded border border-gray-100 flex items-center justify-center space-x-2">
        {showIconsGlobally && (
             <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
        )}
        <span
            className="text-gray-800 font-medium"
            style={{ fontSize: `${10 + (titleSize / 100) * 20}px` }} // Rough simulation: 10px to 30px
        >
            Example Place
        </span>
      </div>
    </div>
  );
};
