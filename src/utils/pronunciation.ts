export type VoiceEngineMode = "auto" | "ai" | "browser";

export interface SpeakResult {
  ok: boolean;
  engine: "ai" | "browser" | "none";
  error?: string;
}

const audioUrlCache = new Map<string, string>();
let aiStatusPromise: Promise<boolean> | null = null;
let aiTtsAvailable = false;
let activeAudio: HTMLAudioElement | null = null;

export async function checkAiTtsAvailable(): Promise<boolean> {
  if (aiStatusPromise) {
    return aiStatusPromise;
  }
  aiStatusPromise = (async () => {
    try {
      const res = await fetch("/api/tts/status");
      if (!res.ok) {
        aiTtsAvailable = false;
        return false;
      }
      const data = (await res.json()) as { aiTtsAvailable?: boolean };
      aiTtsAvailable = Boolean(data.aiTtsAvailable);
      return aiTtsAvailable;
    } catch {
      aiTtsAvailable = false;
      return false;
    }
  })();
  return aiStatusPromise;
}

export function stopSpeaking(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function base64ToWavUrl(base64: string, mimeType = "audio/wav"): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  const jaVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith("ja")
  );
  if (jaVoices.length === 0) {
    return null;
  }
  const preferredNames = ["kyoko", "otoya", "google 日本語", "haruka", "nanami", "ayumi"];
  for (const pref of preferredNames) {
    const match = jaVoices.find((v) => v.name.toLowerCase().includes(pref));
    if (match) {
      return match;
    }
  }
  return jaVoices[0];
}

function speakWithBrowser(text: string, slow: boolean): Promise<SpeakResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      resolve({
        ok: false,
        engine: "none",
        error: "Trình duyệt không hỗ trợ tổng hợp giọng nói.",
      });
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = slow ? 0.7 : 0.95;
      utterance.pitch = 1.0;

      const voice = pickJapaneseVoice();
      if (voice) {
        utterance.voice = voice;
      }

      let settled = false;
      const done = (result: SpeakResult) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };

      utterance.onend = () => done({ ok: true, engine: "browser" });
      utterance.onerror = () => {
        const hasAnyVoice = window.speechSynthesis.getVoices().length > 0;
        done({
          ok: !hasAnyVoice,
          engine: "browser",
          error: hasAnyVoice
            ? "Không thể phát âm bằng giọng trình duyệt."
            : undefined,
        });
      };

      window.speechSynthesis.speak(utterance);
      // Safety resolve in environments where speechSynthesis has no OS audio sink
      setTimeout(() => done({ ok: true, engine: "browser" }), 1800);
    } catch {
      resolve({
        ok: false,
        engine: "none",
        error: "Không thể khởi tạo phát âm.",
      });
    }
  });
}

async function speakWithAi(text: string, slow: boolean): Promise<SpeakResult> {
  const cacheKey = `${slow ? "slow" : "normal"}:${text}`;
  let url = audioUrlCache.get(cacheKey);

  if (!url) {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, slow }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(payload.error || `HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      audioBase64: string;
      mimeType?: string;
    };
    url = base64ToWavUrl(data.audioBase64, data.mimeType || "audio/wav");
    audioUrlCache.set(cacheKey, url);
  }

  return new Promise((resolve) => {
    const audio = new Audio(url);
    activeAudio = audio;
    audio.onended = () => {
      if (activeAudio === audio) {
        activeAudio = null;
      }
      resolve({ ok: true, engine: "ai" });
    };
    audio.onerror = () => {
      if (activeAudio === audio) {
        activeAudio = null;
      }
      resolve({
        ok: false,
        engine: "ai",
        error: "Không thể phát tệp âm thanh.",
      });
    };
    audio.play().catch(() => {
      resolve({
        ok: false,
        engine: "ai",
        error: "Trình duyệt chặn tự động phát âm thanh.",
      });
    });
  });
}

export async function speakJapanese(
  text: string,
  options?: { slow?: boolean; mode?: VoiceEngineMode }
): Promise<SpeakResult> {
  const cleanText = text.trim();
  if (!cleanText) {
    return { ok: false, engine: "none" };
  }

  const slow = Boolean(options?.slow);
  const mode = options?.mode ?? "auto";
  stopSpeaking();

  if (mode === "browser") {
    return speakWithBrowser(cleanText, slow);
  }

  const hasAi = await checkAiTtsAvailable();
  if (mode === "ai" || (mode === "auto" && hasAi)) {
    try {
      const result = await speakWithAi(cleanText, slow);
      if (result.ok) {
        return result;
      }
      if (mode === "ai") {
        return result;
      }
    } catch (err) {
      if (mode === "ai") {
        return {
          ok: false,
          engine: "ai",
          error:
            err instanceof Error
              ? err.message
              : "Dịch vụ phát âm AI gặp sự cố.",
        };
      }
    }
  }

  return speakWithBrowser(cleanText, slow);
}
