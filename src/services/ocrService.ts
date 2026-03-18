/**
 * OCR Service — Parses receipt images to extract amount and description.
 *
 * Uses the OCR.space free API. Replace the API key with your own for production.
 * Get a free key at https://ocr.space/ocrapi/freekey
 */

const OCR_API_URL = "https://api.ocr.space/parse/image";
const OCR_API_KEY = "K85403530488957"; // Free tier demo key

export interface OcrResult {
  amount: number | null;
  description: string;
  rawText: string;
  confidence: number;
}

/**
 * Send a receipt image (base64 or URI) to OCR and extract amount + description.
 */
export async function parseReceipt(imageBase64: string): Promise<OcrResult> {
  try {
    const formData = new FormData();

    // If it's a data URI, extract the base64 portion
    if (imageBase64.startsWith("data:")) {
      formData.append("base64Image", imageBase64);
    } else {
      // It's a file URI — for expo-camera results, upload as file
      formData.append("file", {
        uri: imageBase64,
        name: "receipt.jpg",
        type: "image/jpeg",
      } as any);
    }

    formData.append("apikey", OCR_API_KEY);
    formData.append("language", "eng");
    formData.append("isOverlayRequired", "false");
    formData.append("detectOrientation", "true");
    formData.append("scale", "true");
    formData.append("OCREngine", "2");

    const response = await fetch(OCR_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR API returned ${response.status}`);
    }

    const data = await response.json();

    if (
      data.IsErroredOnProcessing ||
      !data.ParsedResults ||
      data.ParsedResults.length === 0
    ) {
      return {
        amount: null,
        description: "",
        rawText: data.ErrorMessage?.[0] ?? "",
        confidence: 0,
      };
    }

    const rawText: string = data.ParsedResults[0].ParsedText ?? "";
    const confidence: number =
      data.ParsedResults[0].TextOverlay?.Lines?.[0]?.Words?.[0]?.Confidence ??
      0;

    const amount = extractAmount(rawText);
    const description = extractDescription(rawText);

    return { amount, description, rawText, confidence };
  } catch (error) {
    console.warn("[OCR] parseReceipt error:", error);
    return { amount: null, description: "", rawText: "", confidence: 0 };
  }
}

/**
 * Extract the most likely total amount from OCR text.
 * Looks for keywords like "total", "grand total", "amount due", etc.
 */
function extractAmount(text: string): number | null {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Priority patterns: look for "total" lines first
  const totalPatterns = [
    /(?:grand\s*total|total\s*amount|amount\s*due|net\s*total|total\s*payable|balance\s*due)\s*[:\-]?\s*[₹$€£¥]?\s*([\d,]+\.?\d*)/i,
    /(?:total)\s*[:\-]?\s*[₹$€£¥]?\s*([\d,]+\.?\d*)/i,
  ];

  for (const pattern of totalPatterns) {
    for (const line of lines) {
      const match = line.match(pattern);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(val) && val > 0) return val;
      }
    }
  }

  // Fallback: find the largest currency amount in the text
  const amountRegex = /[₹$€£¥]?\s*([\d,]+\.\d{2})/g;
  let largest = 0;
  let m;
  while ((m = amountRegex.exec(text)) !== null) {
    const val = parseFloat(m[1].replace(/,/g, ""));
    if (val > largest) largest = val;
  }

  return largest > 0 ? largest : null;
}

/**
 * Extract a reasonable description from OCR text.
 * Takes the first meaningful line as the merchant / store name.
 */
function extractDescription(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 60);

  // Skip lines that look purely numeric or date-like
  const skipPatterns = /^[\d\s\-\/.:,]+$|^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;

  for (const line of lines) {
    if (!skipPatterns.test(line)) {
      // Return first meaningful line (likely merchant name)
      return line.substring(0, 50);
    }
  }

  return "";
}
