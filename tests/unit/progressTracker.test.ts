import {
  SubdivisionProgressTracker,
  ExportProgressTracker,
  formatStageLabel,
  calculateProgress,
  type ProgressInfo,
} from '../../utils/progressTracker';

describe('progressTracker utility functions', () => {
  describe('formatStageLabel', () => {
    it('should format base stage with index and total', () => {
      expect(formatStageLabel('base', 1, 3)).toBe('base 1/3');
      expect(formatStageLabel('base', 2, 5)).toBe('base 2/5');
    });

    it('should return stage name for non-base stages', () => {
      expect(formatStageLabel('tiles')).toBe('tiles');
      expect(formatStageLabel('lines')).toBe('lines');
      expect(formatStageLabel('stitching')).toBe('stitching');
    });

    it('should return stage name if index or total is missing', () => {
      expect(formatStageLabel('base')).toBe('base');
      expect(formatStageLabel('base', 1)).toBe('base');
    });
  });

  describe('calculateProgress', () => {
    it('should calculate correct percentage', () => {
      expect(calculateProgress(0, 10)).toBe(0);
      expect(calculateProgress(5, 10)).toBe(50);
      expect(calculateProgress(10, 10)).toBe(100);
      expect(calculateProgress(7, 10)).toBe(70);
    });

    it('should round to nearest integer', () => {
      expect(calculateProgress(1, 3)).toBe(33);
      expect(calculateProgress(2, 3)).toBe(67);
    });

    it('should handle zero total', () => {
      expect(calculateProgress(0, 0)).toBe(0);
      expect(calculateProgress(5, 0)).toBe(0);
    });

    it('should handle edge cases', () => {
      expect(calculateProgress(1, 1)).toBe(100);
      expect(calculateProgress(0, 1)).toBe(0);
    });
  });
});

describe('SubdivisionProgressTracker', () => {
  it('should initialize with default values', () => {
    const tracker = new SubdivisionProgressTracker();
    const progress = tracker.getProgress();

    expect(progress.stage).toBe('base');
    expect(progress.current).toBe(0);
    expect(progress.total).toBe(0);
    expect(progress.percentage).toBe(0);
    expect(progress.stageLabel).toBe('base 1/1');
  });

  it('should update stage', () => {
    const tracker = new SubdivisionProgressTracker();

    tracker.setStage('tiles', 2, 3);
    const progress = tracker.getProgress();

    expect(progress.stage).toBe('tiles');
    expect(progress.stageLabel).toBe('tiles');
  });

  it('should update progress', () => {
    const tracker = new SubdivisionProgressTracker();

    tracker.updateProgress(5, 10);
    const progress = tracker.getProgress();

    expect(progress.current).toBe(5);
    expect(progress.total).toBe(10);
    expect(progress.percentage).toBe(50);
  });

  it('should increment progress', () => {
    const tracker = new SubdivisionProgressTracker();

    tracker.setTotal(10);
    tracker.increment();
    tracker.increment();
    tracker.increment();

    const progress = tracker.getProgress();
    expect(progress.current).toBe(3);
    expect(progress.total).toBe(10);
    expect(progress.percentage).toBe(30);
  });

  it('should reset progress when stage changes', () => {
    const tracker = new SubdivisionProgressTracker();

    tracker.updateProgress(5, 10);
    tracker.setStage('lines', 2, 3);

    const progress = tracker.getProgress();
    expect(progress.current).toBe(0);
    expect(progress.total).toBe(0);
    expect(progress.stage).toBe('lines');
  });

  it('should call onProgress callback when progress updates', () => {
    const onProgressMock = jest.fn();
    const tracker = new SubdivisionProgressTracker({ onProgress: onProgressMock });

    tracker.setStage('tiles');
    expect(onProgressMock).toHaveBeenCalledTimes(1);

    tracker.updateProgress(5, 10);
    expect(onProgressMock).toHaveBeenCalledTimes(2);

    const lastCall = onProgressMock.mock.calls[1][0] as ProgressInfo;
    expect(lastCall.current).toBe(5);
    expect(lastCall.total).toBe(10);
    expect(lastCall.percentage).toBe(50);
  });

  it('should call onProgress callback when incrementing', () => {
    const onProgressMock = jest.fn();
    const tracker = new SubdivisionProgressTracker({ onProgress: onProgressMock });

    onProgressMock.mockClear(); // Clear the initial call from constructor
    tracker.setStage('lines'); // This will call once
    onProgressMock.mockClear(); // Clear that call too

    tracker.setTotal(10);
    expect(onProgressMock).toHaveBeenCalledTimes(1);

    tracker.increment();
    expect(onProgressMock).toHaveBeenCalledTimes(2);
  });

  it('should format base stage label correctly', () => {
    const tracker = new SubdivisionProgressTracker();

    tracker.setStage('base', 2, 3);
    const progress = tracker.getProgress();

    expect(progress.stageLabel).toBe('base 2/3');
  });

  it('should handle multiple stage transitions', () => {
    const onProgressMock = jest.fn();
    const tracker = new SubdivisionProgressTracker({ onProgress: onProgressMock });

    tracker.setStage('base', 1, 3);
    tracker.updateProgress(10, 20);

    tracker.setStage('tiles');
    tracker.updateProgress(5, 15);

    tracker.setStage('lines', 3, 3);
    tracker.updateProgress(8, 10);

    const progress = tracker.getProgress();
    expect(progress.stage).toBe('lines');
    expect(progress.current).toBe(8);
    expect(progress.total).toBe(10);
    expect(progress.percentage).toBe(80);
    // formatStageLabel only formats with index/total for 'base' stage
    expect(progress.stageLabel).toBe('lines');
  });
});

describe('ExportProgressTracker', () => {
  it('should initialize with no subdivisions', () => {
    const tracker = new ExportProgressTracker();

    expect(tracker.getCurrentSubdivision()).toBe(-1);
    expect(tracker.getSubdivisionTracker(0)).toBeUndefined();
  });

  it('should create subdivision trackers', () => {
    const tracker = new ExportProgressTracker();
    const onProgressMock = jest.fn();

    const subTracker = tracker.createSubdivisionTracker(0, { onProgress: onProgressMock });

    expect(subTracker).toBeInstanceOf(SubdivisionProgressTracker);
    expect(tracker.getSubdivisionTracker(0)).toBe(subTracker);
  });

  it('should track current subdivision', () => {
    const tracker = new ExportProgressTracker();

    tracker.setCurrentSubdivision(2);
    expect(tracker.getCurrentSubdivision()).toBe(2);

    tracker.setCurrentSubdivision(5);
    expect(tracker.getCurrentSubdivision()).toBe(5);
  });

  it('should manage multiple subdivision trackers', () => {
    const tracker = new ExportProgressTracker();

    const tracker0 = tracker.createSubdivisionTracker(0, {});
    const tracker1 = tracker.createSubdivisionTracker(1, {});
    const tracker2 = tracker.createSubdivisionTracker(2, {});

    expect(tracker.getSubdivisionTracker(0)).toBe(tracker0);
    expect(tracker.getSubdivisionTracker(1)).toBe(tracker1);
    expect(tracker.getSubdivisionTracker(2)).toBe(tracker2);
  });

  it('should clear all trackers', () => {
    const tracker = new ExportProgressTracker();

    tracker.createSubdivisionTracker(0, {});
    tracker.createSubdivisionTracker(1, {});
    tracker.setCurrentSubdivision(1);

    tracker.clear();

    expect(tracker.getCurrentSubdivision()).toBe(-1);
    expect(tracker.getSubdivisionTracker(0)).toBeUndefined();
    expect(tracker.getSubdivisionTracker(1)).toBeUndefined();
  });

  it('should maintain independent progress for each subdivision', () => {
    const tracker = new ExportProgressTracker();

    const tracker0 = tracker.createSubdivisionTracker(0, {});
    const tracker1 = tracker.createSubdivisionTracker(1, {});

    tracker0.updateProgress(5, 10);
    tracker1.updateProgress(3, 20);

    expect(tracker0.getProgress().percentage).toBe(50);
    expect(tracker1.getProgress().percentage).toBe(15);
  });

  it('should handle callbacks for each subdivision independently', () => {
    const tracker = new ExportProgressTracker();

    const onProgress0 = jest.fn();
    const onProgress1 = jest.fn();

    const tracker0 = tracker.createSubdivisionTracker(0, { onProgress: onProgress0 });
    const tracker1 = tracker.createSubdivisionTracker(1, { onProgress: onProgress1 });

    onProgress0.mockClear();
    onProgress1.mockClear();

    tracker0.updateProgress(5, 10);
    expect(onProgress0).toHaveBeenCalledTimes(1);
    expect(onProgress1).toHaveBeenCalledTimes(0);

    tracker1.updateProgress(3, 20);
    expect(onProgress0).toHaveBeenCalledTimes(1);
    expect(onProgress1).toHaveBeenCalledTimes(1);
  });
});
