"use client";

import { useState } from "react";

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
  targetLocale: "ja" | "en";
  locale: string;
  context?: string;
  textClassName?: string;
}) {
  const [state, setState] = useState<TranslateState>("idle");
  const [translation, setTranslation] = useState("");
  const [nuanceNote, setNuanceNote] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);

  const isEn = locale === "en";
  const displayText = state === "done" && !showOriginal ? translation : text;

  async function translate() {
    setState("loading");
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLocale, context, locale }),
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
        {state === "idle" && (
          <button
            onClick={translate}
            className="text-xs text-green-700 hover:underline"
          >
            {isEn ? "Translate" : "翻訳"}
          </button>
        )}
        {state === "loading" && (
          <span className="text-xs text-stone-400">
            {isEn ? "Translating…" : "翻訳中…"}
          </span>
        )}
        {state === "error" && (
          <button
            onClick={translate}
            className="text-xs text-red-600 hover:underline"
          >
            {isEn ? "Translation failed — retry" : "翻訳に失敗しました — 再試行"}
          </button>
        )}
        {state === "done" && (
          <button
            onClick={() => setShowOriginal((v) => !v)}
            className="text-xs text-stone-400 hover:text-stone-600 hover:underline"
          >
            {showOriginal
              ? isEn
                ? "Show translation"
                : "翻訳を表示"
              : isEn
                ? "Show original"
                : "原文を表示"}
          </button>
        )}
        {state === "done" && !showOriginal && nuanceNote && (
          <p className="w-full text-xs italic text-stone-400">
            {isEn ? `Note: ${nuanceNote}` : `備考: ${nuanceNote}`}
          </p>
        )}
      </div>
    </div>
  );
}
