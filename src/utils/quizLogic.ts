import {
  FlashcardRating,
  KanaChar,
  KanaGroup,
  KanaQuizQuestion,
  KanaQuizType,
  QuizAnswerRecord,
  ScriptMode,
  VocabCategory,
  VocabQuizQuestion,
  VocabQuizType,
  VocabWord,
} from "../types";

export function shuffleArray<T>(
  items: readonly T[],
  rng: () => number = Math.random
): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export function filterKanaDeck(
  kanaList: readonly KanaChar[],
  group: KanaGroup | "all",
  onlyUnmastered: boolean,
  masteredIds: ReadonlySet<string>
): KanaChar[] {
  return kanaList.filter((item) => {
    if (group !== "all" && item.group !== group) {
      return false;
    }
    if (onlyUnmastered && masteredIds.has(item.id)) {
      return false;
    }
    return true;
  });
}

export interface FlashcardStepResult {
  nextQueue: KanaChar[];
  nextIndex: number;
  isComplete: boolean;
}

export function applyFlashcardRating(
  queue: readonly KanaChar[],
  currentIndex: number,
  rating: FlashcardRating
): FlashcardStepResult {
  if (queue.length === 0 || currentIndex < 0 || currentIndex >= queue.length) {
    return { nextQueue: [...queue], nextIndex: 0, isComplete: true };
  }

  const nextQueue = [...queue];
  const currentCard = nextQueue[currentIndex];

  if (rating === "again" && nextQueue.length - currentIndex > 1) {
    const insertAt = Math.min(currentIndex + 4, nextQueue.length);
    nextQueue.splice(insertAt, 0, currentCard);
  } else if (rating === "hard" && nextQueue.length - currentIndex > 2) {
    const insertAt = Math.min(currentIndex + 6, nextQueue.length);
    nextQueue.splice(insertAt, 0, currentCard);
  }

  const nextIndex = currentIndex + 1;
  return {
    nextQueue,
    nextIndex,
    isComplete: nextIndex >= nextQueue.length,
  };
}

function getDisplayChar(kana: KanaChar, script: ScriptMode): string {
  if (script === "katakana") {
    return kana.katakana;
  }
  return kana.hiragana;
}

export interface KanaQuizOptions {
  script: ScriptMode;
  group: KanaGroup | "all";
  questionType: KanaQuizType | "mixed";
  count: number;
  rng?: () => number;
}

export function generateKanaQuizQuestions(
  kanaList: readonly KanaChar[],
  options: KanaQuizOptions
): KanaQuizQuestion[] {
  const rng = options.rng ?? Math.random;
  const pool =
    options.group === "all"
      ? [...kanaList]
      : kanaList.filter((k) => k.group === options.group);

  if (pool.length === 0) {
    return [];
  }

  const selected = shuffleArray(pool, rng).slice(
    0,
    Math.min(options.count, pool.length)
  );

  const types: KanaQuizType[] = ["kana_to_romaji", "audio_to_kana", "hira_to_kata"];

  return selected.map((target, index) => {
    const effectiveType: KanaQuizType =
      options.questionType === "mixed"
        ? types[index % types.length]
        : options.questionType;

    const effectiveScript: "hiragana" | "katakana" =
      options.script === "both"
        ? index % 2 === 0
          ? "hiragana"
          : "katakana"
        : options.script;

    let promptText = "";
    let correctAnswer = "";
    let displayHint = "";

    if (effectiveType === "kana_to_romaji") {
      promptText = getDisplayChar(target, effectiveScript);
      correctAnswer = target.romaji;
      displayHint =
        effectiveScript === "hiragana"
          ? "Chọn cách đọc Romaji của chữ Hiragana này"
          : "Chọn cách đọc Romaji của chữ Katakana này";
    } else if (effectiveType === "audio_to_kana") {
      promptText = "Nghe phát âm";
      correctAnswer = getDisplayChar(target, effectiveScript);
      displayHint =
        effectiveScript === "hiragana"
          ? "Nghe âm thanh và chọn chữ Hiragana đúng"
          : "Nghe âm thanh và chọn chữ Katakana đúng";
    } else {
      // hira_to_kata
      if (effectiveScript === "hiragana") {
        promptText = target.hiragana;
        correctAnswer = target.katakana;
        displayHint = "Chọn chữ Katakana tương ứng";
      } else {
        promptText = target.katakana;
        correctAnswer = target.hiragana;
        displayHint = "Chọn chữ Hiragana tương ứng";
      }
    }

    const distractorCandidates = shuffleArray(
      pool.filter((item) => item.id !== target.id),
      rng
    );

    const optionsSet = new Set<string>([correctAnswer]);
    for (const candidate of distractorCandidates) {
      if (optionsSet.size >= 4) {
        break;
      }
      let candidateVal = "";
      if (effectiveType === "kana_to_romaji") {
        candidateVal = candidate.romaji;
      } else if (effectiveType === "audio_to_kana") {
        candidateVal = getDisplayChar(candidate, effectiveScript);
      } else {
        candidateVal =
          effectiveScript === "hiragana"
            ? candidate.katakana
            : candidate.hiragana;
      }
      // Avoid confusing duplicate sounds like ji / ji (di) in audio quiz
      if (
        effectiveType === "audio_to_kana" &&
        candidate.romaji.split(" ")[0] === target.romaji.split(" ")[0]
      ) {
        continue;
      }
      if (!optionsSet.has(candidateVal)) {
        optionsSet.add(candidateVal);
      }
    }

    return {
      id: `kq_${target.id}_${index}`,
      kanaId: target.id,
      promptType: effectiveType,
      promptText,
      audioText: target.hiragana,
      correctAnswer,
      options: shuffleArray(Array.from(optionsSet), rng),
      displayHint,
    };
  });
}

export interface VocabQuizOptions {
  category: VocabCategory | "all";
  questionType: VocabQuizType;
  count: number;
  rng?: () => number;
}

export function generateVocabQuizQuestions(
  vocabList: readonly VocabWord[],
  options: VocabQuizOptions
): VocabQuizQuestion[] {
  const rng = options.rng ?? Math.random;
  const pool =
    options.category === "all"
      ? [...vocabList]
      : vocabList.filter((v) => v.category === options.category);

  if (pool.length === 0) {
    return [];
  }

  // Use full vocabList as distractor fallback if category pool is small
  const distractorPool = pool.length >= 4 ? pool : [...vocabList];
  const selected = shuffleArray(pool, rng).slice(
    0,
    Math.min(options.count, pool.length)
  );

  const modes: Exclude<VocabQuizType, "mixed">[] = [
    "jp_to_vi",
    "vi_to_jp",
    "audio_to_vi",
  ];

  return selected.map((word, index) => {
    const mode: Exclude<VocabQuizType, "mixed"> =
      options.questionType === "mixed"
        ? modes[index % modes.length]
        : options.questionType;

    let promptText = "";
    let promptSubtext: string | undefined;
    let correctAnswer = "";

    if (mode === "jp_to_vi") {
      promptText = word.kana;
      promptSubtext = word.kanji ? `${word.kanji} · ${word.romaji}` : word.romaji;
      correctAnswer = word.meaning;
    } else if (mode === "vi_to_jp") {
      promptText = word.meaning;
      promptSubtext = "Chọn từ tiếng Nhật tương ứng";
      correctAnswer = word.kana;
    } else {
      promptText = "Nghe phát âm";
      promptSubtext = "Nhấn nghe và chọn nghĩa tiếng Việt đúng";
      correctAnswer = word.meaning;
    }

    const candidates = shuffleArray(
      distractorPool.filter((item) => item.id !== word.id),
      rng
    );

    const optionsSet = new Set<string>([correctAnswer]);
    for (const candidate of candidates) {
      if (optionsSet.size >= 4) {
        break;
      }
      const val = mode === "vi_to_jp" ? candidate.kana : candidate.meaning;
      if (!optionsSet.has(val)) {
        optionsSet.add(val);
      }
    }

    return {
      id: `vq_${word.id}_${index}`,
      vocabId: word.id,
      mode,
      promptText,
      promptSubtext,
      audioText: word.kana,
      correctAnswer,
      options: shuffleArray(Array.from(optionsSet), rng),
      romaji: word.romaji,
      meaning: word.meaning,
      kana: word.kana,
    };
  });
}

export interface QuizScoreSummary {
  total: number;
  correctCount: number;
  accuracyPercent: number;
  incorrectRecords: QuizAnswerRecord[];
}

export function scoreQuizAttempt(
  records: readonly QuizAnswerRecord[]
): QuizScoreSummary {
  const total = records.length;
  if (total === 0) {
    return {
      total: 0,
      correctCount: 0,
      accuracyPercent: 0,
      incorrectRecords: [],
    };
  }
  const correctCount = records.filter((r) => r.isCorrect).length;
  const accuracyPercent = Math.round((correctCount / total) * 100);
  const incorrectRecords = records.filter((r) => !r.isCorrect);

  return {
    total,
    correctCount,
    accuracyPercent,
    incorrectRecords,
  };
}
