import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ActivityTypeFilter } from '@/components/controls/ActivityTypeFilter';

describe('ActivityTypeFilter', () => {
    const mockCounts = {
        'Running': 5,
        'Cycling': 3
    };
    const mockToggle = jest.fn();

    it('should render nothing if no counts', () => {
        const { container } = render(
            <ActivityTypeFilter
                activityCounts={{}}
                hiddenActivityTypes={new Set()}
                toggleActivityFilter={mockToggle}
            />
        );
        expect(container.firstChild).toBeNull();
    });

    it('should render the toggle button', () => {
        render(
            <ActivityTypeFilter
                activityCounts={mockCounts}
                hiddenActivityTypes={new Set()}
                toggleActivityFilter={mockToggle}
            />
        );
        expect(screen.getByText('Filter Activity Types')).toBeInTheDocument();
    });

    it('should open dropdown when clicked', () => {
        render(
            <ActivityTypeFilter
                activityCounts={mockCounts}
                hiddenActivityTypes={new Set()}
                toggleActivityFilter={mockToggle}
            />
        );

        fireEvent.click(screen.getByText('Filter Activity Types'));

        expect(screen.getByText('Running')).toBeInTheDocument();
        expect(screen.getByText('Cycling')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // Count
        expect(screen.getByText('3')).toBeInTheDocument(); // Count
    });

    it('should toggle filter when checkbox is clicked', () => {
        render(
            <ActivityTypeFilter
                activityCounts={mockCounts}
                hiddenActivityTypes={new Set()}
                toggleActivityFilter={mockToggle}
            />
        );

        fireEvent.click(screen.getByText('Filter Activity Types'));

        const runningCheckbox = screen.getByLabelText((content, element) => {
            return element?.tagName.toLowerCase() === 'input' &&
                   element.parentElement?.textContent?.includes('Running');
        });

        fireEvent.click(runningCheckbox);
        expect(mockToggle).toHaveBeenCalledWith('Running');
    });

    it('should show correct checked state based on hiddenActivityTypes', () => {
        const hidden = new Set(['Running']);
        render(
            <ActivityTypeFilter
                activityCounts={mockCounts}
                hiddenActivityTypes={hidden}
                toggleActivityFilter={mockToggle}
            />
        );

        fireEvent.click(screen.getByText('Filter Activity Types'));

        const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
        // Alphabetical sort assumed: Cycling, Running
        // Cycling (not hidden) -> checked
        // Running (hidden) -> unchecked

        const cycling = checkboxes.find(c => c.parentElement?.textContent?.includes('Cycling'));
        const running = checkboxes.find(c => c.parentElement?.textContent?.includes('Running'));

        expect(cycling).toBeChecked();
        expect(running).not.toBeChecked();
    });
});
