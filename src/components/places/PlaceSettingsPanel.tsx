import React from 'react';
import type { PlaceTextStyle } from '@/types';
import { ColorPicker } from './ColorPicker';

interface PlaceSettingsPanelProps {
  titleSize: number;
  onTitleSizeChange: (size: number) => void;
  showIconsGlobally: boolean;
  onToggleIconsGlobally: (show: boolean) => void;
  autoCreatePlaces: boolean;
  onToggleAutoCreatePlaces: (val: boolean) => void;
  defaultUseLocalityName: boolean;
  onToggleDefaultUseLocalityName: (val: boolean) => void;

  // Global Text Style Props
  textStyle: PlaceTextStyle;
  onTextStyleChange: (style: PlaceTextStyle) => void;
}

export const PlaceSettingsPanel: React.FC<PlaceSettingsPanelProps> = ({
  titleSize,
  onTitleSizeChange,
  showIconsGlobally,
  onToggleIconsGlobally,
  autoCreatePlaces,
  onToggleAutoCreatePlaces,
  defaultUseLocalityName,
  onToggleDefaultUseLocalityName,
  textStyle,
  onTextStyleChange
}) => {

  const updateTextStyle = (updates: Partial<PlaceTextStyle>) => {
      onTextStyleChange({ ...textStyle, ...updates });
  };

  return (
    <div className="bg-white rounded-md border p-3 mt-4 space-y-4 text-gray-800">
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
        <h4 className="text-sm font-medium text-gray-700 mb-2">Text Styling</h4>
        <div className="space-y-3">
             {/* Text Color */}
             <ColorPicker
                label="Text Color"
                color={textStyle.color}
                onChange={(c) => updateTextStyle({ color: c })}
                allowAuto={true}
                autoEnabled={textStyle.color === 'auto'}
                onAutoToggle={(enabled) => updateTextStyle({ color: enabled ? 'auto' : '#000000' })}
            />

            {/* Drop Shadow */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Drop Shadow</label>
                </div>
                <div className="flex items-center gap-2">
                    <ColorPicker
                        label=""
                        color={textStyle.strokeColor || '#ffffff'}
                        onChange={(c) => updateTextStyle({ strokeColor: c })}
                    />
                    <input
                        type="number"
                        min="0" max="10"
                        value={textStyle.strokeWidth || 0}
                        onChange={(e) => updateTextStyle({ strokeWidth: Number(e.target.value) })}
                        className="w-16 px-2 py-1 text-sm border rounded bg-gray-50"
                    />
                    <span className="text-xs text-gray-500">px</span>
                </div>
            </div>

            {/* Glow */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Glow</label>
                </div>
                <div className="flex items-center gap-2">
                    <ColorPicker
                        label=""
                        color={textStyle.glowColor || '#000000'}
                        onChange={(c) => updateTextStyle({ glowColor: c })}
                    />
                    <input
                        type="number"
                        min="0" max="20"
                        value={textStyle.glowBlur || 0}
                        onChange={(e) => updateTextStyle({ glowBlur: Number(e.target.value) })}
                        className="w-16 px-2 py-1 text-sm border rounded bg-gray-50"
                    />
                    <span className="text-xs text-gray-500">px</span>
                </div>
            </div>

             {/* Title Size */}
            <div className="pt-2">
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
        </div>
      </div>

      <div className="p-3 bg-gray-50 rounded border border-gray-100 flex items-center justify-center space-x-2">
        {showIconsGlobally && (
             <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
        )}
        <span
            className="font-medium"
            style={{
                fontSize: `${10 + (titleSize / 100) * 20}px`, // Rough simulation: 10px to 30px
                color: textStyle.color === 'auto' ? '#000000' : textStyle.color,
                textShadow: textStyle.strokeWidth && textStyle.strokeWidth > 0
                    ? `0 0 ${textStyle.strokeWidth}px ${textStyle.strokeColor}`
                    : textStyle.glowBlur && textStyle.glowBlur > 0
                        ? `0 0 ${textStyle.glowBlur}px ${textStyle.glowColor}`
                        : 'none'
            }}
        >
            Example Place
        </span>
      </div>
    </div>
  );
};
