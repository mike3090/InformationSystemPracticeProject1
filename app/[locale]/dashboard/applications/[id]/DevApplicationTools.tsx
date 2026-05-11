"use client";

import { useActionState } from "react";
import {
  devConfirmOwnApplication,
  type ApplicationActionState,
} from "./actions";

const initialState: ApplicationActionState = {
  status: "idle",
  message: "",
};

export default function DevApplicationTools({
  applicationId,
  locale,
}: {
  applicationId: string;
  locale: string;
}) {
  const [state, formAction, isPending] = useActionState(
    devConfirmOwnApplication,
    initialState,
  );

  return (
    <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-amber-950">
            {locale === "en" ? "Local testing" : "ローカルテスト"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            {locale === "en"
              ? "Temporarily confirm your own application so you can test pre-event communication screens."
              : "自分の応募を一時的に参加確定へ変更し、事前連絡の画面をテストできます。"}
          </p>
        </div>
        <form action={formAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="applicationId" value={applicationId} />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-stone-400"
          >
            {isPending
              ? locale === "en"
                ? "Confirming..."
                : "確定中..."
              : locale === "en"
                ? "Mark as confirmed"
                : "参加確定にする"}
          </button>
        </form>
      </div>
      {state.message && (
        <p
          className={`mt-3 text-xs font-medium ${
            state.status === "error" ? "text-red-700" : "text-green-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </section>
  );
}
