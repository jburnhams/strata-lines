import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

describe('ConfirmDialog', () => {
    const mockConfirm = jest.fn();
    const mockCancel = jest.fn();
    const defaultProps = {
        isOpen: true,
        title: 'Test Dialog',
        message: 'Are you sure?',
        confirmLabel: 'Yes',
        cancelLabel: 'No',
        onConfirm: mockConfirm,
        onCancel: mockCancel
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('does not render when closed', () => {
        render(<ConfirmDialog {...defaultProps} isOpen={false} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders correctly when open', () => {
        render(<ConfirmDialog {...defaultProps} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Test Dialog')).toBeInTheDocument();
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
        expect(screen.getByText('Yes')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('calls onConfirm when confirm button clicked', () => {
        render(<ConfirmDialog {...defaultProps} />);
        fireEvent.click(screen.getByText('Yes'));
        expect(mockConfirm).toHaveBeenCalled();
    });

    it('calls onCancel when cancel button clicked', () => {
        render(<ConfirmDialog {...defaultProps} />);
        fireEvent.click(screen.getByText('No'));
        expect(mockCancel).toHaveBeenCalled();
    });

    it('focuses confirm button on mount', () => {
        render(<ConfirmDialog {...defaultProps} />);
        expect(screen.getByText('Yes')).toHaveFocus();
    });

    it('renders danger variant styles', () => {
        render(<ConfirmDialog {...defaultProps} variant="danger" />);
        const confirmBtn = screen.getByText('Yes');
        expect(confirmBtn.className).toContain('bg-red-600');
    });

    it('renders info variant styles', () => {
        render(<ConfirmDialog {...defaultProps} variant="info" />);
        const confirmBtn = screen.getByText('Yes');
        expect(confirmBtn.className).toContain('bg-blue-600');
    });
});
