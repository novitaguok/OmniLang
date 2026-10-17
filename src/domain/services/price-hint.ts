/**
 * Domain service: extracts the merchant's price from a free-text product
 * note written in colloquial JAPAC style.
 *
 * Recognized shapes (deterministic, ordered by confidence):
 *   1. Suffix multipliers      "75rb", "75 rb", "75ribu", "5k"      -> ×1000
 *   2. Grouped thousands       "Rp 150.000", "75,000", "1.250.000" -> literal
 *   3. Plain >= 4-digit number "Rp 75000", "50000"                  -> literal
 *
 * Bare small numbers ("5 pcs", "buy 3") intentionally do NOT parse as
 * prices — quantity chatter must never be mistaken for a unit price.
 * Returns null when no price can be extracted.
 */
export function parsePriceHint(text: string): number | null {
  if (!text) {
    return null;
  }

  const normalized = text.toLowerCase().replace(/rp\s*/g, ' ');

  const suffixMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|k)\b/);
  if (suffixMatch?.[1]) {
    const base = Number.parseFloat(suffixMatch[1].replace(',', '.'));
    if (Number.isFinite(base) && base > 0) {
      return Math.round(base * 1000);
    }
  }

  const groupedMatch = normalized.match(/(\d{1,3}(?:[.,]\d{3})+)(?!\d)/);
  if (groupedMatch?.[1]) {
    const value = Number.parseInt(groupedMatch[1].replace(/[.,]/g, ''), 10);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  const plainMatch = normalized.match(/\d{4,}(?!\d)/);
  if (plainMatch?.[0]) {
    const value = Number.parseInt(plainMatch[0], 10);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}
