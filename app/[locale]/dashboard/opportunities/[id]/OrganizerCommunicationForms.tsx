"use client";

import { useActionState } from "react";
import {
  createOrganizerUpdate,
  replyToVolunteerMessage,
  type ReviewActionState,
} from "./actions";

const initialState: ReviewActionState = {
  status: "idle",
  message: "",
};

export function OrganizerUpdateForm({
  locale,
  opportunityId,
}: {
  locale: string;
  opportunityId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    createOrganizerUpdate,
    initialState,
  );

  return (
    <form action={formAction} className="mt-5 grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <div className="grid gap-4 sm:grid-cols-[0.6fr_1fr]">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {locale === "en" ? "Update type" : "種類"}
          </span>
          <select
            name="type"
            className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="GENERAL">
              {locale === "en" ? "General announcement" : "通常のお知らせ"}
            </option>
            <option value="LOCATION_CHANGE">
              {locale === "en" ? "Location change" : "場所変更"}
            </option>
            <option value="TIME_CHANGE">
              {locale === "en" ? "Time change" : "時間変更"}
            </option>
            <option value="BRING_UPDATE">
              {locale === "en" ? "What to bring" : "持ち物変更"}
            </option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {locale === "en" ? "Highlighted detail" : "強調する変更点"}
          </span>
          <input
            name="highlightedDetail"
            placeholder={
              locale === "en"
                ? "e.g. New meeting point: east gate"
                : "例：集合場所が東門に変更"
            }
            className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
      </div>
      <textarea
        name="message"
        required
        maxLength={1000}
        rows={4}
        placeholder={
          locale === "en"
            ? "Write the update confirmed volunteers should receive"
            : "参加確定者に送るお知らせを書く"
        }
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-xs font-medium ${
            state.status === "error" ? "text-red-700" : "text-green-700"
          }`}
        >
          {state.message}
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {isPending
            ? locale === "en"
              ? "Sending..."
              : "送信中..."
            : locale === "en"
              ? "Send update"
              : "送信"}
        </button>
      </div>
    </form>
  );
}

export function OrganizerReplyForm({
  locale,
  opportunityId,
  applicationId,
}: {
  locale: string;
  opportunityId: string;
  applicationId: string;
}) {
  const [state, formAction, isPending] = useActionState(
    replyToVolunteerMessage,
    initialState,
  );

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <textarea
        name="body"
        required
        maxLength={500}
        rows={3}
        placeholder={
          locale === "en"
            ? "Reply to this volunteer"
            : "このボランティアに返信"
        }
        className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p
          className={`text-xs font-medium ${
            state.status === "error" ? "text-red-700" : "text-green-700"
          }`}
        >
          {state.message}
        </p>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-green-700 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? locale === "en"
              ? "Replying..."
              : "返信中..."
            : locale === "en"
              ? "Reply"
              : "返信"}
        </button>
      </div>
    </form>
  );
}
