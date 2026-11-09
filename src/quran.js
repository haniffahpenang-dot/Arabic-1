// Loads the Quran text (Uthmani script, with English translation) from data/quran_en.json.
// Source: the quran-json package (https://github.com/risan/quran-json), text from
// The Noble Qur'an Encyclopedia (quranenc.com). See data/QURAN_DATA_LICENSE.txt.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stripHarakat } from "./arabic.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(path.join(here, "..", "data", "quran_en.json"), "utf8"));

export const MAX_PASSAGE_AYAHS = 40;

/** Surah list without verse text, for the UI. */
export const surahs = raw.map((s) => ({
  id: s.id,
  name: s.name,
  transliteration: s.transliteration,
  translation: s.translation,
  type: s.type,
  totalVerses: s.total_verses,
}));

/**
 * Returns a passage, or throws an Error with a user-facing message.
 * Each ayah has the vowelled text, the unvowelled text and an English translation.
 */
export function getPassage(surahId, from, to) {
  const surah = raw[surahId - 1];
  if (!surah) throw new Error(`Surah ${surahId} does not exist (choose 1–114).`);
  const total = surah.total_verses;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > total || from > to) {
    throw new Error(`Surah ${surah.transliteration} has ayahs 1–${total}.`);
  }
  if (to - from + 1 > MAX_PASSAGE_AYAHS) {
    throw new Error(`Please choose at most ${MAX_PASSAGE_AYAHS} ayahs per lesson.`);
  }
  return {
    surah: { id: surah.id, name: surah.name, transliteration: surah.transliteration, translation: surah.translation },
    from,
    to,
    ayahs: surah.verses.slice(from - 1, to).map((v) => ({
      number: v.id,
      text: v.text,
      plain: stripHarakat(v.text),
      translation: v.translation,
    })),
  };
}
