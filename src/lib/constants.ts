export const CLASS_COLORS = [
  '#2563EB', '#DC2626', '#059669', '#D97706',
  '#7C3AED', '#DB2777', '#0891B2', '#EA580C',
  '#16A34A', '#9333EA', '#64748B', '#E11D48',
];

export const CLASS_NAMES: Record<number, string> = {
  0: 'Actinic Keratosis',
  1: 'Basal Cell Carcinoma',
  2: 'Dermatofibroma',
  3: 'Hemangioma / Pyogenic Granuloma',
  4: 'Melanoma',
  5: 'Melanocytic Nevus (benign)',
  6: 'Squamous Cell Carcinoma',
  7: 'Melanocytic Nevus (common mole)',
  8: 'Pyogenic Granuloma / Vascular Lesion',
  9: 'Actinic Keratosis / Bowen\'s Disease',
  10: 'Seborrheic Keratosis (pigmented)',
  11: 'Seborrheic Keratosis (non-pigmented)',
};

export const PIPELINE_STEPS = [
  { id: 1, label: 'Upload' },
  { id: 2, label: 'Validate' },
  { id: 3, label: 'Classify' },
  { id: 4, label: 'Segment' },
  { id: 5, label: 'Results' },
];

export const MODEL_INFO = {
  classification: {
    title: 'Classification',
    badge: 'LoRA Fine-tuned',
    rows: [
      ['Base Model', 'DINOv2-ViT-L'],
      ['Fine-tuning', 'LoRA (Low-Rank Adaptation)'],
      ['Input Size', '224 \u00d7 224 \u00d7 3'],
      ['Classes', '12 (labels 0\u201311)'],
      ['Ensemble', '5-fold cross-validation'],
      ['Loss Function', 'Focal Loss (\u03b3=2)'],
      ['Scheduler', 'CosineAnnealing'],
    ],
  },
  segmentation: {
    title: 'Segmentation',
    badge: 'nnUNet',
    rows: [
      ['Architecture', 'nnUNet 2D'],
      ['Configuration', 'Auto-configured pipeline'],
      ['Input Size', 'Dynamic (auto-adapted)'],
      ['Output', 'Binary mask (sigmoid)'],
      ['Post-processing', 'Connected component analysis'],
      ['Inference', 'Fold 0'],
    ],
  },
};

export const PREPROCESS_STEPS = [
  { label: 'Resize', desc: 'Bilinear interpolation to model input size, preserving aspect ratio with padding' },
  { label: 'Normalize', desc: 'Scale [0,1] then subtract ImageNet mean/std \u2014 stabilizes training convergence' },
  { label: 'Stain Normalization', desc: 'Macenko method \u2014 corrects H&E staining variation across scanners/labs' },
  { label: 'Denoise', desc: 'Gaussian blur (\u03c3=0.5) \u2014 suppresses scanning artifacts without losing structure' },
];
