/**
 * OCR Service — Parses receipt images to extract amount and description.
 *
 * Uses the OCR.space free API. Replace the API key with your own for production.
 * Get a free key at https://ocr.space/ocrapi/freekey
 */

import { ExpenseItem } from "../types";

const OCR_API_URL = "https://api.ocr.space/parse/image";
const OCR_API_KEY = "K85403530488957"; // Free tier demo key

export interface OcrResult {
  amount: number | null;
  description: string;
  rawText: string;
  confidence: number;
  items: ExpenseItem[];
  detectedCurrency?: string;
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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(OCR_API_URL, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

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
        items: [],
      };
    }

    const rawText: string = data.ParsedResults[0].ParsedText ?? "";
    const confidence: number =
      data.ParsedResults[0].TextOverlay?.Lines?.[0]?.Words?.[0]?.Confidence ??
      0;

    const amount = extractAmount(rawText);
    const description = extractDescription(rawText);
    const items = extractLineItems(rawText);
    const detectedCurrency = detectCurrency(rawText);

    return {
      amount,
      description,
      rawText,
      confidence,
      items,
      detectedCurrency,
    };
  } catch (error) {
    console.warn("[OCR] parseReceipt error:", error);
    return {
      amount: null,
      description: "",
      rawText: "",
      confidence: 0,
      items: [],
    };
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

/**
 * Extract individual line items from OCR text.
 * Looks for patterns like "Item Name    $12.99" or "2x Item Name  24.00"
 */
function extractLineItems(text: string): ExpenseItem[] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ExpenseItem[] = [];
  let itemId = 1;

  // Skip lines containing totals, taxes, subtotals, etc.
  const skipKeywords =
    /\b(total|subtotal|sub-total|tax|vat|gst|tip|gratuity|discount|change|cash|card|visa|mastercard|payment|balance|due|tender|receipt|invoice|date|time|thank|welcome)\b/i;

  // Pattern: "quantity x name ... price" or "name ... price"
  const itemPatterns = [
    // "2 x Item Name    12.99" or "2x Item   12.99"
    /^(\d+)\s*[xX×]\s+(.+?)\s{2,}[₹$€£¥]?\s*([\d,]+\.?\d*)\s*$/,
    // "Item Name    12.99" (name followed by spaces then price)
    /^([A-Za-z][\w\s&'-]{1,40}?)\s{2,}[₹$€£¥]?\s*([\d,]+\.\d{2})\s*$/,
    // "Item Name .... 12.99" (with dots or dashes as separator)
    /^([A-Za-z][\w\s&'-]{1,40}?)\s*[.·\-]{2,}\s*[₹$€£¥]?\s*([\d,]+\.\d{2})\s*$/,
  ];

  for (const line of lines) {
    if (skipKeywords.test(line)) continue;

    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match) {
        if (match.length === 4) {
          // quantity x name price
          const qty = parseInt(match[1], 10);
          const name = match[2].trim();
          const price = parseFloat(match[3].replace(/,/g, ""));
          if (!isNaN(price) && price > 0 && name.length > 1) {
            items.push({
              id: `item_${itemId++}`,
              name,
              price,
              quantity: qty,
            });
          }
        } else if (match.length === 3) {
          // name price
          const name = match[1].trim();
          const price = parseFloat(match[2].replace(/,/g, ""));
          if (!isNaN(price) && price > 0 && name.length > 1) {
            items.push({
              id: `item_${itemId++}`,
              name,
              price,
              quantity: 1,
            });
          }
        }
        break;
      }
    }
  }

  return items;
}

/**
 * Detect currency symbol from OCR text.
 */
function detectCurrency(text: string): string | undefined {
  const currencyPatterns: [RegExp, string][] = [
    [/₹/, "INR"],
    [/\$/, "USD"],
    [/€/, "EUR"],
    [/£/, "GBP"],
    [/¥/, "JPY"],
    [/฿/, "THB"],
    [/د\.إ/, "AED"],
    [/S\$/, "SGD"],
    [/A\$/, "AUD"],
    [/C\$/, "CAD"],
  ];

  for (const [pattern, code] of currencyPatterns) {
    if (pattern.test(text)) return code;
  }
  return undefined;
}
