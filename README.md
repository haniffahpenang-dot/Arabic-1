# المُعَلِّم · Quranic Arabic Tutor

A voice tutor for Quranic Arabic (Fusha). You speak Arabic, the teacher
answers out loud, corrects your mistakes and teaches you Quranic vocabulary.
It follows a 12-month plan: a 1-month initial program, then 11 months working
through the Quran passage by passage.

## What it does

- **Speak and listen.** Tap the microphone and speak Arabic (or English when
  you're stuck). The teacher replies in fully vowelled Fusha and reads it aloud.
  **Hands-free** mode starts listening again after each reply.
- **Corrections.** Every mistake is shown crossed out with the correct version
  and the grammar rule, then saved to your **Mistakes** log, grouped by type.
- **Quranic vocabulary.** The teacher prefers words that occur in the Quran,
  even in everyday conversation. New words go to your **Notebook** with their
  root and a Quranic example. Export them to Anki as CSV.
- **Five lesson types:**
  | Lesson | What happens |
  |---|---|
  | Conversation | Everyday talk in Fusha using Quranic words |
  | Passage study | Work through an ayah range: meaning, roots, i'rab, retelling |
  | Root drill | Roots, their derived forms (wazn), and using them in sentences |
  | Reading without haraka | Vowel unvowelled sentences; every harakah is checked |
  | Grammar in context | One nahw or sarf point at a time, with your own sentences |
- **The Quran text.** Passages are shown from a verified Uthmani text, with
  harakat and English translation toggles and a link to the recitation on
  quran.com. The teacher is told to quote only from this text.
- **My plan** shows the 12-month plan; tap any passage to open it as a lesson.
- **Progress** tracks minutes practised per day and your streak.

Your notebook, mistakes and progress are stored in your browser only. Use
**Progress → Download backup** to keep a copy or move to another device.

## Running it

You need:

1. **Node.js 20 or newer**: https://nodejs.org
2. **An Anthropic API key**: create one at https://console.anthropic.com
   (API use is billed separately from a Claude.ai subscription).
3. **Chrome, Edge or Safari** for voice input. Firefox can only type.

```bash
npm install
cp .env.example .env      # then put your API key in .env
npm start
```

Open http://localhost:3000 and allow microphone access.

To try the app without a key, run `npm run mock`. The teacher then gives
sample replies only.

### Settings (in `.env`)

| Variable | Default | Meaning |
|---|---|---|
| `ANTHROPIC_API_KEY` | (required) | Your API key |
| `TUTOR_MODEL` | `claude-opus-5-5` | Claude model. `claude-haiku-5-5` is far cheaper but corrects less carefully |
| `TUTOR_EFFORT` | `low` | `low` gives the fastest spoken replies; `medium` gives more careful corrections |
| `APP_PASSWORD` | (none) | Asks for a password before the app opens. Set this if the app is on the internet |
| `PORT` | `3000` | Port to listen on |

### Cost (rough estimate)

With the default model, one exchange usually costs about 1–2 US cents, so a
20-minute session is roughly $0.30–0.60. Check your real usage in the
Anthropic Console.

### Using it on your phone

Browsers only allow the microphone on `https://` pages (or `localhost`). To
use it on your phone, host it on a service that gives you an HTTPS address
(for example Render, Railway or Fly.io), set `ANTHROPIC_API_KEY` and
`APP_PASSWORD` there, and start it with `npm start`.

## Things to know

- **Speech recognition does not hear harakat.** The browser writes down what
  you said without vowel marks, so the teacher can't check case endings in
  spoken answers. It checks them when you **type** with harakat, which is what
  the *Reading without haraka* lesson asks you to do.
- **Voice quality depends on your device.** The teacher's voice comes from
  your device's Arabic text-to-speech voice. If there is none, the Settings
  dialog explains how to install one.
- **Unvowelled view.** Hiding harakat on a Quran passage removes the marks
  from the Uthmani text, so some words keep their Mushaf spelling (for
  example العلمين for العالمين).
- The teacher is an AI language tutor, not a scholar. Check any Quranic
  quotation against your Mushaf, and take fiqh questions to a qualified scholar.

## Project layout

```
server.js            Express server: serves the app, calls the Claude API
src/prompt.js        The teacher's instructions and reply format
src/curriculum.js    The 12-month plan and its passages
src/quran.js         Quran text loader
src/mock.js          Sample replies for demo mode
public/              The web app (HTML, CSS, JavaScript; no build step)
data/quran_en.json   Quran text with English translation
```

## Credits

Quran text and translation from the
[quran-json](https://github.com/risan/quran-json) package (Uthmani text from
The Noble Qur'an Encyclopedia, quranenc.com), licensed CC BY-SA 4.0; see
`data/QURAN_DATA_LICENSE.txt`.
