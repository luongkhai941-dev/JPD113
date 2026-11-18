export type AppTab = "alphabet" | "flashcard" | "vocab" | "quiz";

export type ScriptMode = "hiragana" | "katakana" | "both";

export type KanaGroup = "basic" | "dakuten" | "yoon";

export interface KanaExample {
  jp: string;
  romaji: string;
  vi: string;
}

export interface KanaChar {
  id: string;
  hiragana: string;
  katakana: string;
  romaji: string;
  group: KanaGroup;
  row: string;
  col: number;
  viTip: string;
  mnemonic: string;
  strokeCountHira: number;
  strokeCountKata: number;
  examples: KanaExample[];
}

export type VocabCategory =
  | "greetings"
  | "numbers_time"
  | "people"
  | "food_daily"
  | "actions_adj";

export interface VocabWord {
  id: string;
  kana: string;
  kanji?: string;
  romaji: string;
  meaning: string;
  category: VocabCategory;
  exampleJp: string;
  exampleRomaji: string;
  exampleVi: string;
}

export type FlashcardFrontMode = "kana_to_romaji" | "audio_to_kana" | "romaji_to_kana";

export type FlashcardRating = "again" | "hard" | "mastered";

export type KanaQuizType = "kana_to_romaji" | "audio_to_kana" | "hira_to_kata";

export interface KanaQuizQuestion {
  id: string;
  kanaId: string;
  promptType: KanaQuizType;
  promptText: string;
  audioText: string;
  correctAnswer: string;
  options: string[];
  displayHint: string;
}

export type VocabQuizType = "jp_to_vi" | "vi_to_jp" | "audio_to_vi" | "mixed";

export interface VocabQuizQuestion {
  id: string;
  vocabId: string;
  mode: Exclude<VocabQuizType, "mixed">;
  promptText: string;
  promptSubtext?: string;
  audioText: string;
  correctAnswer: string;
  options: string[];
  romaji: string;
  meaning: string;
  kana: string;
}

export interface QuizAnswerRecord {
  questionId: string;
  selected: string;
  correct: string;
  isCorrect: boolean;
}
