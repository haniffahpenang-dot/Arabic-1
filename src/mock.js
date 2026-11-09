// Canned replies for MOCK=1, so the app can be tried without an API key.
const replies = [
  {
    reply_arabic: "أَهْلًا وَسَهْلًا! أَنَا مُعَلِّمُكَ. كَيْفَ حَالُكَ الْيَوْمَ؟",
    reply_english: "Welcome! I am your teacher. How are you today?",
    corrections: [],
    vocabulary: [
      { word: "مُعَلِّم", root: "ع ل م", meaning: "teacher", quran_example: "", quran_reference: "" },
    ],
    exercise_text: "",
    tip: "Answer in a full sentence, even a short one.",
  },
  {
    reply_arabic: "الْحَمْدُ لِلّٰهِ! مَاذَا عَمِلْتَ الْيَوْمَ فِي عَمَلِكَ؟",
    reply_english: "Praise be to Allah! What did you do today at your work?",
    corrections: [
      {
        original: "أنا بخير الحمد لله أنا ذهبت العمل",
        corrected: "أَنَا بِخَيْرٍ، الْحَمْدُ لِلّٰهِ. ذَهَبْتُ إِلَى الْعَمَلِ.",
        explanation: "ذَهَبَ needs the preposition إِلَى before the place; the pronoun أنا is not needed because the verb ending -تُ already shows it.",
        category: "preposition",
      },
    ],
    vocabulary: [
      { word: "عَمِلَ", root: "ع م ل", meaning: "to do, to work", quran_example: "", quran_reference: "" },
    ],
    exercise_text: "",
    tip: "",
  },
  {
    reply_arabic: "أَحْسَنْتَ! اقْرَأْ هٰذِهِ الْجُمْلَةَ بِالْحَرَكَاتِ.",
    reply_english: "Well done! Read this sentence with the vowels.",
    corrections: [],
    vocabulary: [],
    exercise_text: "ذهب الرجل الى المسجد",
    tip: "Find the verb first, then its subject.",
  },
];

export function mockReply(messages) {
  const turn = messages.filter((m) => m.role === "user").length - 1;
  const reply = replies[turn % replies.length];
  return { reply, raw: JSON.stringify(reply), usage: null };
}
