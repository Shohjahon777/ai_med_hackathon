import { ClassificationResult, SegmentationResult } from './types';

export function generateMockClassification(): ClassificationResult {
  let p = Array.from({ length: 12 }, () => Math.random() * 0.5 + 0.01);
  const winner = Math.floor(Math.random() * 12);
  p[winner] = 2 + Math.random() * 5;
  const total = p.reduce((a, b) => a + b, 0);
  p = p.map((v) => v / total);

  const probabilities: Record<string, number> = {};
  p.forEach((v, i) => { probabilities[String(i)] = v; });

  return {
    predicted_class: winner,
    confidence: p[winner],
    probabilities,
  };
}

export function generateMockSegmentation(): SegmentationResult {
  // Create a simple mock with placeholder base64 (1x1 transparent PNG)
  const emptyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  return {
    images: {
      mask: emptyPng,
      overlay: emptyPng,
      contour: emptyPng,
      heatmap: emptyPng,
    },
    metrics: {
      foreground_coverage_pct: 12.5 + Math.random() * 20,
      mean_confidence: 0.85 + Math.random() * 0.14,
      max_confidence: 0.95 + Math.random() * 0.05,
      min_confidence: 0.3 + Math.random() * 0.3,
      num_regions: 1 + Math.floor(Math.random() * 3),
      regions: [
        {
          id: 1,
          area_px: 1500 + Math.floor(Math.random() * 2000),
          area_pct: 10 + Math.random() * 15,
          centroid: [50 + Math.random() * 28, 50 + Math.random() * 28],
          mean_confidence: 0.9 + Math.random() * 0.09,
          bbox: [20, 20, 80, 80],
        },
      ],
      image_size: [128, 128],
    },
  };
}
