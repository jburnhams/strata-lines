import React from 'react';

interface PlaceSettingsPanelProps {
  titleSize: number;
  onTitleSizeChange: (size: number) => void;
  showIconsGlobally: boolean;
  onToggleIconsGlobally: (show: boolean) => void;
}

export const PlaceSettingsPanel: React.FC<PlaceSettingsPanelProps> = ({
  titleSize,
  onTitleSizeChange,
  showIconsGlobally,
  onToggleIconsGlobally
}) => {
  return (
    <div className="bg-white rounded-md border p-3 mt-4 space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Place Settings</h4>
        <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">Show Icons</label>
            <input
                type="checkbox"
                checked={showIconsGlobally}
                onChange={(e) => onToggleIconsGlobally(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
        </div>
      </div>

      <div>
        <label className="text-sm text-gray-600 flex justify-between mb-1">
            <span>Title Size</span>
            <span className="text-xs text-gray-400">{titleSize}%</span>
        </label>
        <input
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
