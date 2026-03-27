import { ClassificationResult, SegmentationResult } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function postFile(endpoint: string, file: File, timeoutMs = 60000): Promise<Response> {
  const formData = new FormData();
  formData.append('file', file);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail = `Server error (${res.status})`;
      try {
        const body = await res.json();
        if (body.detail) detail = body.detail;
      } catch { /* ignore parse errors */ }

      if (res.status === 400) detail = 'Invalid image file. Please use PNG, JPG, or JPEG.';
      if (res.status === 413) detail = 'Image file exceeds server size limit.';
      if (res.status === 429) detail = 'Too many requests. Please wait a moment.';

      throw new ApiError(res.status, detail);
    }

    return res;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new ApiError(408, 'Analysis timed out. The server may be overloaded. Try again.');
    }
    if (e instanceof TypeError) {
      throw new ApiError(0, 'Cannot connect to analysis server. Check your network connection.');
    }
    throw new ApiError(500, `Unexpected error: ${(e as Error).message}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function classifyImage(file: File): Promise<ClassificationResult> {
  const res = await postFile('/classify', file);
  return await res.json();
}

export async function segmentImage(file: File): Promise<SegmentationResult> {
  const res = await postFile('/segment', file);
  return await res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function isApiConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_API_URL;
}
