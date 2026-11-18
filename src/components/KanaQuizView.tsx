import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, Volume2, XCircle } from "lucide-react";
import { KANA_DATA } from "../data/kanaData";
import {
  KanaGroup,
  KanaQuizQuestion,
  KanaQuizType,
  QuizAnswerRecord,
  ScriptMode,
} from "../types";
import {
  generateKanaQuizQuestions,
  scoreQuizAttempt,
} from "../utils/quizLogic";

interface KanaQuizViewProps {
  onSpeak: (text: string, slow?: boolean) => void;
}

type Stage = "setup" | "active" | "results";

export function KanaQuizView({ onSpeak }: KanaQuizViewProps) {
  const [script, setScript] = useState<ScriptMode>("hiragana");
  const [group, setGroup] = useState<KanaGroup | "all">("basic");
  const [questionType, setQuestionType] = useState<KanaQuizType | "mixed">(
    "mixed"
  );
  const [count, setCount] = useState<number>(10);

  const [stage, setStage] = useState<Stage>("setup");
  const [questions, setQuestions] = useState<KanaQuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [records, setRecords] = useState<QuizAnswerRecord[]>([]);

  const startQuiz = useCallback(
    (onlyIds?: ReadonlySet<string>) => {
      const pool = onlyIds
        ? KANA_DATA.filter((k) => onlyIds.has(k.id))
        : KANA_DATA;
      const generated = generateKanaQuizQuestions(pool, {
        script,
        group: onlyIds ? "all" : group,
        questionType,
        count: onlyIds ? pool.length : count,
      });
      setQuestions(generated);
      setQIndex(0);
      setSelectedOption(null);
      setRecords([]);
      setStage("active");

      if (generated[0]?.promptType === "audio_to_kana") {
        onSpeak(generated[0].audioText, false);
      }
    },
    [script, group, questionType, count, onSpeak]
  );

  const currentQuestion = questions[qIndex];

  const handleSelectOption = useCallback(
    (opt: string) => {
      if (!currentQuestion || selectedOption !== null) return;
      const isCorrect = opt === currentQuestion.correctAnswer;
      setSelectedOption(opt);
      setRecords((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          selected: opt,
          correct: currentQuestion.correctAnswer,
          isCorrect,
        },
      ]);
      onSpeak(currentQuestion.audioText, false);
    },
    [currentQuestion, selectedOption, onSpeak]
  );

  const handleNext = useCallback(() => {
    if (qIndex + 1 >= questions.length) {
      setStage("results");
      return;
    }
    const nextIdx = qIndex + 1;
    setQIndex(nextIdx);
    setSelectedOption(null);
    if (questions[nextIdx]?.promptType === "audio_to_kana") {
      onSpeak(questions[nextIdx].audioText, false);
    }
  }, [qIndex, questions, onSpeak]);

  useEffect(() => {
    if (stage !== "active" || !currentQuestion) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (selectedOption === null) {
        const idx = ["1", "2", "3", "4"].indexOf(e.key);
        if (idx !== -1 && currentQuestion.options[idx]) {
          handleSelectOption(currentQuestion.options[idx]);
        }
      } else if (e.key === "Enter" || e.code === "Space") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [stage, currentQuestion, selectedOption, handleSelectOption, handleNext]);

  const summary = useMemo(() => scoreQuizAttempt(records), [records]);

  const missedKanaIds = useMemo(() => {
    const missedQIds = new Set(summary.incorrectRecords.map((r) => r.questionId));
    const ids = new Set<string>();
    for (const q of questions) {
      if (missedQIds.has(q.id)) {
        ids.add(q.kanaId);
      }
    }
    return ids;
  }, [summary.incorrectRecords, questions]);

  return (
    <section aria-labelledby="kana-quiz-heading" className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <h1
          id="kana-quiz-heading"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
        >
          Kiểm tra bảng chữ cái
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Kiểm tra nhanh khả năng nhận diện mặt chữ, nghe phát âm và đối chiếu Hiragana / Katakana.
        </p>
      </div>

      {stage === "setup" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-5">
          <div>
            <span className="block text-sm font-medium text-slate-800 mb-1.5">
              Hệ chữ
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: "hiragana", label: "Hiragana" },
                  { id: "katakana", label: "Katakana" },
                  { id: "both", label: "Cả hai" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScript(opt.id)}
                  aria-pressed={script === opt.id}
                  className={`py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                    script === opt.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-800 mb-1.5">
              Nhóm âm
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(
                [
                  { id: "basic", label: "Cơ bản (46)" },
                  { id: "dakuten", label: "Âm đục (25)" },
                  { id: "yoon", label: "Âm ghép (33)" },
                  { id: "all", label: "Tất cả (104)" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGroup(opt.id)}
                  aria-pressed={group === opt.id}
                  className={`py-2.5 px-2 text-xs sm:text-sm font-medium rounded-lg border transition-colors ${
                    group === opt.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="kq-type"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Dạng câu hỏi
            </label>
            <select
              id="kq-type"
              value={questionType}
              onChange={(e) =>
                setQuestionType(e.target.value as KanaQuizType | "mixed")
              }
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="mixed">Hỗn hợp (Đọc chữ, nghe âm, đối chiếu)</option>
              <option value="kana_to_romaji">Nhìn chữ → Chọn Romaji</option>
              <option value="audio_to_kana">Nghe phát âm → Chọn mặt chữ</option>
              <option value="hira_to_kata">Đối chiếu Hiragana ↔ Katakana</option>
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-slate-800 mb-1.5">
              Số câu hỏi
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              {[10, 15, 20].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  aria-pressed={count === n}
                  className={`py-2 text-sm font-mono-num font-semibold rounded-lg border transition-colors ${
                    count === n
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {n} câu
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => startQuiz()}
            className="w-full py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            Bắt đầu kiểm tra
          </button>
        </div>
      )}

      {stage === "active" && currentQuestion && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
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

          <div className="py-4 text-center space-y-3">
            <p className="text-xs font-medium text-slate-500">
              {currentQuestion.displayHint}
            </p>
            {currentQuestion.promptType === "audio_to_kana" ? (
              <button
                type="button"
                onClick={() => onSpeak(currentQuestion.audioText, false)}
                className="inline-flex items-center gap-2.5 px-6 py-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-800 font-semibold transition-colors"
              >
                <Volume2 className="w-6 h-6" />
                Nghe phát âm
              </button>
            ) : (
              <div className="space-y-2">
                <div className="font-jp text-7xl font-bold leading-none text-slate-900">
                  {currentQuestion.promptText}
                </div>
                <button
                  type="button"
                  onClick={() => onSpeak(currentQuestion.audioText, false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                  Nghe âm
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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
                  style = "bg-rose-50 border-rose-500 text-rose-900";
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
                  className={`px-4 py-4 rounded-xl border flex items-center justify-between gap-2 transition-colors ${style}`}
                >
                  <span
                    className={
                      currentQuestion.promptType === "kana_to_romaji"
                        ? "font-mono-num text-xl font-semibold"
                        : "font-jp text-2xl font-medium"
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

          {selectedOption !== null && (
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm">
                {selectedOption === currentQuestion.correctAnswer ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                    <span className="font-semibold text-emerald-800">
                      Chính xác!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-rose-700 shrink-0" />
                    <span className="text-rose-800">
                      Đáp án đúng là{" "}
                      <strong className="font-jp">
                        {currentQuestion.correctAnswer}
                      </strong>
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
              >
                {qIndex + 1 >= questions.length
                  ? "Xem kết quả"
                  : "Câu tiếp theo"}
              </button>
            </div>
          )}
        </div>
      )}

      {stage === "results" && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold font-mono-num text-blue-700">
              {summary.accuracyPercent}%
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Hoàn thành bài kiểm tra
            </h2>
            <p className="text-sm text-slate-600 font-mono-num">
              Đúng {summary.correctCount} / {summary.total} câu
            </p>
          </div>

          <div className="border-t border-slate-200 pt-4 divide-y divide-slate-100">
            {questions.map((q, idx) => {
              const rec = records[idx];
              const kanaItem = KANA_DATA.find((k) => k.id === q.kanaId);
              return (
                <div
                  key={q.id}
                  className="py-2.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    {rec?.isCorrect ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                    )}
                    <span className="font-jp text-lg font-semibold text-slate-900">
                      {kanaItem?.hiragana} / {kanaItem?.katakana}
                    </span>
                    <span className="font-mono-num text-sm text-slate-600">
                      ({kanaItem?.romaji})
                    </span>
                    {!rec?.isCorrect && rec && (
                      <span className="text-xs text-rose-700">
                        · Chọn: {rec.selected}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onSpeak(q.audioText, false)}
                    aria-label={`Phát âm ${kanaItem?.romaji ?? ""}`}
                    className="p-2 text-slate-500 hover:text-blue-700 rounded-lg"
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
            {missedKanaIds.size > 0 && (
              <button
                type="button"
                onClick={() => startQuiz(missedKanaIds)}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Ôn lại {missedKanaIds.size} chữ sai
              </button>
            )}
            <button
              type="button"
              onClick={() => setStage("setup")}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Đổi cấu hình
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
