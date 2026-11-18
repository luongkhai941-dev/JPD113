import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  RotateCcw,
  Search,
  Volume2,
  XCircle,
} from "lucide-react";
import { VOCAB_CATEGORY_LABELS, VOCAB_DATA } from "../data/vocabData";
import {
  QuizAnswerRecord,
  VocabCategory,
  VocabQuizQuestion,
  VocabQuizType,
} from "../types";
import {
  generateVocabQuizQuestions,
  scoreQuizAttempt,
} from "../utils/quizLogic";

interface VocabViewProps {
  onSpeak: (text: string, slow?: boolean) => void;
}

type VocabSubTab = "browse" | "quiz";
type QuizStage = "setup" | "active" | "results";

const CATEGORY_KEYS = Object.keys(VOCAB_CATEGORY_LABELS) as VocabCategory[];

export function VocabView({ onSpeak }: VocabViewProps) {
  const [subTab, setSubTab] = useState<VocabSubTab>("browse");

  // Browse state
  const [browseCategory, setBrowseCategory] = useState<VocabCategory | "all">(
    "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Quiz setup & active state
  const [quizCategory, setQuizCategory] = useState<VocabCategory | "all">(
    "all"
  );
  const [quizType, setQuizType] = useState<VocabQuizType>("mixed");
  const [quizCount, setQuizCount] = useState<number>(10);
  const [quizStage, setQuizStage] = useState<QuizStage>("setup");
  const [questions, setQuestions] = useState<VocabQuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [records, setRecords] = useState<QuizAnswerRecord[]>([]);

  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return VOCAB_DATA.filter((word) => {
      if (browseCategory !== "all" && word.category !== browseCategory) {
        return false;
      }
      if (!q) return true;
      return (
        word.kana.toLowerCase().includes(q) ||
        word.romaji.toLowerCase().includes(q) ||
        word.meaning.toLowerCase().includes(q) ||
        (word.kanji && word.kanji.includes(q))
      );
    });
  }, [browseCategory, searchQuery]);

  const startQuiz = useCallback(
    (overrideVocabIds?: ReadonlySet<string>) => {
      const sourcePool = overrideVocabIds
        ? VOCAB_DATA.filter((w) => overrideVocabIds.has(w.id))
        : VOCAB_DATA;

      const generated = generateVocabQuizQuestions(sourcePool, {
        category: overrideVocabIds ? "all" : quizCategory,
        questionType: quizType,
        count: overrideVocabIds ? sourcePool.length : quizCount,
      });

      setQuestions(generated);
      setQIndex(0);
      setSelectedOption(null);
      setRecords([]);
      setQuizStage("active");

      if (generated[0]?.mode === "audio_to_vi") {
        onSpeak(generated[0].audioText, false);
      }
    },
    [quizCategory, quizType, quizCount, onSpeak]
  );

  const currentQuestion = questions[qIndex];

  const handleSelectOption = useCallback(
    (option: string) => {
      if (!currentQuestion || selectedOption !== null) return;
      const isCorrect = option === currentQuestion.correctAnswer;
      setSelectedOption(option);
      setRecords((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          selected: option,
          correct: currentQuestion.correctAnswer,
          isCorrect,
        },
      ]);
      onSpeak(currentQuestion.audioText, false);
    },
    [currentQuestion, selectedOption, onSpeak]
  );

  const handleNextQuestion = useCallback(() => {
    if (qIndex + 1 >= questions.length) {
      setQuizStage("results");
      return;
    }
    const nextIdx = qIndex + 1;
    setQIndex(nextIdx);
    setSelectedOption(null);
    if (questions[nextIdx]?.mode === "audio_to_vi") {
      onSpeak(questions[nextIdx].audioText, false);
    }
  }, [qIndex, questions, onSpeak]);

  useEffect(() => {
    if (subTab !== "quiz" || quizStage !== "active" || !currentQuestion) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedOption === null) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx !== -1 && currentQuestion.options[idx]) {
          handleSelectOption(currentQuestion.options[idx]);
        }
      } else if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleNextQuestion();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    subTab,
    quizStage,
    currentQuestion,
    selectedOption,
    handleSelectOption,
    handleNextQuestion,
  ]);

  const summary = useMemo(() => scoreQuizAttempt(records), [records]);

  const missedVocabIds = useMemo(() => {
    const missedQIds = new Set(summary.incorrectRecords.map((r) => r.questionId));
    const ids = new Set<string>();
    for (const q of questions) {
      if (missedQIds.has(q.id)) {
        ids.add(q.vocabId);
      }
    }
    return ids;
  }, [summary.incorrectRecords, questions]);

  return (
    <section aria-labelledby="vocab-heading" className="space-y-6">
      {/* Header & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1
            id="vocab-heading"
            className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
          >
            Từ vựng tiếng Nhật cơ bản
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Học {VOCAB_DATA.length} từ vựng N5 thiết yếu kèm phát âm bản ngữ và bài kiểm tra trắc nghiệm.
          </p>
        </div>

        <div
          role="group"
          aria-label="Chế độ học từ vựng"
          className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => setSubTab("browse")}
            aria-pressed={subTab === "browse"}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              subTab === "browse"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Danh sách từ vựng
          </button>
          <button
            type="button"
            onClick={() => setSubTab("quiz")}
            aria-pressed={subTab === "quiz"}
            className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
              subTab === "quiz"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Kiểm tra từ vựng
          </button>
        </div>
      </div>

      {/* SUBTAB 1: BROWSE VOCABULARY */}
      {subTab === "browse" && (
        <div className="space-y-5">
          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBrowseCategory("all")}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  browseCategory === "all"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Tất cả ({VOCAB_DATA.length})
              </button>
              {CATEGORY_KEYS.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setBrowseCategory(cat)}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    browseCategory === cat
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {VOCAB_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64 shrink-0">
              <label htmlFor="vocab-search" className="sr-only">
                Tìm kiếm từ vựng
              </label>
              <Search
                aria-hidden="true"
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                id="vocab-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm từ, romaji hoặc nghĩa..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>
          </div>

          {/* Vocabulary Grid */}
          {filteredWords.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-600">
              Không tìm thấy từ vựng phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredWords.map((word) => (
                <article
                  key={word.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2.5">
                        <span className="font-jp text-2xl font-bold text-slate-900">
                          {word.kana}
                        </span>
                        {word.kanji && (
                          <span className="font-jp text-sm text-slate-500">
                            ({word.kanji})
                          </span>
                        )}
                        <span className="text-sm font-mono-num text-blue-700 font-medium">
                          {word.romaji}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800">
                        {word.meaning}
                      </div>
                      <div className="text-xs text-slate-500">
                        {VOCAB_CATEGORY_LABELS[word.category]}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSpeak(word.kana, false)}
                      aria-label={`Phát âm từ ${word.kana}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                      Nghe
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-jp text-sm text-slate-800">
                        {word.exampleJp}
                      </div>
                      <div className="text-xs text-slate-500">
                        {word.exampleVi}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSpeak(word.exampleJp, false)}
                      aria-label={`Phát âm câu ví dụ ${word.exampleJp}`}
                      className="p-2 text-slate-500 hover:text-blue-700 hover:bg-slate-50 rounded-lg transition-colors shrink-0"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: VOCABULARY QUIZ */}
      {subTab === "quiz" && (
        <div className="max-w-2xl mx-auto">
          {quizStage === "setup" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Thiết lập bài kiểm tra từ vựng
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Chọn chủ đề và hình thức kiểm tra phù hợp với mục tiêu của bạn.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="vq-category"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    Chủ đề từ vựng
                  </label>
                  <select
                    id="vq-category"
                    value={quizCategory}
                    onChange={(e) =>
                      setQuizCategory(e.target.value as VocabCategory | "all")
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    <option value="all">
                      Tất cả chủ đề ({VOCAB_DATA.length} từ)
                    </option>
                    {CATEGORY_KEYS.map((cat) => (
                      <option key={cat} value={cat}>
                        {VOCAB_CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="vq-type"
                    className="block text-sm font-medium text-slate-800 mb-1.5"
                  >
                    Hình thức câu hỏi
                  </label>
                  <select
                    id="vq-type"
                    value={quizType}
                    onChange={(e) =>
                      setQuizType(e.target.value as VocabQuizType)
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                  >
                    <option value="mixed">
                      Hỗn hợp (Đọc chữ, nghe âm và dịch nghĩa)
                    </option>
                    <option value="jp_to_vi">
                      Nhìn tiếng Nhật → Chọn nghĩa tiếng Việt
                    </option>
                    <option value="vi_to_jp">
                      Nhìn nghĩa tiếng Việt → Chọn từ tiếng Nhật
                    </option>
                    <option value="audio_to_vi">
                      Nghe phát âm → Chọn nghĩa tiếng Việt
                    </option>
                  </select>
                </div>

                <div>
                  <span className="block text-sm font-medium text-slate-800 mb-1.5">
                    Số lượng câu hỏi
                  </span>
                  <div className="grid grid-cols-4 gap-2.5">
                    {[5, 10, 15, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuizCount(num)}
                        aria-pressed={quizCount === num}
                        className={`py-2 text-sm font-mono-num font-semibold rounded-lg border transition-colors ${
                          quizCount === num
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {num} câu
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => startQuiz()}
                className="w-full py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
              >
                Bắt đầu kiểm tra từ vựng
              </button>
            </div>
          )}

          {quizStage === "active" && currentQuestion && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
              {/* Top status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono-num font-semibold text-slate-900">
                    Câu {qIndex + 1} / {questions.length}
                  </span>
                  <span className="font-mono-num text-slate-600">
                    Đúng:{" "}
                    <span className="font-semibold text-emerald-700">
                      {summary.correctCount}
                    </span>
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-700 transition-all duration-200"
                    style={{
                      width: `${Math.round(((qIndex + 1) / questions.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Prompt */}
              <div className="py-4 text-center space-y-3">
                {currentQuestion.mode === "audio_to_vi" ? (
                  <button
                    type="button"
                    onClick={() => onSpeak(currentQuestion.audioText, false)}
                    className="inline-flex items-center gap-2.5 px-6 py-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-800 font-semibold transition-colors"
                  >
                    <Volume2 className="w-6 h-6" />
                    Nghe phát âm từ vựng
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    <div
                      className={
                        currentQuestion.mode === "jp_to_vi"
                          ? "font-jp text-4xl sm:text-5xl font-bold text-slate-900"
                          : "text-2xl sm:text-3xl font-bold text-slate-900"
                      }
                    >
                      {currentQuestion.promptText}
                    </div>
                    {currentQuestion.promptSubtext && (
                      <div className="text-sm text-slate-500 font-mono-num">
                        {currentQuestion.promptSubtext}
                      </div>
                    )}
                    {currentQuestion.mode === "jp_to_vi" && (
                      <button
                        type="button"
                        onClick={() => onSpeak(currentQuestion.audioText, false)}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                        Nghe phát âm
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = selectedOption === opt;
                  const isCorrectOpt = opt === currentQuestion.correctAnswer;
                  const showState = selectedOption !== null;

                  let style =
                    "bg-white border-slate-200 text-slate-900 hover:border-blue-700 hover:bg-blue-50/40";
                  if (showState) {
                    if (isCorrectOpt) {
                      style =
                        "bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold";
                    } else if (isSelected) {
                      style =
                        "bg-rose-50 border-rose-500 text-rose-900";
                    } else {
                      style = "bg-slate-50 border-slate-200 text-slate-400";
                    }
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={selectedOption !== null}
                      onClick={() => handleSelectOption(opt)}
                      className={`px-4 py-3.5 rounded-xl border text-left flex items-center justify-between gap-3 transition-colors ${style}`}
                    >
                      <span
                        className={
                          currentQuestion.mode === "vi_to_jp"
                            ? "font-jp text-xl font-medium"
                            : "text-sm sm:text-base font-medium"
                        }
                      >
                        <span className="font-mono-num text-xs text-slate-400 mr-2">
                          {idx + 1}.
                        </span>
                        {opt}
                      </span>
                      {showState && isCorrectOpt && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                      )}
                      {showState && isSelected && !isCorrectOpt && (
                        <XCircle className="w-5 h-5 text-rose-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback & Next */}
              {selectedOption !== null && (
                <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    {selectedOption === currentQuestion.correctAnswer ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-700 mt-0.5 shrink-0" />
                    )}
                    <div className="text-sm">
                      <div
                        className={
                          selectedOption === currentQuestion.correctAnswer
                            ? "font-semibold text-emerald-800"
                            : "font-semibold text-rose-800"
                        }
                      >
                        {selectedOption === currentQuestion.correctAnswer
                          ? "Chính xác"
                          : "Chưa đúng"}
                      </div>
                      <div className="text-slate-600">
                        <span className="font-jp font-medium text-slate-900">
                          {currentQuestion.kana}
                        </span>{" "}
                        <span className="font-mono-num">
                          ({currentQuestion.romaji})
                        </span>{" "}
                        — {currentQuestion.meaning}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {qIndex + 1 >= questions.length
                      ? "Xem kết quả"
                      : "Câu tiếp theo"}
                  </button>
                </div>
              )}
            </div>
          )}

          {quizStage === "results" && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold font-mono-num text-blue-700">
                  {summary.accuracyPercent}%
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Hoàn thành bài kiểm tra từ vựng
                </h2>
                <p className="text-sm text-slate-600 font-mono-num">
                  Trả lời đúng {summary.correctCount} / {summary.total} câu
                </p>
              </div>

              {/* Question Review List */}
              <div className="border-t border-slate-200 pt-4 divide-y divide-slate-100">
                {questions.map((q, idx) => {
                  const rec = records[idx];
                  const isCorrect = rec?.isCorrect;
                  return (
                    <div
                      key={q.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-1 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-700 mt-1 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-jp text-base font-semibold text-slate-900">
                              {q.kana}
                            </span>
                            <span className="text-xs font-mono-num text-slate-500">
                              {q.romaji}
                            </span>
                            <span className="text-sm text-slate-700">
                              — {q.meaning}
                            </span>
                          </div>
                          {!isCorrect && rec && (
                            <div className="text-xs text-rose-700">
                              Bạn đã chọn: {rec.selected}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSpeak(q.kana, false)}
                        aria-label={`Phát âm ${q.kana}`}
                        className="p-2 text-slate-500 hover:text-blue-700 rounded-lg shrink-0"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => startQuiz()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Làm bài mới
                </button>
                {missedVocabIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => startQuiz(missedVocabIds)}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Làm lại {missedVocabIds.size} câu sai
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setQuizStage("setup")}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Đổi cấu hình
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
