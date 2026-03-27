export interface ValidationResult {
  valid: boolean;
  error?: { title: string; message: string };
  warning?: { title: string; message: string };
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/bmp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_SIZE = 100; // bytes
const MAX_DIM = 10000;
const MIN_DIM = 16;

export function validateFile(file: File): ValidationResult {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: {
        title: 'Invalid File Type',
        message: `Expected PNG, JPG or BMP image. Received "${file.type || 'unknown'}". Please choose a valid medical image file.`,
      },
    };
  }
  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: {
        title: 'File Too Large',
        message: `Maximum 10 MB allowed. Your file is ${(file.size / 1048576).toFixed(1)} MB. Try resizing or compressing.`,
      },
    };
  }
  if (file.size < MIN_SIZE) {
    return {
      valid: false,
      error: {
        title: 'Corrupted File',
        message: 'File is under 100 bytes — likely empty or damaged. Please try a different image.',
      },
    };
  }
  return { valid: true };
}

export function validateImageDimensions(
  width: number,
  height: number
): ValidationResult {
  if (width < MIN_DIM || height < MIN_DIM) {
    return {
      valid: false,
      error: {
        title: 'Image Too Small',
        message: `${width}×${height} is below minimum ${MIN_DIM}×${MIN_DIM}px.`,
      },
    };
  }
  if (width > MAX_DIM || height > MAX_DIM) {
    return {
      valid: false,
      error: {
        title: 'Image Too Large',
        message: `${width}×${height} exceeds ${MAX_DIM}px limit. Please resize.`,
      },
    };
  }

  const result: ValidationResult = { valid: true };
  const ar = width / height;
  if (ar > 4 || ar < 0.25) {
    result.warning = {
      title: 'Unusual Aspect Ratio',
      message: `${ar.toFixed(1)}:1 ratio may affect results. Square images are optimal.`,
    };
  } else if (width < 64 || height < 64) {
    result.warning = {
      title: 'Low Resolution',
      message: `${width}×${height} is very low resolution — accuracy may decrease.`,
    };
  }
  return result;
}

export function validateClassificationResult(probabilities: number[], predicted_class: number): boolean {
  if (!Array.isArray(probabilities) || probabilities.length !== 12) return false;
  if (predicted_class < 0 || predicted_class > 11) return false;
  return true;
}

export function fmtBytes(b: number): string {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
