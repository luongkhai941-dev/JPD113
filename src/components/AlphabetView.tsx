import { useMemo, useState } from "react";
import { Check, Volume2, PenTool, BookOpen } from "lucide-react";
import { KANA_DATA, KANA_ROWS } from "../data/kanaData";
import { KanaChar, KanaGroup, ScriptMode } from "../types";
import { WritingPad } from "./WritingPad";

interface AlphabetViewProps {
  masteredIds: ReadonlySet<string>;
  onToggleMastered: (id: string) => void;
  onSpeak: (text: string, slow?: boolean) => void;
  isSpeaking: boolean;
}

const SCRIPT_OPTIONS: { id: ScriptMode; label: string }[] = [
  { id: "hiragana", label: "Hiragana" },
  { id: "katakana", label: "Katakana" },
  { id: "both", label: "Song song" },
];

const GROUP_OPTIONS: { id: KanaGroup; label: string; count: number }[] = [
  { id: "basic", label: "Cơ bản", count: 46 },
  { id: "dakuten", label: "Âm đục", count: 25 },
  { id: "yoon", label: "Âm ghép", count: 33 },
];

const VOWEL_HEADERS_5 = ["a", "i", "u", "e", "o"];
const VOWEL_HEADERS_3 = ["ya", "yu", "yo"];

export function AlphabetView({
  masteredIds,
  onToggleMastered,
  onSpeak,
  isSpeaking,
}: AlphabetViewProps) {
  const [scriptMode, setScriptMode] = useState<ScriptMode>("hiragana");
  const [group, setGroup] = useState<KanaGroup>("basic");
  const [showRomaji, setShowRomaji] = useState(true);
  const [selectedId, setSelectedId] = useState<string>("a");
  const [inspectorTab, setInspectorTab] = useState<"guide" | "write">("guide");

  const filteredRows = useMemo(() => {
    const rowNames = KANA_ROWS[group] || [];
    const items = KANA_DATA.filter((k) => k.group === group);
    const colCount = group === "yoon" ? 3 : 5;

    return rowNames.map((rowName) => {
      const rowItems = items.filter((k) => k.row === rowName);
      const cells: (KanaChar | null)[] = Array.from({ length: colCount }, (_, colIdx) => {
        return rowItems.find((item) => item.col === colIdx) ?? null;
      });
      return { rowName, cells };
    });
  }, [group]);

  const selectedKana = useMemo(() => {
    return (
      KANA_DATA.find((k) => k.id === selectedId) ??
      KANA_DATA.find((k) => k.group === group) ??
      KANA_DATA[0]
    );
  }, [selectedId, group]);

  const handleGroupChange = (nextGroup: KanaGroup) => {
    setGroup(nextGroup);
    const firstInGroup = KANA_DATA.find((k) => k.group === nextGroup);
    if (firstInGroup) {
      setSelectedId(firstInGroup.id);
    }
  };

  const handleCellClick = (kana: KanaChar) => {
    setSelectedId(kana.id);
    onSpeak(kana.hiragana, false);
  };

  const masteredTotal = masteredIds.size;
  const colHeaders = group === "yoon" ? VOWEL_HEADERS_3 : VOWEL_HEADERS_5;
  const activeChar =
    scriptMode === "katakana" ? selectedKana.katakana : selectedKana.hiragana;

  return (
    <section aria-labelledby="alphabet-heading" className="space-y-6">
      {/* Page Header & Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h1
              id="alphabet-heading"
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"
            >
              Bảng chữ cái tiếng Nhật
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Nhấn vào từng chữ để nghe phát âm chuẩn bản ngữ, xem mẹo nhớ và luyện viết.
            </p>
          </div>
          <div className="text-sm text-slate-600 font-mono-num whitespace-nowrap">
            Đã thuộc: <span className="font-semibold text-slate-900">{masteredTotal}</span> / 104 chữ
          </div>
        </div>

        {/* Workspace Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Script segmented control */}
            <div
              role="group"
              aria-label="Chọn hệ chữ"
              className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200"
            >
              {SCRIPT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScriptMode(opt.id)}
                  aria-pressed={scriptMode === opt.id}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                    scriptMode === opt.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Group segmented control */}
            <div
              role="group"
              aria-label="Chọn nhóm âm"
              className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200"
            >
              {GROUP_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleGroupChange(opt.id)}
                  aria-pressed={group === opt.id}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                    group === opt.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {opt.label} ({opt.count})
                </button>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRomaji}
              onChange={(e) => setShowRomaji(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
            />
            <span>Hiện Romaji</span>
          </label>
        </div>
      </div>

      {/* Two-Zone Sandbox Layout: Chart (left) + Detail Inspector (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left Zone: Interactive Kana Matrix */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
          {/* Column headers */}
          <div
            className={`grid gap-2 sm:gap-3 mb-3 ${
              group === "yoon" ? "grid-cols-3" : "grid-cols-5"
            }`}
          >
            {colHeaders.map((h) => (
              <div
                key={h}
                className="text-center text-xs font-mono-num font-medium text-slate-400"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Character Rows */}
          <div className="space-y-2 sm:space-y-3">
            {filteredRows.map(({ rowName, cells }) => (
              <div
                key={rowName}
                className={`grid gap-2 sm:gap-3 ${
                  group === "yoon" ? "grid-cols-3" : "grid-cols-5"
                }`}
              >
                {cells.map((kana, idx) => {
                  if (!kana) {
                    return (
                      <div
                        key={`${rowName}-empty-${idx}`}
                        aria-hidden="true"
                        className="min-h-[68px] sm:min-h-[76px] rounded-lg bg-slate-50/60 border border-dashed border-slate-200/70"
                      />
                    );
                  }

                  const isSelected = selectedKana.id === kana.id;
                  const isMastered = masteredIds.has(kana.id);

                  return (
                    <button
                      key={kana.id}
                      type="button"
                      onClick={() => handleCellClick(kana)}
                      aria-label={`Chữ ${
                        scriptMode === "katakana" ? kana.katakana : kana.hiragana
                      }, đọc là ${kana.romaji}${isMastered ? ", đã thuộc" : ""}`}
                      aria-pressed={isSelected}
                      className={`group relative min-h-[68px] sm:min-h-[76px] px-2 py-2.5 rounded-lg border flex flex-col items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 ${
                        isSelected
                          ? "bg-blue-50/80 border-blue-700 text-slate-900"
                          : isMastered
                          ? "bg-emerald-50/40 border-emerald-200 hover:border-emerald-400 text-slate-900"
                          : "bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-900"
                      }`}
                    >
                      {isMastered && (
                        <Check
                          aria-hidden="true"
                          className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-emerald-700"
                        />
                      )}

                      {scriptMode === "both" ? (
                        <div className="flex items-baseline gap-1.5 font-jp">
                          <span className="text-xl sm:text-2xl font-medium leading-none">
                            {kana.hiragana}
                          </span>
                          <span className="text-sm sm:text-base text-slate-500 leading-none">
                            {kana.katakana}
                          </span>
                        </div>
                      ) : (
                        <span className="font-jp text-2xl sm:text-[28px] font-medium leading-none">
                          {scriptMode === "katakana"
                            ? kana.katakana
                            : kana.hiragana}
                        </span>
                      )}

                      {showRomaji && (
                        <span
                          className={`mt-1.5 text-xs font-mono-num ${
                            isSelected ? "text-blue-800 font-semibold" : "text-slate-500"
                          }`}
                        >
                          {kana.romaji}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Zone: Sticky Character Detail Inspector */}
        <aside
          aria-label="Chi tiết chữ cái"
          className="bg-white border border-slate-200 rounded-xl p-5 lg:sticky lg:top-24 space-y-5"
        >
          {/* Top Hero Display */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-baseline gap-3.5 min-w-0">
              <div className="font-jp text-6xl font-bold leading-none text-slate-900 shrink-0">
                {activeChar}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="text-xl font-semibold font-mono-num text-blue-700">
                  {selectedKana.romaji}
                </div>
                <div className="text-xs text-slate-500 whitespace-nowrap">
                  {scriptMode === "katakana"
                    ? `Hiragana: ${selectedKana.hiragana}`
                    : `Katakana: ${selectedKana.katakana}`}
                  <span aria-hidden="true"> · </span>
                  <span>
                    {scriptMode === "katakana"
                      ? selectedKana.strokeCountKata
                      : selectedKana.strokeCountHira}{" "}
                    nét
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggleMastered(selectedKana.id)}
              aria-pressed={masteredIds.has(selectedKana.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border whitespace-nowrap shrink-0 transition-colors ${
                masteredIds.has(selectedKana.id)
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {masteredIds.has(selectedKana.id) ? "Đã thuộc" : "Đánh dấu thuộc"}
            </button>
          </div>

          {/* Audio Controls */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onSpeak(selectedKana.hiragana, false)}
              disabled={isSpeaking}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-70 rounded-lg transition-colors"
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              Phát âm
            </button>
            <button
              type="button"
              onClick={() => onSpeak(selectedKana.hiragana, true)}
              disabled={isSpeaking}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-70 rounded-lg transition-colors"
            >
              Đọc chậm
            </button>
          </div>

          {/* Inspector Sub-tabs (Guide vs Writing Pad) */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setInspectorTab("guide")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  inspectorTab === "guide"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Cách đọc &amp; Ví dụ
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab("write")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  inspectorTab === "write"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                Luyện viết tay
              </button>
            </div>

            {inspectorTab === "guide" ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xs font-semibold text-slate-500 mb-1">
                    Hướng dẫn phát âm
                  </h2>
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {selectedKana.viTip}
                  </p>
                </div>

                <div>
                  <h2 className="text-xs font-semibold text-slate-500 mb-1">
                    Mẹo ghi nhớ
                  </h2>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {selectedKana.mnemonic}
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <h2 className="text-xs font-semibold text-slate-500 mb-2">
                    Từ vựng ví dụ
                  </h2>
                  <ul className="divide-y divide-slate-100">
                    {selectedKana.examples.map((ex) => (
                      <li
                        key={ex.jp}
                        className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="font-jp text-base font-medium text-slate-900">
                              {ex.jp}
                            </span>
                            <span className="text-xs font-mono-num text-slate-500">
                              {ex.romaji}
                            </span>
                          </div>
                          <div className="text-xs text-slate-600">{ex.vi}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSpeak(ex.jp, false)}
                          aria-label={`Phát âm từ ${ex.jp}`}
                          className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <WritingPad guideChar={activeChar} />
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
