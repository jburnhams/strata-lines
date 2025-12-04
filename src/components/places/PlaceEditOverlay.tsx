import React, { useState, useEffect, useRef } from 'react';
import type { Place, PlaceIconStyle, PlaceTextStyle } from '@/types';
import { ColorPicker } from './ColorPicker';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { XIcon, TrashIcon } from '@/components/Icons';

interface PlaceEditOverlayProps {
  place: Place;
  isOpen: boolean;
  position: { x: number, y: number };
  onClose: () => void;
  onUpdate: (updates: Partial<Place>) => void;
  onDelete: () => void;
  textStyleOptions: PlaceTextStyle;
}

export const PlaceEditOverlay: React.FC<PlaceEditOverlayProps> = ({
  place,
  isOpen,
  position,
  onClose,
  onUpdate,
  onDelete,
  textStyleOptions,
}) => {
  const [currentPosition, setCurrentPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Local state for edits
  const [title, setTitle] = useState(place.title);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If the place ID changes, reset position to the prop position
    setCurrentPosition(position);
  }, [place.id, position]);

  useEffect(() => {
      setTitle(place.title);
  }, [place.id, place.title]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from title bar
    if ((e.target as HTMLElement).closest('.drag-handle')) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - currentPosition.x, y: e.clientY - currentPosition.y });
    }
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isDragging) {
              const newX = e.clientX - dragStart.x;
              const newY = e.clientY - dragStart.y;

              // Constrain to viewport
              const maxX = window.innerWidth - (containerRef.current?.offsetWidth || 300);
              const maxY = window.innerHeight - (containerRef.current?.offsetHeight || 400);

              setCurrentPosition({
                  x: Math.max(0, Math.min(newX, maxX)),
                  y: Math.max(0, Math.min(newY, maxY))
              });
          }
      };

      const handleMouseUp = () => {
          setIsDragging(false);
      };

      if (isDragging) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isDragging, dragStart]);

  const handleTitleSave = () => {
      if (title.trim()) {
          onUpdate({ title: title.trim() });
      } else {
          setTitle(place.title); // Revert if empty
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleTitleSave();
      if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  const iconStyles: PlaceIconStyle[] = ['pin', 'dot', 'circle', 'marker', 'flag', 'star'];

  // Helper to update text style for THIS place specifically
  const updatePlaceTextStyle = (updates: Partial<PlaceTextStyle>) => {
      // Ensure we have a complete style object by falling back to global options
      const baseStyle = place.textStyle || textStyleOptions;
      onUpdate({ textStyle: { ...baseStyle, ...updates } });
  };

  const currentTextStyle = { ...textStyleOptions, ...place.textStyle };

  return (
    <>
    <div
      ref={containerRef}
      className="absolute bg-white rounded-lg shadow-xl border border-gray-200 w-80 flex flex-col z-[1000]"
      style={{
          left: currentPosition.x,
          top: currentPosition.y,
          maxHeight: '90vh'
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div
        className="drag-handle flex justify-between items-center p-3 border-b border-gray-100 cursor-move bg-gray-50 rounded-t-lg select-none"
        onMouseDown={handleMouseDown}
      >
          <span className="font-semibold text-gray-700">Edit Place</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XIcon className="h-5 w-5" />
          </button>
      </div>

      {/* Content */}
      <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Title */}
          <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                  maxLength={50}
                  autoFocus
              />
              <div className="text-right text-xs text-gray-400 mt-1">{title.length}/50</div>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-2">
              <input
                  type="checkbox"
                  id="place-visible"
                  checked={place.isVisible}
                  onChange={(e) => onUpdate({ isVisible: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="place-visible" className="text-sm text-gray-700 select-none">Visible on Map</label>
          </div>

          {/* Icon Settings */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Icon</h4>

               <div className="flex items-center gap-2">
                  <input
                      type="checkbox"
                      id="icon-visible"
                      checked={place.showIcon}
                      onChange={(e) => onUpdate({ showIcon: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="icon-visible" className="text-sm text-gray-700 select-none">Show Icon</label>
              </div>

              {place.showIcon && (
                  <div className="grid grid-cols-6 gap-2">
                      {iconStyles.map(style => (
                          <button
                              key={style}
                              onClick={() => onUpdate({ iconStyle: style })}
                              className={`p-1 rounded border flex items-center justify-center ${place.iconStyle === style ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:border-gray-300 text-gray-400'}`}
                              title={style}
                          >
                               <div className="text-[10px] uppercase font-bold">{style[0]}</div>
                          </button>
                      ))}
                  </div>
              )}
          </div>

          {/* Text Styling */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Text Style</h4>

              <ColorPicker
                  label="Text Color"
                  color={currentTextStyle.color}
                  onChange={(c) => updatePlaceTextStyle({ color: c })}
                  allowAuto={true}
                  autoEnabled={currentTextStyle.color === 'auto'}
                  onAutoToggle={(enabled) => updatePlaceTextStyle({ color: enabled ? 'auto' : '#000000' })}
              />

               {/* Drop Shadow */}
               <div className="space-y-2">
                  <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-700">Drop Shadow</label>
                  </div>
                  <div className="flex items-center gap-2">
                      <ColorPicker
                          label=""
                          color={currentTextStyle.strokeColor || '#ffffff'}
                          onChange={(c) => updatePlaceTextStyle({ strokeColor: c })}
                      />
                      <input
                          type="number"
                          min="0" max="10"
                          value={currentTextStyle.strokeWidth || 0}
                          onChange={(e) => updatePlaceTextStyle({ strokeWidth: Number(e.target.value) })}
                          className="w-16 px-2 py-1 text-sm border rounded"
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
                          color={currentTextStyle.glowColor || '#000000'}
                          onChange={(c) => updatePlaceTextStyle({ glowColor: c })}
                      />
                      <input
                          type="number"
                          min="0" max="20"
                          value={currentTextStyle.glowBlur || 0}
                          onChange={(e) => updatePlaceTextStyle({ glowBlur: Number(e.target.value) })}
                          className="w-16 px-2 py-1 text-sm border rounded"
                      />
                      <span className="text-xs text-gray-500">px</span>
                  </div>
               </div>
          </div>
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-between">
          <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded hover:bg-red-50"
          >
              <TrashIcon className="h-4 w-4" />
              Delete
          </button>

          <button
              onClick={onClose}
               className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
          >
              Close
          </button>
      </div>
    </div>

    <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Place"
        message={`Are you sure you want to delete "${place.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
            onDelete();
            setDeleteConfirmOpen(false);
            onClose();
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
        variant="danger"
    />
    </>
  );
};
