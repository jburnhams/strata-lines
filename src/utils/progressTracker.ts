/**
 * Progress tracking utility for export operations
 * Manages progress state and emits progress events with stage information
 */

export type ProgressStage = 'base' | 'tiles' | 'lines' | 'places' | 'stitching' | 'scanline';

export interface ProgressInfo {
  stage: ProgressStage;
  current: number;
  total: number;
  percentage: number;
  stageLabel: string;
}

export interface ProgressCallbacks {
  onProgress?: (info: ProgressInfo) => void;
}

/**
 * Formats a stage name with index (e.g., "base 1/3", "tiles", "lines")
 */
export function formatStageLabel(stage: ProgressStage, index?: number, total?: number): string {
  if (stage === 'base' && index !== undefined && total !== undefined) {
    return `base ${index}/${total}`;
  }
  return stage;
}

/**
 * Calculates progress percentage
 */
export function calculateProgress(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}

/**
 * Progress tracker for a single subdivision export
 */
export class SubdivisionProgressTracker {
  private stage: ProgressStage = 'base';
  private current: number = 0;
  private total: number = 0;
  private stageIndex: number = 1;
  private stageTotal: number = 1;
  private callbacks: ProgressCallbacks;

  constructor(callbacks: ProgressCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Set the current stage
   */
  setStage(stage: ProgressStage, stageIndex: number = 1, stageTotal: number = 1): void {
    this.stage = stage;
    this.stageIndex = stageIndex;
    this.stageTotal = stageTotal;
    this.current = 0;
    this.total = 0;
    this.emit();
  }

  /**
   * Update progress for the current stage
   */
  updateProgress(current: number, total: number): void {
    this.current = current;
    this.total = total;
    this.emit();
  }

  /**
   * Increment progress by 1
   */
  increment(): void {
    this.current++;
    this.emit();
  }

  /**
   * Set total items for current stage
   */
  setTotal(total: number): void {
    this.total = total;
    this.emit();
  }

  /**
   * Get current progress info
   */
  getProgress(): ProgressInfo {
    return {
      stage: this.stage,
      current: this.current,
      total: this.total,
      percentage: calculateProgress(this.current, this.total),
      stageLabel: formatStageLabel(this.stage, this.stageIndex, this.stageTotal),
    };
  }

  /**
   * Emit progress event to callbacks
   */
  private emit(): void {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(this.getProgress());
    }
  }
}

/**
 * Progress tracker for entire export operation with multiple subdivisions
 */
export class ExportProgressTracker {
  private subdivisionTrackers: Map<number, SubdivisionProgressTracker> = new Map();
  private currentSubdivisionIndex: number = -1;

  /**
   * Create a tracker for a specific subdivision
   */
  createSubdivisionTracker(
    subdivisionIndex: number,
    callbacks: ProgressCallbacks
  ): SubdivisionProgressTracker {
    const tracker = new SubdivisionProgressTracker(callbacks);
    this.subdivisionTrackers.set(subdivisionIndex, tracker);
    return tracker;
  }

  /**
   * Get tracker for a specific subdivision
   */
  getSubdivisionTracker(subdivisionIndex: number): SubdivisionProgressTracker | undefined {
    return this.subdivisionTrackers.get(subdivisionIndex);
  }

  /**
   * Set current subdivision being processed
   */
  setCurrentSubdivision(index: number): void {
    this.currentSubdivisionIndex = index;
  }

  /**
   * Get current subdivision index
   */
  getCurrentSubdivision(): number {
    return this.currentSubdivisionIndex;
  }

  /**
   * Clear all trackers
   */
  clear(): void {
    this.subdivisionTrackers.clear();
    this.currentSubdivisionIndex = -1;
  }
}
