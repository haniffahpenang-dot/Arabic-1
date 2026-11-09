// Everything the learner builds up is kept in this browser's localStorage.
import { stripHarakat } from "./arabic.js";

const KEYS = {
  settings: "qat.settings",
  vocab: "qat.vocab",
  mistakes: "qat.mistakes",
  activity: "qat.activity",
  session: "qat.session",
};

const read = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

export const DEFAULT_SETTINGS = {
  voiceName: "",
  rate: 0.85,
  autoSpeak: true,
  handsFree: false,
  micLang: "ar-SA",
  teacherHarakat: "show", // "show" | "hide" (tap to reveal)
  showTranslation: false,
  explanationLanguage: "english",
  planMonth: 1,
  planStart: "",
};

export const settings = {
  get: () => ({ ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) }),
  set(patch) {
    const next = { ...settings.get(), ...patch };
    write(KEYS.settings, next);
    return next;
  },
};

export const vocab = {
  all: () => read(KEYS.vocab, []),
  /** Adds words not already saved (matched without harakat). Returns how many were new. */
  add(words, source) {
    const list = vocab.all();
    const known = new Set(list.map((w) => stripHarakat(w.word)));
    let added = 0;
    for (const w of words) {
      const key = stripHarakat(w.word);
      if (!key || known.has(key)) continue;
      known.add(key);
      list.unshift({ ...w, source, added: new Date().toISOString() });
      added++;
    }
    write(KEYS.vocab, list);
    return added;
  },
  remove(word) {
    write(KEYS.vocab, vocab.all().filter((w) => w.word !== word));
  },
  clear: () => write(KEYS.vocab, []),
};

export const mistakes = {
  all: () => read(KEYS.mistakes, []),
  add(items, source) {
    if (!items.length) return;
    const list = mistakes.all();
    const date = new Date().toISOString();
    for (const m of items) list.unshift({ ...m, source, date });
    write(KEYS.mistakes, list.slice(0, 1000));
  },
  clear: () => write(KEYS.mistakes, []),
};

/** Practice time per day, in seconds: { "2026-11-09": 1260, ... } */
export const activity = {
  all: () => read(KEYS.activity, {}),
  addSeconds(seconds) {
    if (seconds <= 0) return;
    const all = activity.all();
    const day = localDay();
    all[day] = (all[day] || 0) + Math.round(seconds);
    write(KEYS.activity, all);
  },
  /** Consecutive days with practice, ending today (or yesterday if not yet practised today). */
  streak() {
    const all = activity.all();
    let streak = 0;
    const d = new Date();
    if (!all[localDay(d)]) d.setDate(d.getDate() - 1);
    while (all[localDay(d)]) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  },
};

export const session = {
  get: () => read(KEYS.session, null),
  set: (value) => write(KEYS.session, value),
  clear: () => localStorage.removeItem(KEYS.session),
};

export function localDay(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Full backup of the learner's data as JSON text. */
export function exportAll() {
  return JSON.stringify(
    { settings: settings.get(), vocab: vocab.all(), mistakes: mistakes.all(), activity: activity.all() },
    null,
    2,
  );
}

export function importAll(text) {
  const data = JSON.parse(text);
  if (data.settings) write(KEYS.settings, data.settings);
  if (Array.isArray(data.vocab)) write(KEYS.vocab, data.vocab);
  if (Array.isArray(data.mistakes)) write(KEYS.mistakes, data.mistakes);
  if (data.activity && typeof data.activity === "object") write(KEYS.activity, data.activity);
}
