// The 12-month plan: month 1 is the initial program, months 2–12 the detailed program.
// Each item is a passage the learner can open as a lesson.

const s = (surah, from, to, label) => ({ surah, from, to, label });

export const curriculum = [
  {
    month: 1,
    title: "Foundation: prayer surahs and sarf speed",
    focus: "Set up daily vocabulary review, sharpen verb forms I–X, understand what you recite in salah.",
    haraka: "Read vowelled text; reread each studied passage without haraka on Saturdays.",
    items: [
      s(1, 1, 7, "Al-Fatihah"),
      s(93, 1, 11, "Ad-Duha"), s(94, 1, 8, "Ash-Sharh"), s(95, 1, 8, "At-Tin"), s(96, 1, 19, "Al-'Alaq"),
      s(97, 1, 5, "Al-Qadr"), s(98, 1, 8, "Al-Bayyinah"), s(99, 1, 8, "Az-Zalzalah"), s(100, 1, 11, "Al-'Adiyat"),
      s(101, 1, 11, "Al-Qari'ah"), s(102, 1, 8, "At-Takathur"), s(103, 1, 3, "Al-'Asr"), s(104, 1, 9, "Al-Humazah"),
      s(105, 1, 5, "Al-Fil"), s(106, 1, 4, "Quraysh"), s(107, 1, 7, "Al-Ma'un"), s(108, 1, 3, "Al-Kawthar"),
      s(109, 1, 6, "Al-Kafirun"), s(110, 1, 3, "An-Nasr"), s(111, 1, 5, "Al-Masad"), s(112, 1, 4, "Al-Ikhlas"),
      s(113, 1, 5, "Al-Falaq"), s(114, 1, 6, "An-Nas"),
    ],
  },
  {
    month: 2,
    title: "Rest of Juz 30",
    focus: "Short Makki surahs: Day of Judgement vocabulary, oaths, descriptions of nature.",
    haraka: "Reread every studied page without haraka.",
    items: [
      s(78, 1, 40, "An-Naba'"), s(79, 1, 40, "An-Nazi'at"), s(80, 1, 23, "'Abasa 1–23"), s(80, 24, 42, "'Abasa 24–42"), s(81, 1, 29, "At-Takwir"),
      s(82, 1, 19, "Al-Infitar"), s(83, 1, 36, "Al-Mutaffifin"), s(84, 1, 25, "Al-Inshiqaq"), s(85, 1, 22, "Al-Buruj"),
      s(86, 1, 17, "At-Tariq"), s(87, 1, 19, "Al-A'la"), s(88, 1, 26, "Al-Ghashiyah"), s(89, 1, 30, "Al-Fajr"),
      s(90, 1, 20, "Al-Balad"), s(91, 1, 15, "Ash-Shams"), s(92, 1, 21, "Al-Layl"),
    ],
  },
  {
    month: 3,
    title: "Surah Yusuf",
    focus: "Narrative verbs, dialogue and particles (إذ، لمّا، حتّى، إنّ، أنّ، قد).",
    haraka: "Reread every studied page without haraka.",
    items: [s(12, 1, 20, "Yusuf 1–20"), s(12, 21, 42, "Yusuf 21–42"), s(12, 43, 68, "Yusuf 43–68"), s(12, 69, 93, "Yusuf 69–93"), s(12, 94, 111, "Yusuf 94–111")],
  },
  {
    month: 4,
    title: "Juz 29 (Tabarak)",
    focus: "Creation, warning and the unseen.",
    haraka: "Read the unvowelled text first, then check against the vowelled text.",
    items: [
      s(67, 1, 30, "Al-Mulk"), s(68, 1, 40, "Al-Qalam 1–40"), s(68, 41, 52, "Al-Qalam 41–52"), s(69, 1, 37, "Al-Haqqah 1–37"),
      s(69, 38, 52, "Al-Haqqah 38–52"), s(70, 1, 21, "Al-Ma'arij 1–21"), s(70, 22, 44, "Al-Ma'arij 22–44"), s(71, 1, 28, "Nuh"), s(72, 1, 28, "Al-Jinn"),
      s(73, 1, 20, "Al-Muzzammil"), s(74, 1, 40, "Al-Muddaththir 1–40"), s(74, 41, 56, "Al-Muddaththir 41–56"),
      s(75, 1, 40, "Al-Qiyamah"), s(76, 1, 31, "Al-Insan"), s(77, 1, 40, "Al-Mursalat 1–40"), s(77, 41, 50, "Al-Mursalat 41–50"),
    ],
  },
  {
    month: 5,
    title: "Al-Kahf and Maryam",
    focus: "Stories, abstract and theological vocabulary, conditional sentences.",
    haraka: "Unvowelled first.",
    items: [
      s(18, 1, 31, "Al-Kahf 1–31"), s(18, 32, 59, "Al-Kahf 32–59"), s(18, 60, 82, "Al-Kahf 60–82"), s(18, 83, 110, "Al-Kahf 83–110"),
      s(19, 1, 40, "Maryam 1–40"), s(19, 41, 75, "Maryam 41–75"), s(19, 76, 98, "Maryam 76–98"),
    ],
  },
  {
    month: 6,
    title: "Juz 28 + 6-month checkpoint",
    focus: "Madani surahs: community, law and hypocrisy vocabulary.",
    haraka: "Unvowelled first. Retest your 3 baseline pages.",
    items: [
      s(58, 1, 22, "Al-Mujadilah"), s(59, 1, 24, "Al-Hashr"), s(60, 1, 13, "Al-Mumtahanah"), s(61, 1, 14, "As-Saff"),
      s(62, 1, 11, "Al-Jumu'ah"), s(63, 1, 11, "Al-Munafiqun"), s(64, 1, 18, "At-Taghabun"), s(65, 1, 12, "At-Talaq"), s(66, 1, 12, "At-Tahrim"),
    ],
  },
  {
    month: 7,
    title: "Taha and Yasin",
    focus: "The story of Musa; signs in creation. Log every haraka error type.",
    haraka: "Unvowelled first; mark each error type (case ending, verb form, passive).",
    items: [
      s(20, 1, 40, "Taha 1–40"), s(20, 41, 80, "Taha 41–80"), s(20, 81, 112, "Taha 81–112"), s(20, 113, 135, "Taha 113–135"),
      s(36, 1, 40, "Yasin 1–40"), s(36, 41, 60, "Yasin 41–60"), s(36, 61, 83, "Yasin 61–83"),
    ],
  },
  {
    month: 8,
    title: "Juz 27",
    focus: "Paradise and Hellfire descriptions, the cosmos.",
    haraka: "Unvowelled only; look at the vowelled text only when stuck.",
    items: [
      s(51, 31, 60, "Adh-Dhariyat 31–60"), s(52, 1, 28, "At-Tur 1–28"), s(52, 29, 49, "At-Tur 29–49"), s(53, 1, 40, "An-Najm 1–40"), s(53, 41, 62, "An-Najm 41–62"),
      s(54, 1, 40, "Al-Qamar 1–40"), s(54, 41, 55, "Al-Qamar 41–55"), s(55, 1, 40, "Ar-Rahman 1–40"), s(55, 41, 78, "Ar-Rahman 41–78"),
      s(56, 1, 40, "Al-Waqi'ah 1–40"), s(56, 41, 74, "Al-Waqi'ah 41–74"), s(56, 75, 96, "Al-Waqi'ah 75–96"), s(57, 1, 29, "Al-Hadid"),
    ],
  },
  {
    month: 9,
    title: "Juz 1 (Al-Baqarah 1–141)",
    focus: "Long Madani passages: Bani Isra'il, Adam, Ibrahim.",
    haraka: "Unvowelled only.",
    items: [s(2, 1, 29, "Al-Baqarah 1–29"), s(2, 30, 61, "Al-Baqarah 30–61"), s(2, 62, 96, "Al-Baqarah 62–96"), s(2, 97, 123, "Al-Baqarah 97–123"), s(2, 124, 141, "Al-Baqarah 124–141")],
  },
  {
    month: 10,
    title: "Juz 2 (Al-Baqarah 142–252)",
    focus: "The qiblah, fasting, Hajj, family law, Talut and Jalut.",
    haraka: "Unvowelled only.",
    items: [s(2, 142, 167, "Al-Baqarah 142–167"), s(2, 168, 188, "Al-Baqarah 168–188"), s(2, 189, 214, "Al-Baqarah 189–214"), s(2, 215, 237, "Al-Baqarah 215–237"), s(2, 238, 252, "Al-Baqarah 238–252")],
  },
  {
    month: 11,
    title: "Juz 3 (Al-Baqarah 253 – Aal 'Imran 92)",
    focus: "Ayat al-Kursi, charity, debt; the family of 'Imran.",
    haraka: "Unvowelled only. Start fast reading of unstudied juz' on Sundays.",
    items: [s(2, 253, 274, "Al-Baqarah 253–274"), s(2, 275, 286, "Al-Baqarah 275–286"), s(3, 1, 32, "Aal 'Imran 1–32"), s(3, 33, 63, "Aal 'Imran 33–63"), s(3, 64, 92, "Aal 'Imran 64–92")],
  },
  {
    month: 12,
    title: "Juz 26 + final checkpoint",
    focus: "Al-Ahqaf to Qaf: prophets, jinn, and resurrection.",
    haraka: "Unvowelled reading is your default. Retest your baseline pages.",
    items: [
      s(46, 1, 35, "Al-Ahqaf"), s(47, 1, 38, "Muhammad"), s(48, 1, 29, "Al-Fath"), s(49, 1, 18, "Al-Hujurat"),
      s(50, 1, 22, "Qaf 1–22"), s(50, 23, 45, "Qaf 23–45"), s(51, 1, 30, "Adh-Dhariyat 1–30"),
    ],
  },
];
