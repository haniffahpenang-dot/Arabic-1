import { stripHarakat, hasArabic } from "./arabic.js";
import * as speech from "./speech.js";
import { settings, vocab, mistakes, activity, session, localDay, exportAll, importAll } from "./storage.js";

const $ = (id) => document.getElementById(id);

const MODE_NAMES = {
  conversation: "Conversation",
  passage: "Passage study",
  roots: "Root drill",
  haraka: "Reading without haraka",
  grammar: "Grammar in context",
};
const CATEGORY_NAMES = {
  vocabulary: "Vocabulary", grammar: "Grammar", agreement: "Agreement", verb_form: "Verb form",
  case_ending: "Case ending", word_order: "Word order", preposition: "Preposition", spelling: "Spelling", other: "Other",
};
const START_MESSAGE = "[start] The learner has opened this lesson. Greet them briefly in Arabic and begin.";

let meta = null;          // { surahs, curriculum, model, mock }
let lesson = null;        // current lesson settings
let passage = null;       // current passage (with ayah text), if any
let history = [];         // messages sent to the API
let busy = false;
let lastActivity = 0;

// ---------------------------------------------------------------- helpers

/** Creates an element. props: attributes/properties; children: nodes or strings. */
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else if (key in node && key !== "lang" && key !== "dir") node[key] = value;
    else node.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : String(child));
  }
  return node;
}

function setStatus(text, kind = "") {
  const status = $("status");
  status.textContent = text;
  status.className = "status" + (kind ? " " + kind : "");
}

function markActivity() {
  const now = Date.now();
  if (lastActivity) activity.addSeconds(Math.min((now - lastActivity) / 1000, 120));
  lastActivity = now;
}

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = el("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csv(rows) {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** Direction for explanations and tips: they are in English unless the lesson asks for Arabic. */
function textDir() {
  return lesson?.explanationLanguage === "arabic" ? "rtl" : "ltr";
}

function scrollChat() {
  const chat = $("chat");
  chat.scrollTop = chat.scrollHeight;
}

// ---------------------------------------------------------------- tabs

function showTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== `tab-${name}`));
  if (name === "notebook") renderNotebook();
  if (name === "mistakes") renderMistakes();
  if (name === "plan") renderPlan();
  if (name === "progress") renderProgress();
}

// ---------------------------------------------------------------- lesson setup

function updateModeFields() {
  const mode = $("mode").value;
  const needsPassage = mode === "passage";
  $("topicField").hidden = mode !== "conversation";
  $("passageFields").hidden = mode === "conversation";
  $("usePassage").checked = needsPassage ? true : $("usePassage").checked;
  $("usePassage").disabled = needsPassage;
  $("usePassage").closest("label").hidden = needsPassage;
}

function fillSurahSelect() {
  const select = $("surah");
  select.replaceChildren(
    ...meta.surahs.map((s) => el("option", { value: s.id }, `${s.id}. ${s.transliteration} — ${s.name} (${s.totalVerses})`)),
  );
}

function setPassageInputs(surah, from, to) {
  $("surah").value = surah;
  const total = meta.surahs[surah - 1].totalVerses;
  $("ayahFrom").max = total;
  $("ayahTo").max = total;
  $("ayahFrom").value = from;
  $("ayahTo").value = to;
  $("passageHint").textContent = `Surah ${meta.surahs[surah - 1].transliteration} has ${total} ayahs. Up to 40 per lesson.`;
}

function fillPlanMonthPick() {
  const select = $("planMonthPick");
  select.replaceChildren(
    ...meta.curriculum.map((m) => el("option", { value: m.month }, `Month ${m.month}: ${m.title}`)),
  );
  select.value = settings.get().planMonth;
  renderPlanChips();
}

function renderPlanChips() {
  const month = meta.curriculum.find((m) => m.month === Number($("planMonthPick").value));
  $("planItems").replaceChildren(
    ...month.items.map((item) =>
      el("button", {
        class: "chip",
        type: "button",
        onclick: (e) => {
          setPassageInputs(item.surah, item.from, item.to);
          $("planItems").querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
          e.currentTarget.classList.add("active");
        },
      }, item.label),
    ),
  );
}

function readLessonForm() {
  const mode = $("mode").value;
  const result = {
    mode,
    topic: mode === "conversation" ? $("topic").value.trim() : "",
    explanationLanguage: $("explanationLanguage").value,
  };
  if (mode !== "conversation" && $("usePassage").checked) {
    result.surah = Number($("surah").value);
    result.from = Number($("ayahFrom").value);
    result.to = Number($("ayahTo").value);
  }
  return result;
}

async function fetchPassage(l) {
  const res = await fetch(`/api/passage?surah=${l.surah}&from=${l.from}&to=${l.to}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load the passage.");
  return data;
}

function lessonLabel(l) {
  let label = MODE_NAMES[l.mode];
  if (l.surah) label += ` · ${meta.surahs[l.surah - 1].transliteration} ${l.from}–${l.to}`;
  if (l.topic) label += ` · ${l.topic}`;
  return label;
}

/** Starts a new lesson from the form. If firstText is given it becomes the learner's first message. */
async function startLesson(firstText = null, via = "typed") {
  if (busy) return;
  const next = readLessonForm();
  try {
    passage = next.surah ? await fetchPassage(next) : null;
  } catch (err) {
    setStatus(err.message, "error");
    return;
  }
  speech.stopSpeaking();
  lesson = next;
  history = [{ role: "user", content: firstText ? `[${via}] ${firstText}` : START_MESSAGE }];
  settings.set({ explanationLanguage: lesson.explanationLanguage });
  $("chat").replaceChildren();
  if (firstText) renderUserMessage(firstText, via);
  showLessonChrome();
  lastActivity = Date.now();
  await requestReply();
}

function showLessonChrome() {
  $("lessonBar").hidden = false;
  $("lessonLabel").textContent = lessonLabel(lesson);
  document.querySelector(".lesson-view").classList.add("in-lesson");
  renderPassage();
}

// ---------------------------------------------------------------- passage panel

function renderPassage() {
  const panel = $("passagePanel");
  if (!passage) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  const s = passage.surah;
  $("passageTitle").replaceChildren(`${s.transliteration} `, el("bdi", { lang: "ar" }, s.name), ` · ayahs ${passage.from}–${passage.to}`);
  $("listenLink").href = `https://quran.com/${s.id}/${passage.from}-${passage.to}`;
  // Reading-without-haraka lessons start with the harakat hidden.
  if (lesson?.mode === "haraka") $("passageHarakat").checked = false;
  drawAyahs();
}

function drawAyahs() {
  if (!passage) return;
  const withHarakat = $("passageHarakat").checked;
  const withTranslation = $("passageTranslation").checked;
  $("passageBody").replaceChildren(
    ...passage.ayahs.flatMap((a) => [
      el("p", { class: "ayah" }, withHarakat ? a.text : a.plain, el("span", { class: "ayah-num" }, a.number)),
      withTranslation ? el("p", { class: "ayah-en", dir: "ltr", lang: "en" }, `${a.number}. ${a.translation}`) : null,
    ].filter(Boolean)),
  );
}

// ---------------------------------------------------------------- chat rendering

function renderUserMessage(text, via) {
  $("chatEmpty")?.remove();
  const isArabic = hasArabic(text);
  $("chat").append(
    el("div", { class: "msg me" },
      el("div", { class: "bubble" },
        el("div", { class: isArabic ? "ar-text" : "", dir: "auto" }, text),
        el("span", { class: "via" }, via === "spoken" ? "🎙 spoken" : "⌨ typed"),
      ),
    ),
  );
  scrollChat();
}

/** An Arabic text node that can switch between vowelled and unvowelled. */
function harakatText(text, className, startHidden) {
  const node = el("div", { class: className, lang: "ar", dir: "rtl" });
  node.dataset.full = text;
  node.dataset.shown = startHidden ? "plain" : "full";
  const draw = () => {
    const plain = node.dataset.shown === "plain";
    node.textContent = plain ? stripHarakat(text) : text;
    node.classList.toggle("concealed", plain);
    node.title = plain ? "Tap to show harakat" : "";
  };
  node.toggle = () => {
    node.dataset.shown = node.dataset.shown === "plain" ? "full" : "plain";
    draw();
  };
  node.addEventListener("click", () => {
    if (node.dataset.shown === "plain") node.toggle();
  });
  draw();
  return node;
}

function renderTeacherMessage(reply) {
  $("chatEmpty")?.remove();
  const prefs = settings.get();
  const arText = harakatText(reply.reply_arabic, "ar-text", prefs.teacherHarakat === "hide");
  const enText = el("div", { class: "en-text", hidden: !prefs.showTranslation }, reply.reply_english);

  const parts = [
    el("div", { class: "bubble" }, arText, enText),
    el("div", { class: "msg-tools" },
      el("button", { type: "button", onclick: () => speakReply(reply.reply_arabic) }, "▶ Play"),
      el("button", { type: "button", onclick: () => arText.toggle() }, "Harakat"),
      el("button", { type: "button", onclick: () => (enText.hidden = !enText.hidden) }, "English"),
    ),
  ];

  if (reply.corrections?.length) {
    parts.push(
      el("div", { class: "correction" },
        el("h4", {}, reply.corrections.length === 1 ? "Correction" : `${reply.corrections.length} corrections`),
        ...reply.corrections.map((c) =>
          el("div", { class: "pair" },
            el("div", { class: "wrong", dir: "rtl" }, c.original),
            el("div", { class: "right", dir: "rtl" }, c.corrected),
            el("div", { class: "why", dir: textDir() }, c.explanation, " ", el("span", { class: "cat" }, CATEGORY_NAMES[c.category] || c.category)),
          ),
        ),
      ),
    );
  }

  if (reply.exercise_text) {
    parts.push(
      el("div", { class: "exercise" },
        el("h4", {}, "Your exercise"),
        el("div", { class: "ar-text", lang: "ar", dir: "rtl" }, reply.exercise_text),
      ),
    );
  }

  if (reply.vocabulary?.length) {
    parts.push(
      el("div", { class: "vocab-cards" },
        ...reply.vocabulary.map((v) =>
          el("div", { class: "vocab-card", dir: "ltr" },
            el("bdi", { class: "w", lang: "ar" }, v.word),
            el("bdi", { class: "r", lang: "ar" }, v.root),
            el("span", { class: "m" }, v.meaning),
            v.quran_example ? el("div", { class: "ex", lang: "ar", dir: "rtl" }, `﴿${v.quran_example}﴾ `, v.quran_reference) : null,
          ),
        ),
      ),
    );
  }

  if (reply.tip) parts.push(el("div", { class: "tip", dir: textDir() }, "💡 " + reply.tip));

  $("chat").append(el("div", { class: "msg teacher" }, ...parts));
  scrollChat();
}

function renderHistory() {
  $("chat").replaceChildren();
  for (const m of history) {
    if (m.role === "user") {
      if (m.content.startsWith("[start]")) continue;
      const match = m.content.match(/^\[(spoken|typed)\] ([\s\S]*)$/);
      renderUserMessage(match ? match[2] : m.content, match ? match[1] : "typed");
    } else {
      try {
        renderTeacherMessage(JSON.parse(m.content));
      } catch {
        /* skip unreadable entries */
      }
    }
  }
}

function showTyping(on) {
  $("typing")?.remove();
  if (on) {
    $("chat").append(el("div", { class: "msg teacher", id: "typing" }, el("div", { class: "typing" }, "The teacher is thinking")));
    scrollChat();
  }
}

function showRetry(message) {
  $("chat").append(
    el("div", { class: "msg teacher", id: "retryBox" },
      el("div", { class: "correction" }, message, " ",
        el("button", { type: "button", class: "ghost small", onclick: () => { $("retryBox")?.remove(); requestReply(); } }, "Try again"),
      ),
    ),
  );
  scrollChat();
}

// ---------------------------------------------------------------- talking to the teacher

async function requestReply() {
  busy = true;
  $("sendBtn").disabled = true;
  setStatus("");
  showTyping(true);
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lesson, messages: history }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Server error (${res.status}).`);
    showTyping(false);
    history.push({ role: "assistant", content: data.raw });
    session.set({ lesson, history });
    renderTeacherMessage(data.reply);

    const lastUser = history.at(-2)?.content || "";
    const source = lessonLabel(lesson);
    mistakes.add(data.reply.corrections || [], source);
    vocab.add(data.reply.vocabulary || [], source);
    if (!lastUser.startsWith("[start]")) markActivity();

    busy = false;
    $("sendBtn").disabled = false;
    await afterReply(data.reply);
  } catch (err) {
    showTyping(false);
    busy = false;
    $("sendBtn").disabled = false;
    showRetry(err.message);
  }
}

async function afterReply(reply) {
  const prefs = settings.get();
  if (prefs.autoSpeak) await speakReply(reply.reply_arabic);
  if ($("handsFree").checked && !busy && !speech.isListening()) listen();
}

async function speakReply(text) {
  const prefs = settings.get();
  setStatus("🔊 The teacher is speaking…");
  await speech.speak(text, { voiceName: prefs.voiceName, rate: prefs.rate });
  if ($("status").textContent.startsWith("🔊")) setStatus("");
}

async function sendUser(text, via) {
  text = text.trim();
  if (!text || busy) return;
  $("input").value = "";
  speech.stopSpeaking();
  if (!lesson) {
    await startLesson(text, via);
    return;
  }
  $("retryBox")?.remove();
  const content = `[${via}] ${text}`;
  // After a failed request the last message is still the learner's: merge instead of sending two in a row.
  const last = history.at(-1);
  if (last?.role === "user") {
    last.content = last.content.startsWith("[start]") ? content : `${last.content}\n${content}`;
  } else {
    history.push({ role: "user", content });
  }
  markActivity();
  renderUserMessage(text, via);
  session.set({ lesson, history });
  await requestReply();
}

// ---------------------------------------------------------------- microphone

function listen() {
  if (speech.isListening()) {
    speech.stopListening();
    return;
  }
  speech.stopSpeaking();
  const mic = $("micBtn");
  mic.classList.add("listening");
  setStatus("Listening… speak now", "");
  speech.startListening($("micLang").value, {
    onInterim: (text) => setStatus(text, "live"),
    onFinal: (text) => sendUser(text, "spoken"),
    onError: (message) => setStatus(message, "error"),
    onEnd: () => {
      mic.classList.remove("listening");
      if ($("status").textContent === "Listening… speak now") setStatus("");
    },
  });
}

// ---------------------------------------------------------------- notebook

function renderNotebook() {
  const query = stripHarakat($("vocabSearch").value.trim().toLowerCase());
  const all = vocab.all();
  const words = query
    ? all.filter((w) => [w.word, w.root, w.meaning].some((f) => stripHarakat(f || "").toLowerCase().includes(query)))
    : all;
  $("vocabCount").textContent = `(${all.length})`;
  const tbody = $("vocabTable").querySelector("tbody");
  tbody.replaceChildren(
    ...words.map((w) =>
      el("tr", {},
        el("td", { class: "w", lang: "ar" }, w.word),
        el("td", { class: "r", lang: "ar" }, w.root),
        el("td", {}, w.meaning),
        el("td", {},
          w.quran_example ? el("div", { class: "ex", lang: "ar" }, w.quran_example) : "",
          w.quran_reference ? el("div", { class: "ref" }, w.quran_reference) : "",
        ),
        el("td", {}, el("button", { class: "ghost small", type: "button", title: "Remove", onclick: () => { vocab.remove(w.word); renderNotebook(); } }, "✕")),
      ),
    ),
  );
  if (!words.length) tbody.append(el("tr", {}, el("td", { colSpan: 5, class: "hint" }, all.length ? "No matches." : "No words yet. They appear here as the teacher teaches you.")));
}

function exportAnki() {
  const rows = [["Front", "Back", "Root", "Example"]];
  for (const w of vocab.all()) {
    rows.push([w.word, w.meaning, w.root, [w.quran_example, w.quran_reference].filter(Boolean).join(" — ")]);
  }
  download(`quranic-vocab-${localDay()}.csv`, csv(rows), "text/csv;charset=utf-8");
}

// ---------------------------------------------------------------- mistakes

function renderMistakes() {
  const all = mistakes.all();
  $("mistakeCount").textContent = `(${all.length})`;
  const counts = {};
  for (const m of all) counts[m.category] = (counts[m.category] || 0) + 1;
  $("mistakeStats").replaceChildren(
    ...Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, n]) => el("span", { class: "chip" }, `${CATEGORY_NAMES[cat] || cat}: ${n}`)),
  );
  $("mistakeList").replaceChildren(
    ...all.slice(0, 300).map((m) =>
      el("div", { class: "mistake-item" },
        el("div", { class: "meta" }, `${new Date(m.date).toLocaleDateString()} · ${CATEGORY_NAMES[m.category] || m.category} · ${m.source || ""}`),
        el("div", { class: "wrong", dir: "rtl" }, m.original),
        el("div", { class: "right", dir: "rtl" }, m.corrected),
        el("div", { dir: hasArabic(m.explanation.slice(0, 12)) ? "rtl" : "ltr" }, m.explanation),
      ),
    ),
  );
  if (!all.length) $("mistakeList").append(el("p", { class: "hint" }, "No mistakes logged yet."));
}

function exportMistakes() {
  const rows = [["Date", "Category", "What I said", "Correct", "Explanation", "Lesson"]];
  for (const m of mistakes.all()) rows.push([m.date.slice(0, 10), m.category, m.original, m.corrected, m.explanation, m.source]);
  download(`mistakes-${localDay()}.csv`, csv(rows), "text/csv;charset=utf-8");
}

// ---------------------------------------------------------------- plan

function renderPlan() {
  const current = settings.get().planMonth;
  $("currentMonth").replaceChildren(...meta.curriculum.map((m) => el("option", { value: m.month }, `Month ${m.month}`)));
  $("currentMonth").value = current;
  $("planMonths").replaceChildren(
    ...meta.curriculum.map((m) =>
      el("div", { class: "month" + (m.month === current ? " current" : "") },
        el("div", { class: "label" }, m.month === 1 ? "Month 1 · initial program" : `Month ${m.month}`),
        el("h3", {}, m.title),
        el("p", {}, m.focus),
        el("p", {}, el("b", {}, "Haraka: "), m.haraka),
        el("div", { class: "chips" },
          ...m.items.map((item) =>
            el("button", { class: "chip", type: "button", onclick: () => openPlanItem(m.month, item) }, item.label),
          ),
        ),
      ),
    ),
  );
}

function openPlanItem(month, item) {
  showTab("lesson");
  $("mode").value = "passage";
  updateModeFields();
  $("planMonthPick").value = month;
  renderPlanChips();
  setPassageInputs(item.surah, item.from, item.to);
  document.querySelector(".lesson-view").classList.remove("in-lesson");
  $("setupPanel").scrollIntoView({ behavior: "smooth" });
}

// ---------------------------------------------------------------- progress

function renderProgress() {
  const all = activity.all();
  const today = all[localDay()] || 0;
  const total = Object.values(all).reduce((a, b) => a + b, 0);
  $("statToday").textContent = Math.round(today / 60);
  $("statStreak").textContent = activity.streak();
  $("statTotal").textContent = (total / 3600).toFixed(1);
  $("statWords").textContent = vocab.all().length;

  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: localDay(d), label: d.toLocaleDateString(undefined, { weekday: "narrow" }), minutes: Math.round((all[localDay(d)] || 0) / 60) });
  }
  const max = Math.max(30, ...days.map((d) => d.minutes));
  $("bars").replaceChildren(
    ...days.map((d) =>
      el("div", { class: "bar", title: `${d.key}: ${d.minutes} min` },
        el("span", {}, d.minutes || ""),
        el("div", { class: "fill" + (d.minutes ? "" : " zero"), style: `height:${(d.minutes / max) * 100}%` }),
        el("span", {}, d.label),
      ),
    ),
  );
}

// ---------------------------------------------------------------- settings

async function setupSettings() {
  const prefs = settings.get();
  $("rate").value = prefs.rate;
  $("rateValue").textContent = `${prefs.rate}×`;
  $("autoSpeak").checked = prefs.autoSpeak;
  $("teacherHarakat").value = prefs.teacherHarakat;
  $("showTranslation").checked = prefs.showTranslation;
  $("handsFree").checked = prefs.handsFree;
  $("micLang").value = prefs.micLang;
  $("explanationLanguage").value = prefs.explanationLanguage;

  const voices = await speech.arabicVoices();
  $("voice").replaceChildren(
    el("option", { value: "" }, "Automatic"),
    ...voices.map((v) => el("option", { value: v.name }, `${v.name} (${v.lang})`)),
  );
  $("voice").value = prefs.voiceName;
  $("voiceHint").textContent = !speech.canSpeak
    ? "This browser cannot speak. Try Chrome, Edge or Safari."
    : voices.length
      ? `${voices.length} Arabic voice(s) found on this device.`
      : "No Arabic voice found on this device. Windows: Settings → Time & language → Speech → Add voices → Arabic. Android: Settings → Text-to-speech → install Arabic. iPhone: Settings → Accessibility → Spoken Content → Voices → Arabic.";

  const save = () => {
    settings.set({
      voiceName: $("voice").value,
      rate: Number($("rate").value),
      autoSpeak: $("autoSpeak").checked,
      teacherHarakat: $("teacherHarakat").value,
      showTranslation: $("showTranslation").checked,
      handsFree: $("handsFree").checked,
      micLang: $("micLang").value,
    });
    $("rateValue").textContent = `${$("rate").value}×`;
  };
  for (const id of ["voice", "rate", "autoSpeak", "teacherHarakat", "showTranslation", "handsFree", "micLang"]) {
    $(id).addEventListener("change", save);
  }
  $("rate").addEventListener("input", save);
  $("testVoice").addEventListener("click", () => speech.speak("السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللّٰهِ. كَيْفَ حَالُكَ؟", { voiceName: $("voice").value, rate: Number($("rate").value) }));
}

// ---------------------------------------------------------------- start-up

async function init() {
  try {
    meta = await (await fetch("/api/meta")).json();
  } catch {
    setStatus("Cannot reach the server. Is it running?", "error");
    return;
  }
  $("mockBanner").hidden = !meta.mock;

  fillSurahSelect();
  fillPlanMonthPick();
  const firstItem = meta.curriculum.find((m) => m.month === settings.get().planMonth).items[0];
  setPassageInputs(firstItem.surah, firstItem.from, firstItem.to);
  updateModeFields();

  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
  $("mode").addEventListener("change", updateModeFields);
  $("planMonthPick").addEventListener("change", renderPlanChips);
  $("surah").addEventListener("change", () => {
    const total = meta.surahs[$("surah").value - 1].totalVerses;
    setPassageInputs(Number($("surah").value), 1, Math.min(total, 10));
  });
  $("startBtn").addEventListener("click", () => startLesson());
  $("changeLesson").addEventListener("click", () => {
    document.querySelector(".lesson-view").classList.remove("in-lesson");
    $("setupPanel").scrollIntoView({ behavior: "smooth" });
  });
  $("passageHarakat").addEventListener("change", drawAyahs);
  $("passageTranslation").addEventListener("change", drawAyahs);
  $("collapsePassage").addEventListener("click", () => {
    const body = $("passageBody");
    body.hidden = !body.hidden;
    $("collapsePassage").textContent = body.hidden ? "Show" : "Hide";
  });

  $("sendBtn").addEventListener("click", () => sendUser($("input").value, "typed"));
  $("input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendUser($("input").value, "typed");
    }
  });
  if (speech.canListen) {
    $("micBtn").addEventListener("click", listen);
  } else {
    $("micBtn").disabled = true;
    $("micBtn").title = "Speech recognition is not supported in this browser";
    setStatus("Voice input needs Chrome, Edge or Safari. You can still type.", "");
  }

  $("vocabSearch").addEventListener("input", renderNotebook);
  $("exportAnki").addEventListener("click", exportAnki);
  $("exportMistakes").addEventListener("click", exportMistakes);
  $("currentMonth").addEventListener("change", () => {
    settings.set({ planMonth: Number($("currentMonth").value) });
    $("planMonthPick").value = $("currentMonth").value;
    renderPlanChips();
    renderPlan();
  });
  $("backupBtn").addEventListener("click", () => download(`arabic-tutor-backup-${localDay()}.json`, exportAll(), "application/json"));
  $("restoreInput").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      importAll(await file.text());
      alert("Backup restored.");
      location.reload();
    } catch {
      alert("That file is not a valid backup.");
    }
  });
  $("settingsBtn").addEventListener("click", () => $("settingsDialog").showModal());
  await setupSettings();

  // Resume the previous lesson after a page reload.
  const saved = session.get();
  if (saved?.lesson && Array.isArray(saved.history) && saved.history.length) {
    lesson = saved.lesson;
    history = saved.history;
    try {
      passage = lesson.surah ? await fetchPassage(lesson) : null;
    } catch {
      passage = null;
    }
    $("mode").value = lesson.mode;
    updateModeFields();
    if (lesson.surah) setPassageInputs(lesson.surah, lesson.from, lesson.to);
    showLessonChrome();
    renderHistory();
    if (history.at(-1)?.role === "user") showRetry("The last message has no reply yet.");
  }
}

init();
