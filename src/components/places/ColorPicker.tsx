import React from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
  allowAuto?: boolean;
  autoEnabled?: boolean;
  onAutoToggle?: (enabled: boolean) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  color,
  onChange,
  label,
  allowAuto,
  autoEnabled,
  onAutoToggle
}) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        {allowAuto && onAutoToggle && (
          <label className="flex items-center text-xs text-gray-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoEnabled}
              onChange={(e) => onAutoToggle(e.target.checked)}
              className="mr-1 h-3 w-3 rounded text-blue-600 focus:ring-blue-500"
            />
            Auto
          </label>
        )}
      </div>

      {autoEnabled ? (
          <div className="text-xs text-gray-500 italic px-2 py-1 bg-gray-50 border rounded select-none">
              Contrast color from map
          </div>
      ) : (
        <div className="flex items-center gap-2">
            <input
                type="color"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
            />
            <input
                type="text"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 px-2 py-1 text-sm border rounded font-mono uppercase"
                placeholder="#RRGGBB"
                maxLength={7}
            />
        </div>
      )}
    </div>
  );
};
