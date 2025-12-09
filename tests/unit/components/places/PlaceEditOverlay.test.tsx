import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PlaceEditOverlay } from '@/components/places/PlaceEditOverlay';
import type { Place } from '@/types';

// Mock ColorPicker to simplify output and testing
jest.mock('@/components/places/ColorPicker', () => ({
    ColorPicker: ({ color, onChange, label, onAutoToggle, autoEnabled, allowAuto }: any) => (
        <div data-testid={`color-picker-${label || 'unlabeled'}`}>
             <label>{label}</label>
            <input
                type="text"
                value={color}
                onChange={(e) => onChange(e.target.value)}
                data-testid={`color-input-${label || 'unlabeled'}`}
            />
            {allowAuto && (
                <button
                    onClick={() => onAutoToggle(!autoEnabled)}
                    data-testid="auto-toggle"
                >
                    {autoEnabled ? "Auto On" : "Auto Off"}
                </button>
            )}
        </div>
    )
}));

// Mock ConfirmDialog
jest.mock('@/components/common/ConfirmDialog', () => ({
    ConfirmDialog: ({ isOpen, onConfirm, onCancel }: any) => (
        isOpen ? (
            <div data-testid="confirm-dialog">
                <button onClick={onConfirm}>Confirm Delete</button>
                <button onClick={onCancel}>Cancel Delete</button>
            </div>
        ) : null
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
        iconStyle: 'pin',
        textStyle: {
            fontSize: 12,
            fontFamily: 'Arial',
            fontWeight: 'bold',
            color: '#000000',
            strokeColor: '#ffffff',
            strokeWidth: 2,
            glowColor: '#ffff00',
            glowBlur: 5
        }
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

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly with initial values', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        expect(screen.getByDisplayValue('Test Place')).toBeInTheDocument();
        expect(screen.getByText('Edit Place')).toBeInTheDocument();
        expect(screen.getByLabelText('Visible on Map')).toBeChecked();
        expect(screen.getByLabelText('Show Icon')).toBeChecked();
    });

    it('updates title on blur', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        const input = screen.getByDisplayValue('Test Place');
        fireEvent.change(input, { target: { value: 'New Title' } });
        fireEvent.blur(input);
        expect(mockUpdate).toHaveBeenCalledWith({ title: 'New Title' });
    });

    it('updates title on Enter key', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        const input = screen.getByDisplayValue('Test Place');
        fireEvent.change(input, { target: { value: 'Entered Title' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
        expect(mockUpdate).toHaveBeenCalledWith({ title: 'Entered Title' });
    });

    it('closes on Escape key', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        const container = screen.getByDisplayValue('Test Place').closest('div')?.parentElement;
        if (!container) throw new Error("Container not found");

        fireEvent.keyDown(container, { key: 'Escape', code: 'Escape' });
        expect(mockClose).toHaveBeenCalled();
    });

    it('toggles place visibility', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        const checkbox = screen.getByLabelText('Visible on Map');
        fireEvent.click(checkbox);
        expect(mockUpdate).toHaveBeenCalledWith({ isVisible: false });
    });

    it('toggles icon visibility', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        const checkbox = screen.getByLabelText('Show Icon');
        fireEvent.click(checkbox);
        expect(mockUpdate).toHaveBeenCalledWith({ showIcon: false });
    });

    it('updates icon style', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        // Assuming icon styles are buttons with letters
        const pinButton = screen.getByTitle('pin');
        const dotButton = screen.getByTitle('dot');

        fireEvent.click(dotButton);
        expect(mockUpdate).toHaveBeenCalledWith({ iconStyle: 'dot' });
    });

    it('updates text color via ColorPicker', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        const colorInput = screen.getByTestId('color-input-Text Color');
        fireEvent.change(colorInput, { target: { value: '#123456' } });
        expect(mockUpdate).toHaveBeenCalledWith({
            textStyle: expect.objectContaining({ color: '#123456' })
        });
    });

    it('updates stroke width', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        // Find number input for stroke width (it's near "Drop Shadow")
        // Since we don't have a unique label for the input, we might need to find by value or structure
        const inputs = screen.getAllByRole('spinbutton');
        const strokeWidthInput = inputs[0]; // Assuming order: strokeWidth, glowBlur

        fireEvent.change(strokeWidthInput, { target: { value: '5' } });
        expect(mockUpdate).toHaveBeenCalledWith({
             textStyle: expect.objectContaining({ strokeWidth: 5 })
        });
    });

    it('updates glow blur', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        const inputs = screen.getAllByRole('spinbutton');
        const glowBlurInput = inputs[1]; // Assuming order: strokeWidth, glowBlur

        fireEvent.change(glowBlurInput, { target: { value: '10' } });
        expect(mockUpdate).toHaveBeenCalledWith({
             textStyle: expect.objectContaining({ glowBlur: 10 })
        });
    });

    it('handles delete workflow', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        fireEvent.click(screen.getByText('Delete'));
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Confirm Delete'));
        expect(mockDelete).toHaveBeenCalled();
        expect(mockClose).toHaveBeenCalled();
    });

    it('cancels delete workflow', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        fireEvent.click(screen.getByText('Delete'));
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Cancel Delete'));
        expect(mockDelete).not.toHaveBeenCalled();
        expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument();
    });

    it('initiates drag on handle mousedown', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        const handle = screen.getByText('Edit Place').closest('.drag-handle');
        expect(handle).toBeInTheDocument();

        if (!handle) return;

        // Spy on window listeners
        const addListenerSpy = jest.spyOn(window, 'addEventListener');

        fireEvent.mouseDown(handle, { clientX: 110, clientY: 110 });

        expect(addListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(addListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    });

     it('updates position on drag', () => {
        render(<PlaceEditOverlay {...defaultProps} />);
        const handle = screen.getByText('Edit Place').closest('.drag-handle');
        if (!handle) return;

        fireEvent.mouseDown(handle, { clientX: 100, clientY: 100 });

        // Move mouse
        fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });

        // The component uses inline styles for position.
        // We can check the style of the main container.
        const container = handle.parentElement;
        expect(container).toHaveStyle({ left: '150px', top: '150px' });

        fireEvent.mouseUp(window);
    });
});
