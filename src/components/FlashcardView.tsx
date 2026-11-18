import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, Shuffle, Volume2, X } from "lucide-react";
import { KANA_DATA } from "../data/kanaData";
import {
  FlashcardFrontMode,
  FlashcardRating,
  KanaChar,
  KanaGroup,
  ScriptMode,
} from "../types";
import {
  applyFlashcardRating,
  filterKanaDeck,
  shuffleArray,
} from "../utils/quizLogic";

interface FlashcardViewProps {
  masteredIds: ReadonlySet<string>;
  onSetMastered: (id: string, mastered: boolean) => void;
  onSpeak: (text: string, slow?: boolean) => void;
}

export function FlashcardView({
  masteredIds,
  onSetMastered,
  onSpeak,
}: FlashcardViewProps) {
  const [script, setScript] = useState<ScriptMode>("hiragana");
  const [group, setGroup] = useState<KanaGroup | "all">("basic");
  const [frontMode, setFrontMode] =
    useState<FlashcardFrontMode>("kana_to_romaji");
  const [onlyUnmastered, setOnlyUnmastered] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);

  const [queue, setQueue] = useState<KanaChar[]>(() =>
    filterKanaDeck(KANA_DATA, "basic", false, masteredIds)
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionMissed, setSessionMissed] = useState<KanaChar[]>([]);
  const [sessionMasteredCount, setSessionMasteredCount] = useState(0);

  const buildDeck = useCallback(
    (
      nextGroup: KanaGroup | "all",
      nextOnlyUnmastered: boolean,
      shouldShuffle: boolean
    ) => {
      const base = filterKanaDeck(
        KANA_DATA,
        nextGroup,
        nextOnlyUnmastered,
        masteredIds
      );
      const nextQueue = shouldShuffle ? shuffleArray(base) : base;
      setQueue(nextQueue);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsComplete(nextQueue.length === 0);
      setSessionMissed([]);
      setSessionMasteredCount(0);
    },
    [masteredIds]
  );

  const handleGroupChange = (nextGroup: KanaGroup | "all") => {
    setGroup(nextGroup);
    buildDeck(nextGroup, onlyUnmastered, false);
  };

  const handleUnmasteredToggle = (checked: boolean) => {
    setOnlyUnmastered(checked);
    buildDeck(group, checked, false);
  };

  const handleShuffle = () => {
    buildDeck(group, onlyUnmastered, true);
  };

  const currentCard = queue[currentIndex];

  const getFrontDisplay = useMemo(() => {
    if (!currentCard) return "";
    if (script === "katakana") return currentCard.katakana;
    if (script === "both") {
      return currentIndex % 2 === 0
        ? currentCard.hiragana
        : currentCard.katakana;
    }
    return currentCard.hiragana;
  }, [currentCard, script, currentIndex]);

  useEffect(() => {
    if (
      currentCard &&
      !isComplete &&
      (autoPlayAudio || frontMode === "audio_to_kana")
    ) {
      onSpeak(currentCard.hiragana, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentCard?.id, isComplete, frontMode]);

  const handleFlip = useCallback(() => {
    if (!currentCard || isComplete) return;
    setIsFlipped((prev) => {
      const next = !prev;
      if (next && !autoPlayAudio && frontMode !== "audio_to_kana") {
        onSpeak(currentCard.hiragana, false);
      }
      return next;
    });
  }, [currentCard, isComplete, autoPlayAudio, frontMode, onSpeak]);

  const handleRate = useCallback(
    (rating: FlashcardRating) => {
      if (!currentCard || isComplete) return;

      if (rating === "mastered") {
        onSetMastered(currentCard.id, true);
        setSessionMasteredCount((c) => c + 1);
      } else if (rating === "again") {
        onSetMastered(currentCard.id, false);
        setSessionMissed((prev) =>
          prev.some((k) => k.id === currentCard.id)
            ? prev
            : [...prev, currentCard]
        );
      }

      const result = applyFlashcardRating(queue, currentIndex, rating);
      setQueue(result.nextQueue);
      setCurrentIndex(result.nextIndex);
      setIsComplete(result.isComplete);
      setIsFlipped(false);
    },
    [currentCard, isComplete, onSetMastered, queue, currentIndex]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "SELECT" ||
          target.tagName === "TEXTAREA")
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (e.key.toLowerCase() === "p" && currentCard && !isComplete) {
        e.preventDefault();
        onSpeak(currentCard.hiragana, false);
      } else if (isFlipped && !isComplete) {
        if (e.key === "ArrowLeft" || e.key === "1") {
          handleRate("again");
        } else if (e.key === "2") {
          handleRate("hard");
        } else if (e.key === "ArrowRight" || e.key === "3") {
          handleRate("mastered");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleFlip, handleRate, currentCard, isComplete, isFlipped, onSpeak]);

  const activeDeckCount = filterKanaDeck(
    KANA_DATA,
    group,
    onlyUnmastered,
    masteredIds
  ).length;

  return (
    <section aria-labelledby="flashcard-heading" className="space-y-6">
      {/* Header & Deck Config */}
      <div className="space-y-4 border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1
              id="flashcard-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
            >
              Luyện tập Flashcard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Tự kiểm tra trí nhớ mặt chữ và phản xạ phát âm theo từng nhóm âm.
            </p>
          </div>
          <div className="text-sm text-slate-600 font-mono-num">
            {queue.length > 0 && !isComplete
              ? `Thẻ ${Math.min(currentIndex + 1, queue.length)} / ${queue.length}`
              : `${activeDeckCount} thẻ khả dụng`}
          </div>
        </div>

        {/* Config Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Hệ chữ Flashcard"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200"
          >
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
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  script === opt.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div
            role="group"
            aria-label="Nhóm âm Flashcard"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200"
          >
            {(
              [
                { id: "basic", label: "Cơ bản" },
                { id: "dakuten", label: "Âm đục" },
                { id: "yoon", label: "Âm ghép" },
                { id: "all", label: "Tất cả" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleGroupChange(opt.id)}
                className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                  group === opt.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="flashcard-front-mode"
              className="text-xs font-medium text-slate-600 sr-only"
            >
              Chế độ mặt trước
            </label>
            <select
              id="flashcard-front-mode"
              value={frontMode}
              onChange={(e) =>
                setFrontMode(e.target.value as FlashcardFrontMode)
              }
              className="px-3 py-1.5 text-xs sm:text-sm font-medium bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="kana_to_romaji">Mặt chữ → Romaji</option>
              <option value="audio_to_kana">Nghe âm → Mặt chữ</option>
              <option value="romaji_to_kana">Romaji → Mặt chữ</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyUnmastered}
              onChange={(e) => handleUnmasteredToggle(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
            />
            <span>Chỉ chữ chưa thuộc</span>
          </label>

          <label className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoPlayAudio}
              onChange={(e) => setAutoPlayAudio(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
            />
            <span>Tự phát âm</span>
          </label>

          <button
            type="button"
            onClick={handleShuffle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5" />
            Trộn thẻ
          </button>
        </div>
      </div>

      {/* Main Flashcard Stage */}
      {queue.length === 0 ? (
        <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Bạn đã thuộc hết các chữ trong nhóm này
          </h2>
          <p className="text-sm text-slate-600">
            Bỏ chọn &ldquo;Chỉ chữ chưa thuộc&rdquo; để ôn tập lại toàn bộ nhóm chữ hoặc chuyển sang nhóm khác.
          </p>
          <button
            type="button"
            onClick={() => handleUnmasteredToggle(false)}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
          >
            Hiển thị tất cả thẻ
          </button>
        </div>
      ) : isComplete ? (
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">
              Hoàn thành phiên ôn tập
            </h2>
            <p className="text-sm text-slate-600">
              Đã ghi nhớ{" "}
              <span className="font-semibold font-mono-num text-emerald-700">
                {sessionMasteredCount}
              </span>{" "}
              chữ trong phiên này · Cần ôn thêm{" "}
              <span className="font-semibold font-mono-num text-slate-900">
                {sessionMissed.length}
              </span>{" "}
              chữ.
            </p>
          </div>

          {sessionMissed.length > 0 && (
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-500">
                Các chữ bạn đã đánh dấu chưa nhớ
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {sessionMissed.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSpeak(item.hiragana, false)}
                    className="flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-jp text-xl font-medium text-slate-900">
                        {script === "katakana" ? item.katakana : item.hiragana}
                      </span>
                      <span className="text-xs font-mono-num text-slate-600">
                        {item.romaji}
                      </span>
                    </div>
                    <Volume2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => buildDeck(group, onlyUnmastered, true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Ôn lại bộ thẻ
            </button>
            {!onlyUnmastered && (
              <button
                type="button"
                onClick={() => {
                  setOnlyUnmastered(true);
                  buildDeck(group, true, true);
                }}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Chỉ ôn chữ chưa thuộc
              </button>
            )}
          </div>
        </div>
      ) : (
        currentCard && (
          <div className="max-w-lg mx-auto space-y-5">
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-700 transition-all duration-200"
                style={{
                  width: `${Math.round(((currentIndex + 1) / queue.length) * 100)}%`,
                }}
              />
            </div>

            {/* 3D Flip Card */}
            <div className="card-perspective">
              <div
                className={`card-inner relative w-full min-h-[340px] ${
                  isFlipped ? "is-flipped" : ""
                }`}
              >
                {/* Front Face */}
                <div className="card-face absolute inset-0 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {frontMode === "kana_to_romaji"
                        ? "Nhìn mặt chữ, đoán cách đọc"
                        : frontMode === "audio_to_kana"
                        ? "Nghe âm thanh, hình dung mặt chữ"
                        : "Nhìn Romaji, nhớ mặt chữ"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSpeak(currentCard.hiragana, false)}
                      aria-label="Phát âm thẻ hiện tại"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                      Phát âm
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    {frontMode === "audio_to_kana" ? (
                      <button
                        type="button"
                        onClick={() => onSpeak(currentCard.hiragana, false)}
                        className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-800 transition-colors"
                      >
                        <Volume2 className="w-10 h-10" />
                        <span className="text-sm font-semibold">
                          Nhấn để nghe lại âm
                        </span>
                      </button>
                    ) : frontMode === "romaji_to_kana" ? (
                      <div className="text-5xl sm:text-6xl font-bold font-mono-num text-slate-900">
                        {currentCard.romaji}
                      </div>
                    ) : (
                      <div className="font-jp text-7xl sm:text-8xl font-bold leading-none text-slate-900">
                        {getFrontDisplay}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleFlip}
                      className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      Lật thẻ xem đáp án
                    </button>
                  </div>
                </div>

                {/* Back Face */}
                <div className="card-face card-face-back absolute inset-0 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-3">
                      <span className="font-jp text-4xl font-bold text-slate-900">
                        {currentCard.hiragana}
                      </span>
                      <span className="font-jp text-2xl text-slate-500">
                        {currentCard.katakana}
                      </span>
                      <span className="text-xl font-semibold font-mono-num text-blue-700">
                        {currentCard.romaji}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSpeak(currentCard.hiragana, false)}
                        aria-label="Phát âm đáp án"
                        className="p-2 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFlipped(false)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded border border-slate-200"
                      >
                        Mặt trước
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-b border-slate-100 py-4 my-2">
                    <p className="text-sm text-slate-800 leading-relaxed">
                      <span className="font-semibold text-slate-900">Cách đọc: </span>
                      {currentCard.viTip}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-700">Mẹo nhớ: </span>
                      {currentCard.mnemonic}
                    </p>
                    {currentCard.examples[0] && (
                      <div className="flex items-center justify-between pt-1 text-xs text-slate-700">
                        <div>
                          <span className="font-jp text-sm font-medium text-slate-900">
                            {currentCard.examples[0].jp}
                          </span>{" "}
                          <span className="font-mono-num text-slate-500">
                            ({currentCard.examples[0].romaji})
                          </span>{" "}
                          <span>— {currentCard.examples[0].vi}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            onSpeak(currentCard.examples[0].jp, false)
                          }
                          aria-label={`Phát âm ví dụ ${currentCard.examples[0].jp}`}
                          className="p-1.5 text-slate-600 hover:text-blue-700 rounded"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Rating Controls */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleRate("again")}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 shrink-0" />
                      Chưa nhớ
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRate("hard")}
                      className="px-3 py-2.5 text-xs sm:text-sm font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                    >
                      Hơi phân vân
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRate("mastered")}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4 shrink-0" />
                      Đã thuộc
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Subtle keyboard shortcut tip */}
            <p className="text-center text-xs text-slate-500">
              Phím tắt: Space để lật thẻ · P để nghe lại · Phím 1 / 2 / 3 để đánh giá
            </p>
          </div>
        )
      )}
    </section>
  );
}
