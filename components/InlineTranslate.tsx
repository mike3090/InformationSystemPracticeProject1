"use client";

import { useEffect, useRef, useState } from "react";

// Languages available in the picker (shown in order)
const LANGUAGES = [
  { code: "ja", labelEn: "Japanese", labelJa: "日本語" },
  { code: "en", labelEn: "English", labelJa: "英語" },
  { code: "zh", labelEn: "Chinese", labelJa: "中国語" },
  { code: "ko", labelEn: "Korean", labelJa: "韓国語" },
  { code: "es", labelEn: "Spanish", labelJa: "スペイン語" },
  { code: "fr", labelEn: "French", labelJa: "フランス語" },
] as const;

type LangCode = (typeof LANGUAGES)[number]["code"];

function langLabel(code: string, isEn: boolean): string {
  const entry = LANGUAGES.find((l) => l.code === code);
  if (!entry) return code.toUpperCase();
  return isEn ? entry.labelEn : entry.labelJa;
}

type TranslateState = "idle" | "loading" | "done" | "error";

type ApiResult =
  | { ok: true; data: { translation: string; nuanceNote: string | null } }
  | { ok: false; error?: string };

export default function InlineTranslate({
  text,
  targetLocale,
  locale,
  context,
  textClassName,
}: {
  text: string;
  /** Default target language — should match the current site locale */
  targetLocale: "ja" | "en";
  locale: string;
  context?: string;
  textClassName?: string;
}) {
  const isEn = locale === "en";

  const [state, setState] = useState<TranslateState>("idle");
  const [translation, setTranslation] = useState("");
  const [nuanceNote, setNuanceNote] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  // Active target language — starts at site locale, can be changed via picker
  const [activeLang, setActiveLang] = useState<string>(targetLocale);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const displayText = state === "done" && !showOriginal ? translation : text;

  async function translate(lang: string) {
    setActiveLang(lang);
    setPickerOpen(false);
    setState("loading");
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLocale: lang, context, locale }),
      });
      const result = (await res.json()) as ApiResult;
      if (result.ok) {
        setTranslation(result.data.translation);
        setNuanceNote(result.data.nuanceNote ?? null);
        setState("done");
        setShowOriginal(false);
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  return (
    <div>
      <p className={textClassName}>{displayText}</p>

      <div className="mt-1.5 flex flex-wrap items-center gap-3">
        {/* ── Idle: translate button + language picker ── */}
        {(state === "idle" || state === "error") && (
          <>
            <button
              onClick={() => translate(activeLang)}
              className={
                state === "error"
                  ? "text-xs text-red-600 hover:underline"
                  : "text-xs text-green-700 hover:underline"
              }
            >
              {state === "error"
                ? isEn
                  ? "Translation failed — retry"
                  : "翻訳に失敗しました — 再試行"
                : isEn
                  ? `Translate to ${langLabel(activeLang, true)}`
                  : `${langLabel(activeLang, false)}に翻訳`}
            </button>

            {/* Language picker dropdown */}
            <div ref={pickerRef} className="relative">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="text-xs text-stone-400 hover:text-stone-600"
                aria-label={isEn ? "Choose language" : "言語を選ぶ"}
              >
                ▾
              </button>
              {pickerOpen && (
                <div className="absolute left-0 top-5 z-20 min-w-[10rem] rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => translate(lang.code)}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-stone-50 ${
                        lang.code === activeLang
                          ? "font-semibold text-green-700"
                          : "text-stone-700"
                      }`}
                    >
                      {isEn ? lang.labelEn : lang.labelJa}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Loading ── */}
        {state === "loading" && (
          <span className="text-xs text-stone-400">
            {isEn ? "Translating…" : "翻訳中…"}
          </span>
        )}

        {/* ── Done: toggle original + change language ── */}
        {state === "done" && (
          <>
            <button
              onClick={() => setShowOriginal((v) => !v)}
              className="text-xs text-stone-400 hover:text-stone-600 hover:underline"
            >
              {showOriginal
                ? isEn ? "Show translation" : "翻訳を表示"
                : isEn ? "Show original" : "原文を表示"}
            </button>

            {/* Re-translate to a different language */}
            <div ref={pickerRef} className="relative">
              <button
                onClick={() => setPickerOpen((v) => !v)}
                className="text-xs text-stone-400 hover:text-stone-600 hover:underline"
              >
                {isEn
                  ? `Language: ${langLabel(activeLang, true)} ▾`
                  : `言語: ${langLabel(activeLang, false)} ▾`}
              </button>
              {pickerOpen && (
                <div className="absolute left-0 top-5 z-20 min-w-[10rem] rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => translate(lang.code)}
                      className={`w-full px-3 py-1.5 text-left text-xs hover:bg-stone-50 ${
                        lang.code === activeLang
                          ? "font-semibold text-green-700"
                          : "text-stone-700"
                      }`}
                    >
                      {isEn ? lang.labelEn : lang.labelJa}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Nuance note ── */}
        {state === "done" && !showOriginal && nuanceNote && (
          <p className="w-full text-xs italic text-stone-400">
            {isEn ? `Note: ${nuanceNote}` : `備考: ${nuanceNote}`}
          </p>
        )}
      </div>
    </div>
  );
}
