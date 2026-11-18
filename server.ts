import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MAX_CACHE_ENTRIES = 500;

const ttsCache = new Map<string, string>();

function getApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === "MY_GEMINI_API_KEY") {
    return undefined;
  }
  return key;
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    apiVersion: "v1beta",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function setCachedAudio(cacheKey: string, audioBase64: string): void {
  if (ttsCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ttsCache.keys().next().value;
    if (oldestKey !== undefined) {
      ttsCache.delete(oldestKey);
    }
  }
  ttsCache.set(cacheKey, audioBase64);
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/tts/status", (_req, res) => {
    res.json({
      aiTtsAvailable: Boolean(getApiKey()),
      model: "gemini-3.8-flash-lite-tts",
    });
  });

  app.post("/api/tts", async (req, res) => {
    const rawText = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    const slow = Boolean(req.body?.slow);

    if (!rawText || rawText.length > 120) {
      res.status(400).json({
        error: "Vui lòng cung cấp nội dung tiếng Nhật hợp lệ (tối đa 120 ký tự).",
      });
      return;
    }

    const cacheKey = `${slow ? "slow" : "normal"}:${rawText}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      res.json({ audioBase64: cached, mimeType: "audio/wav", cached: true });
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json({
        error: "Dịch vụ giọng đọc AI chưa được cấu hình GEMINI_API_KEY.",
      });
      return;
    }

    try {
      const styleInstruction = slow
        ? "Speak slowly, clearly, and crisply in standard Tokyo Japanese native accent, suitable for a Japanese language learner."
        : "Speak naturally and clearly in standard Tokyo Japanese native accent.";

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.8-flash-lite-tts",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: rawText,
                  speechMetadata: {
                    style: styleInstruction,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" },
              },
            },
          },
        });
      } catch (metaErr) {
        const metaMsg = metaErr instanceof Error ? metaErr.message : "";
        if (metaMsg.includes("speechMetadata")) {
          response = await ai.models.generateContent({
            model: "gemini-3.8-flash-lite-tts",
            contents: [{ role: "user", parts: [{ text: rawText }] }],
            config: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: "Kore" },
                },
              },
            },
          });
        } else {
          throw metaErr;
        }
      }

      const base64Audio =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (!base64Audio) {
        res.status(502).json({
          error: "Không nhận được dữ liệu âm thanh từ dịch vụ phát âm.",
        });
        return;
      }

      setCachedAudio(cacheKey, base64Audio);
      res.json({
        audioBase64: base64Audio,
        mimeType: "audio/wav",
        cached: false,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Lỗi kết nối dịch vụ phát âm.";
      res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
