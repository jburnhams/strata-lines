import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from '@/components/places/ColorPicker';

describe('ColorPicker', () => {
    const mockOnChange = jest.fn();
    const defaultProps = {
        color: '#ff0000',
        onChange: mockOnChange,
        label: 'Test Color'
    };

    it('renders correctly', () => {
        render(<ColorPicker {...defaultProps} />);
        expect(screen.getByText('Test Color')).toBeInTheDocument();
        expect(screen.getAllByDisplayValue('#ff0000')).toHaveLength(2);
    });

    it('calls onChange when input changes', () => {
        const { container } = render(<ColorPicker {...defaultProps} />);
        const input = container.querySelector('input[type="text"]') as HTMLInputElement;
        fireEvent.change(input, { target: { value: '#00ff00' } });
        expect(mockOnChange).toHaveBeenCalledWith('#00ff00');
    });

    it('handles auto mode toggle', () => {
        const mockToggle = jest.fn();
        render(<ColorPicker {...defaultProps} allowAuto={true} autoEnabled={false} onAutoToggle={mockToggle} />);

        fireEvent.click(screen.getByLabelText('Auto'));
        expect(mockToggle).toHaveBeenCalledWith(true);
    });

    it('shows auto message when enabled', () => {
        render(<ColorPicker {...defaultProps} allowAuto={true} autoEnabled={true} />);
        expect(screen.getByText('Contrast color from map')).toBeInTheDocument();
    });
});
