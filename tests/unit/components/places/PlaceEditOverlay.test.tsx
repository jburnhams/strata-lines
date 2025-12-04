import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaceEditOverlay } from '@/components/places/PlaceEditOverlay';
import type { Place } from '@/types';

// Mock ColorPicker and ConfirmDialog to simplify output
jest.mock('@/components/places/ColorPicker', () => ({
    ColorPicker: ({ color, onChange }: any) => (
        <div data-testid="color-picker">
            <input type="text" value={color} onChange={(e) => onChange(e.target.value)} />
        </div>
    )
}));

jest.mock('@/components/common/ConfirmDialog', () => ({
    ConfirmDialog: ({ isOpen, onConfirm }: any) => (
        isOpen ? <div data-testid="confirm-dialog"><button onClick={onConfirm}>Confirm</button></div> : null
    )
}));

jest.mock('@/components/Icons', () => ({
    XIcon: () => <span>X</span>,
    TrashIcon: () => <span>Trash</span>
}));

describe('PlaceEditOverlay', () => {
    const mockPlace: Place = {
        id: '1',
        title: 'Test Place',
        latitude: 0,
        longitude: 0,
        createdAt: 0,
        source: 'manual',
        isVisible: true,
        showIcon: true,
        iconStyle: 'pin'
    };

    const mockUpdate = jest.fn();
    const mockDelete = jest.fn();
    const mockClose = jest.fn();
    const defaultProps = {
        place: mockPlace,
        isOpen: true,
        position: { x: 100, y: 100 },
        onClose: mockClose,
        onUpdate: mockUpdate,
        onDelete: mockDelete,
        textStyleOptions: {
            fontSize: 12,
            fontFamily: 'Arial',
            fontWeight: 'bold',
            color: '#000000'
        }
    };

    it('renders correctly', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        expect(screen.getByDisplayValue('Test Place')).toBeInTheDocument();
        expect(screen.getByText('Edit Place')).toBeInTheDocument();
    });

    it('updates title on blur', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        const input = screen.getByDisplayValue('Test Place');
        fireEvent.change(input, { target: { value: 'New Title' } });
        fireEvent.blur(input);
        expect(mockUpdate).toHaveBeenCalledWith({ title: 'New Title' });
    });

    it('handles delete workflow', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        fireEvent.click(screen.getByText('Delete'));
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Confirm'));
        expect(mockDelete).toHaveBeenCalled();
        expect(mockClose).toHaveBeenCalled();
    });
});
