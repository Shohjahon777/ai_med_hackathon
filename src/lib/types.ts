export type AnalysisMode = 'classify' | 'segment' | 'both';
export type ViewMode = 'original' | 'mask' | 'overlay' | 'contour' | 'heat';

export interface ClassificationResult {
  predicted_class: number;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface SegmentationRegion {
  id: number;
  area_px: number;
  area_pct: number;
  centroid: [number, number];
  mean_confidence: number;
  bbox: [number, number, number, number];
}

export interface SegmentationResult {
  images: {
    mask: string;
    overlay: string;
    contour: string;
    heatmap: string;
  };
  metrics: {
    foreground_coverage_pct: number;
    mean_confidence: number;
    max_confidence: number;
    min_confidence: number;
    num_regions: number;
    regions: SegmentationRegion[];
    image_size: [number, number];
  };
}

export interface AnalysisResponse {
  classification?: ClassificationResult;
  segmentation?: SegmentationResult;
}

export interface FileInfo {
  name: string;
  width: number;
  height: number;
  size: number;
  format: string;
}

export interface HistoryEntry {
  id: string;
  thumb: string;
  name: string;
  task: AnalysisMode;
  time: string;
  cls: number | null;
  clsResult: ClassificationResult | null;
  segResult: SegmentationResult | null;
  isMock: boolean;
}

export interface LogEntry {
  time: string;
  message: string;
  type: '' | 'ok' | 'wr' | 'er';
}

export interface ToastData {
  id: string;
  type: 'err' | 'suc' | 'wrn';
  title: string;
  message: string;
}

export type PipelineStep = 'idle' | 'active' | 'done' | 'fail';
