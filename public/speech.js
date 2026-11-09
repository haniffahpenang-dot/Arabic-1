// Speech input (browser speech recognition) and output (speech synthesis).

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const canListen = Boolean(Recognition);
export const canSpeak = "speechSynthesis" in window;

let recognition = null;

/**
 * Listens for one utterance.
 * callbacks: onInterim(text), onFinal(text), onEnd(), onError(message)
 */
export function startListening(lang, { onInterim, onFinal, onEnd, onError }) {
  if (!canListen) {
    onError?.("Speech recognition is not supported in this browser. Use Chrome, Edge or Safari, or type instead.");
    return;
  }
  stopListening();
  const rec = new Recognition();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = "";
  rec.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finalText += result[0].transcript;
      else interim += result[0].transcript;
    }
    onInterim?.((finalText + " " + interim).trim());
  };
  rec.onerror = (event) => {
    const messages = {
      "not-allowed": "Microphone access was blocked. Allow the microphone for this site in your browser settings.",
      "no-speech": "I didn't hear anything. Tap the microphone and try again.",
      "audio-capture": "No microphone was found.",
      network: "Speech recognition needs an internet connection.",
    };
    if (event.error !== "aborted") onError?.(messages[event.error] || `Speech recognition error: ${event.error}`);
  };
  rec.onend = () => {
    recognition = null;
    if (finalText.trim()) onFinal?.(finalText.trim());
    onEnd?.();
  };
  recognition = rec;
  rec.start();
}

export function stopListening() {
  if (recognition) {
    recognition.stop();
  }
}

export function isListening() {
  return recognition !== null;
}

// ---- Speech output ----

let voicesReady = null;

/** Resolves with the available voices (they load asynchronously in Chrome). */
export function loadVoices() {
  if (!canSpeak) return Promise.resolve([]);
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length) return resolve(voices);
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500);
  });
  return voicesReady;
}

export async function arabicVoices() {
  const voices = await loadVoices();
  return voices.filter((v) => v.lang.toLowerCase().startsWith("ar"));
}

/** Speaks text; resolves when finished (or immediately if speech is unavailable). */
export async function speak(text, { voiceName, rate = 0.85, lang = "ar-SA" } = {}) {
  if (!canSpeak || !text) return;
  speechSynthesis.cancel();
  const voices = await loadVoices();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  const voice =
    voices.find((v) => v.name === voiceName) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (voice) utterance.voice = voice;
  return new Promise((resolve) => {
    utterance.onend = resolve;
    utterance.onerror = resolve;
    speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  if (canSpeak) speechSynthesis.cancel();
}
