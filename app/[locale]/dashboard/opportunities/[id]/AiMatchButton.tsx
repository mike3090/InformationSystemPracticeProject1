"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AiMatchButton({
  opportunityId,
  locale,
  pendingCount,
}: {
  opportunityId: string;
  locale: string;
  pendingCount: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (pendingCount === 0) return null;

  async function runMatch() {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/ai/score-applicants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, locale }),
      });
      const result = (await res.json()) as { ok: boolean; error?: string };
      if (result.ok) {
        setState("done");
        router.refresh();
      } else {
        setState("error");
        setErrorMsg(result.error ?? (locale === "en" ? "Scoring failed." : "スコアリングに失敗しました。"));
      }
    } catch {
      setState("error");
      setErrorMsg(
        locale === "en"
          ? "Network error. Please try again."
          : "ネットワークエラーが発生しました。",
      );
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={runMatch}
        disabled={state === "loading"}
        className="rounded-lg border border-green-700 px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "loading"
          ? locale === "en"
            ? "Scoring…"
            : "スコア計算中…"
          : state === "done"
            ? locale === "en"
              ? "✓ Scores updated"
              : "✓ スコア更新済み"
            : locale === "en"
              ? "Run AI Match"
              : "AI マッチング実行"}
      </button>
      {state === "error" && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}
      {state === "idle" && (
        <p className="text-xs text-stone-500">
          {locale === "en"
            ? `Score ${pendingCount} pending applicant${pendingCount === 1 ? "" : "s"}`
            : `審査中の応募者 ${pendingCount} 名をスコアリング`}
        </p>
      )}
    </div>
  );
}
