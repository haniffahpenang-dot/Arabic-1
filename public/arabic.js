// Arabic text helpers (browser copy of src/arabic.js).
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** Remove all vowel marks and Quranic signs, leaving plain unvowelled text. */
export function stripHarakat(text) {
  return String(text ?? "")
    .replace(/ٱ/g, "ا")
    .replace(DIACRITICS, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** True if the text contains Arabic letters. */
export function hasArabic(text) {
  return /[؀-ۿ]/.test(text);
}
