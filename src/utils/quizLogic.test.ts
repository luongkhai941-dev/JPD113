import test from "node:test";
import assert from "node:assert/strict";
import { KANA_DATA } from "../data/kanaData";
import { VOCAB_DATA } from "../data/vocabData";
import {
  applyFlashcardRating,
  filterKanaDeck,
  generateKanaQuizQuestions,
  generateVocabQuizQuestions,
  scoreQuizAttempt,
} from "./quizLogic";

function makeSeededRng(seed = 42): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

test("kanaData has complete 46 basic, 25 dakuten, and 33 yoon characters", () => {
  const basic = KANA_DATA.filter((k) => k.group === "basic");
  const dakuten = KANA_DATA.filter((k) => k.group === "dakuten");
  const yoon = KANA_DATA.filter((k) => k.group === "yoon");

  assert.equal(basic.length, 46);
  assert.equal(dakuten.length, 25);
  assert.equal(yoon.length, 33);
  assert.equal(KANA_DATA.length, 104);
});

test("filterKanaDeck filters by group and mastered status", () => {
  const mastered = new Set(["a", "i", "ga"]);
  const basicUnmastered = filterKanaDeck(KANA_DATA, "basic", true, mastered);
  assert.equal(basicUnmastered.length, 44);
  assert.equal(
    basicUnmastered.some((k) => k.id === "a" || k.id === "i"),
    false
  );

  const dakutenAll = filterKanaDeck(KANA_DATA, "dakuten", false, mastered);
  assert.equal(dakutenAll.length, 25);
});

test("applyFlashcardRating re-queues missed cards and advances cleanly", () => {
  const deck = KANA_DATA.slice(0, 6);
  const resAgain = applyFlashcardRating(deck, 0, "again");
  assert.equal(resAgain.nextIndex, 1);
  assert.equal(resAgain.isComplete, false);
  assert.equal(resAgain.nextQueue.length, 7);
  assert.equal(resAgain.nextQueue[4].id, deck[0].id);

  const resMastered = applyFlashcardRating(deck, 5, "mastered");
  assert.equal(resMastered.nextIndex, 6);
  assert.equal(resMastered.isComplete, true);
});

test("generateKanaQuizQuestions produces 4 unique options including correct answer", () => {
  const rng = makeSeededRng(101);
  const questions = generateKanaQuizQuestions(KANA_DATA, {
    script: "hiragana",
    group: "basic",
    questionType: "kana_to_romaji",
    count: 15,
    rng,
  });

  assert.equal(questions.length, 15);
  for (const q of questions) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.options.includes(q.correctAnswer));
  }
});

test("generateVocabQuizQuestions produces valid questions across categories", () => {
  const rng = makeSeededRng(7);
  const questions = generateVocabQuizQuestions(VOCAB_DATA, {
    category: "greetings",
    questionType: "mixed",
    count: 8,
    rng,
  });

  assert.equal(questions.length, 8);
  for (const q of questions) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(q.options.includes(q.correctAnswer));
  }
});

test("scoreQuizAttempt calculates accuracy and collects incorrect answers", () => {
  const summary = scoreQuizAttempt([
    { questionId: "1", selected: "a", correct: "a", isCorrect: true },
    { questionId: "2", selected: "ka", correct: "ki", isCorrect: false },
    { questionId: "3", selected: "su", correct: "su", isCorrect: true },
    { questionId: "4", selected: "te", correct: "te", isCorrect: true },
  ]);

  assert.equal(summary.total, 4);
  assert.equal(summary.correctCount, 3);
  assert.equal(summary.accuracyPercent, 75);
  assert.equal(summary.incorrectRecords.length, 1);
  assert.equal(summary.incorrectRecords[0].questionId, "2");
});
