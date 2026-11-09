// Helpers for Arabic text. Shared logic is duplicated in public/arabic.js for the browser.

// Harakat, Quranic annotation marks, superscript alef and tatweel.
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/** Remove all vowel marks and Quranic signs, leaving plain unvowelled text. */
export function stripHarakat(text) {
  return text
    .replace(/ٱ/g, "ا") // alef wasla -> plain alef
    .replace(DIACRITICS, "")
    .replace(/\s+/g, " ")
    .trim();
}
