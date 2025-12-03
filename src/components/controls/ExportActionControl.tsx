import React from 'react';

export interface ExportSelection {
    base: boolean;
    lines: boolean;
    labels: boolean;
    places: boolean;
}

interface ExportActionControlProps {
    maxDimension: number;
    setMaxDimension: (dimension: number) => void;
    onExport: () => void;
    anyExporting: boolean;
    isExporting: boolean;
    exportSelection: ExportSelection;
    setExportSelection: React.Dispatch<React.SetStateAction<ExportSelection>>;
    isAdvancedMode: boolean;
    hasVisibleTracks: boolean;
    isLabelControlDisabled: boolean;
}

export const ExportActionControl: React.FC<ExportActionControlProps> = ({
    maxDimension,
    setMaxDimension,
    onExport,
    anyExporting,
    isExporting,
    exportSelection,
    setExportSelection,
    isAdvancedMode,
    hasVisibleTracks,
    isLabelControlDisabled,
}) => {

    const handleCheckboxChange = (key: keyof ExportSelection) => {
        setExportSelection(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
      <section className="flex-grow flex flex-col justify-end space-y-4">
        {isAdvancedMode && (
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
            </div>
        )}

        <div>
             {isAdvancedMode && (
                <div className="flex space-x-4 mb-3 justify-center">
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={exportSelection.base}
                            onChange={() => handleCheckboxChange('base')}
                            className="form-checkbox h-4 w-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
                        />
                        <span className="ml-2 text-gray-300 text-sm">Base</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={exportSelection.lines}
                            onChange={() => handleCheckboxChange('lines')}
                            disabled={!hasVisibleTracks}
                            className="form-checkbox h-4 w-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className={`ml-2 text-sm ${!hasVisibleTracks ? 'text-gray-500' : 'text-gray-300'}`}>Lines</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={exportSelection.labels}
                            onChange={() => handleCheckboxChange('labels')}
                            disabled={isLabelControlDisabled}
                            className="form-checkbox h-4 w-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className={`ml-2 text-sm ${isLabelControlDisabled ? 'text-gray-500' : 'text-gray-300'}`}>Labels</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={exportSelection.places}
                            onChange={() => handleCheckboxChange('places')}
                            className="form-checkbox h-4 w-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
                        />
                        <span className="ml-2 text-sm text-gray-300">Places</span>
                    </label>
                </div>
             )}

            <button
                onClick={onExport}
                disabled={anyExporting || (!hasVisibleTracks && exportSelection.lines && !exportSelection.base && !exportSelection.labels && !exportSelection.places)}
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
                ) : isAdvancedMode ? 'Export Selected' : 'Export'}
            </button>
        </div>
      </section>
    );
};
