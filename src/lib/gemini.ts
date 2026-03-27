const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

export interface GeminiValidation {
  valid: boolean;
  reason: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function validateWithGemini(file: File): Promise<GeminiValidation> {
  if (!GEMINI_API_KEY) {
    return { valid: true, reason: 'Gemini API key not configured, skipping validation.' };
  }

  const base64 = await fileToBase64(file);
  const mimeType = file.type || 'image/jpeg';

  const body = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: `Is this a medical or clinical image (skin lesion, dermoscopy, histopathology, biopsy, microscopy)? Reply ONLY with JSON, no markdown: {"valid":true,"reason":"..."} or {"valid":false,"reason":"..."}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 80,
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn('Gemini API error:', res.status);
      return { valid: true, reason: 'Gemini validation unavailable, proceeding.' };
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        valid: !!parsed.valid,
        reason: parsed.reason || (parsed.valid ? 'Valid medical image.' : 'Not a medical image.'),
      };
    }

    return { valid: true, reason: 'Could not parse response, proceeding.' };
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return { valid: true, reason: 'Gemini validation timed out, proceeding.' };
    }
    console.warn('Gemini validation error:', e);
    return { valid: true, reason: 'Gemini validation failed, proceeding.' };
  }
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}
