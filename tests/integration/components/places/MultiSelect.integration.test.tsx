/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { PlacesList } from '@/components/places/PlacesList';
import { Place } from '@/types';
import { act } from 'react-dom/test-utils';

const mockPlaces: Place[] = [
    {
        id: 'p1',
        title: 'Place 1',
        latitude: 0,
        longitude: 0,
        source: 'manual',
        createdAt: 0,
        isVisible: true,
        showIcon: true,
        iconStyle: 'pin'
    },
    {
        id: 'p2',
        title: 'Place 2',
        latitude: 1,
        longitude: 1,
        source: 'manual',
        createdAt: 1,
        isVisible: true,
        showIcon: true,
        iconStyle: 'dot'
    }
];

describe('MultiSelect Integration', () => {
    it('should allow selecting places and deleting them', async () => {
        const onDelete = jest.fn();

        render(
            <PlacesList
                places={mockPlaces}
                onToggleVisibility={jest.fn()}
                onEdit={jest.fn()}
                onDelete={onDelete}
                onZoomTo={jest.fn()}
                isCollapsed={false}
                onToggleCollapse={jest.fn()}
            />
        );

        // Click Select button
        fireEvent.click(screen.getByText('Select'));

        // Select first place
        const checkbox1 = screen.getByTestId('checkbox-p1');
        fireEvent.click(checkbox1);
        expect(checkbox1).toBeChecked();

        // Select second place
        const checkbox2 = screen.getByTestId('checkbox-p2');
        fireEvent.click(checkbox2);
        expect(checkbox2).toBeChecked();

        // Check "2 Selected" text
        expect(screen.getByText('2 Selected')).toBeInTheDocument();

        // Click Delete button (appears when selection > 0)
        fireEvent.click(screen.getByText('Delete'));

        // Confirm dialog should appear
        expect(screen.getByText('Delete Selected Places')).toBeInTheDocument();

        // Click Confirm Delete (red button)
        // Note: ConfirmDialog uses Portal usually? But my implementation just renders it.
        // Assuming it's rendered in place or portal is mocked/handled by jsdom
        const dialog = screen.getByRole('dialog');
        const confirmBtn = within(dialog).getByRole('button', { name: 'Delete' });
        fireEvent.click(confirmBtn);

        // Verify onDelete called for both
        expect(onDelete).toHaveBeenCalledWith('p1');
        expect(onDelete).toHaveBeenCalledWith('p2');
        expect(onDelete).toHaveBeenCalledTimes(2);
    });

    it('should select all places', async () => {
        render(
            <PlacesList
                places={mockPlaces}
                onToggleVisibility={jest.fn()}
                onEdit={jest.fn()}
                onDelete={jest.fn()}
                onZoomTo={jest.fn()}
                isCollapsed={false}
                onToggleCollapse={jest.fn()}
            />
        );

        fireEvent.click(screen.getByText('Select'));

        const selectAll = screen.getByTestId('select-all-places');
        fireEvent.click(selectAll);

        expect(screen.getByTestId('checkbox-p1')).toBeChecked();
        expect(screen.getByTestId('checkbox-p2')).toBeChecked();
        expect(screen.getByText('2 Selected')).toBeInTheDocument();
    });
});
