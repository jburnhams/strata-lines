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
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200 mt-4">
       <h4 className="text-sm font-semibold text-gray-700">Place Settings</h4>

       <div className="space-y-2">
         <div className="flex justify-between items-center">
           <label className="text-sm text-gray-600">Title Size</label>
           <span className="text-xs font-mono text-gray-500">{titleSize}%</span>
         </div>
         <input
           type="range"
           min="10"
           max="100"
           value={titleSize}
           onChange={(e) => onTitleSizeChange(parseInt(e.target.value))}
           className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
         />
         <div className="flex justify-center h-8 items-center bg-white border border-gray-200 rounded overflow-hidden">
            <span style={{ fontSize: `${(titleSize / 50) * 14}px` }} className="text-gray-800 font-medium truncate px-2">
               Preview Text
            </span>
         </div>
       </div>

       <div className="flex items-center space-x-2">
         <input
           type="checkbox"
           id="showIconsGlobally"
           checked={showIconsGlobally}
           onChange={(e) => onToggleIconsGlobally(e.target.checked)}
           className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
         />
         <label htmlFor="showIconsGlobally" className="text-sm text-gray-600">
           Show Icons Globally
         </label>
       </div>
    </div>
  );
};
