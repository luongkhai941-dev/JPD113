import { useCallback, useEffect, useMemo, useState } from "react";
import { AlphabetView } from "./components/AlphabetView";
import { FlashcardView } from "./components/FlashcardView";
import { KanaQuizView } from "./components/KanaQuizView";
import { TopNav } from "./components/TopNav";
import { VocabView } from "./components/VocabView";
import { AppTab } from "./types";
import {
  checkAiTtsAvailable,
  speakJapanese,
  VoiceEngineMode,
} from "./utils/pronunciation";

const STORAGE_KEY_MASTERED = "kanastudio_mastered_v1";

function loadMasteredIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_MASTERED);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((x): x is string => typeof x === "string"));
    }
  } catch {
    // Ignore storage read errors
  }
  return new Set();
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("alphabet");
  const [masteredIds, setMasteredIds] = useState<Set<string>>(() =>
    loadMasteredIds()
  );
  const [voiceMode, setVoiceMode] = useState<VoiceEngineMode>("auto");
  const [aiAvailable, setAiAvailable] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechNotice, setSpeechNotice] = useState<string | null>(null);

  useEffect(() => {
    checkAiTtsAvailable().then((ok) => setAiAvailable(ok));
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEY_MASTERED,
        JSON.stringify(Array.from(masteredIds))
      );
    } catch {
      // Ignore storage write errors
    }
  }, [masteredIds]);

  const handleToggleMastered = useCallback((id: string) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSetMastered = useCallback((id: string, mastered: boolean) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (mastered) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSpeak = useCallback(
    async (text: string, slow = false) => {
      setIsSpeaking(true);
      setSpeechNotice(null);
      try {
        const res = await speakJapanese(text, { slow, mode: voiceMode });
        if (!res.ok && res.error) {
          setSpeechNotice(res.error);
        }
      } finally {
        setIsSpeaking(false);
      }
    },
    [voiceMode]
  );

  const masteredSetReadonly = useMemo(() => masteredIds, [masteredIds]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      <TopNav activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {speechNotice && (
          <div
            role="status"
            className="mb-4 px-4 py-2.5 text-xs sm:text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3"
          >
            <span>{speechNotice}</span>
            <button
              type="button"
              onClick={() => setSpeechNotice(null)}
              className="text-xs font-semibold underline shrink-0"
            >
              Đóng
            </button>
          </div>
        )}

        {activeTab === "alphabet" && (
          <AlphabetView
            masteredIds={masteredSetReadonly}
            onToggleMastered={handleToggleMastered}
            onSpeak={handleSpeak}
            isSpeaking={isSpeaking}
          />
        )}

        {activeTab === "flashcard" && (
          <FlashcardView
            masteredIds={masteredSetReadonly}
            onSetMastered={handleSetMastered}
            onSpeak={handleSpeak}
          />
        )}

        {activeTab === "vocab" && <VocabView onSpeak={handleSpeak} />}

        {activeTab === "quiz" && <KanaQuizView onSpeak={handleSpeak} />}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            KanaStudio — Học Hiragana, Katakana &amp; Từ vựng tiếng Nhật cơ bản
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="voice-engine-select" className="text-slate-600">
              Giọng đọc:
            </label>
            <select
              id="voice-engine-select"
              value={voiceMode}
              onChange={(e) =>
                setVoiceMode(e.target.value as VoiceEngineMode)
              }
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-700"
            >
              <option value="auto">
                {aiAvailable
                  ? "Tự động (Ưu tiên giọng AI bản ngữ)"
                  : "Tự động (Giọng Nhật ja-JP)"}
              </option>
              <option value="browser">Giọng trình duyệt (ja-JP)</option>
              {aiAvailable && (
                <option value="ai">Giọng AI bản ngữ (Gemini TTS)</option>
              )}
            </select>
          </div>
        </div>
      </footer>
    </div>
  );
}
