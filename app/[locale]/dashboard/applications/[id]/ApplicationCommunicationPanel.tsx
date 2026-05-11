"use client";

import { useActionState } from "react";
import {
  sendOrganizerMessage,
  withdrawConfirmedApplication,
  type ApplicationActionState,
} from "./actions";
import type { EventMessageView } from "@/lib/preEventCommunication";

const initialState: ApplicationActionState = {
  status: "idle",
  message: "",
};

export default function ApplicationCommunicationPanel({
  applicationId,
  locale,
  messages,
  currentUserId,
  canMessage,
}: {
  applicationId: string;
  locale: string;
  messages: EventMessageView[];
  currentUserId: string;
  canMessage: boolean;
}) {
  const [messageState, messageAction, isSending] = useActionState(
    sendOrganizerMessage,
    initialState,
  );
  const [withdrawState, withdrawAction, isWithdrawing] = useActionState(
    withdrawConfirmedApplication,
    initialState,
  );

  if (!canMessage) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-stone-950">
          {locale === "en" ? "Message organizer" : "主催者にメッセージ"}
        </h2>
        <div className="mt-4 space-y-3">
          {messages.length === 0 ? (
            <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
              {locale === "en"
                ? "No messages yet."
                : "まだメッセージはありません。"}
            </p>
          ) : (
            messages.map((message) => {
              const fromMe = message.senderId === currentUserId;
              return (
                <div
                  key={message.id}
                  className={`rounded-lg border p-3 text-sm ${
                    fromMe
                      ? "border-green-200 bg-green-50"
                      : "border-stone-200 bg-stone-50"
                  }`}
                >
                  <p className="font-semibold text-stone-950">
                    {fromMe
                      ? locale === "en"
                        ? "You"
                        : "あなた"
                      : message.senderName ||
                        (locale === "en" ? "Organizer" : "主催者")}
                  </p>
                  <p className="mt-1 leading-6 text-stone-700">{message.body}</p>
                </div>
              );
            })
          )}
        </div>
        <form action={messageAction} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="applicationId" value={applicationId} />
          <textarea
            name="body"
            maxLength={500}
            rows={4}
            required
            placeholder={
              locale === "en"
                ? "Ask a specific question about this event"
                : "このイベントについて質問を書く"
            }
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p
              className={`text-xs font-medium ${
                messageState.status === "error" ? "text-red-700" : "text-green-700"
              }`}
            >
              {messageState.message}
            </p>
            <button
              type="submit"
              disabled={isSending}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSending
                ? locale === "en"
                  ? "Sending..."
                  : "送信中..."
                : locale === "en"
                  ? "Send"
                  : "送信"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-red-950">
          {locale === "en" ? "Withdraw from this event" : "このイベントを辞退"}
        </h2>
        <form action={withdrawAction} className="mt-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="applicationId" value={applicationId} />
          <textarea
            name="reason"
            maxLength={300}
            rows={3}
            placeholder={
              locale === "en"
                ? "Optional reason for the organizer"
                : "主催者への任意の理由"
            }
            className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <p
              className={`text-xs font-medium ${
                withdrawState.status === "error" ? "text-red-700" : "text-green-700"
              }`}
            >
              {withdrawState.message}
            </p>
            <button
              type="submit"
              disabled={isWithdrawing}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isWithdrawing
                ? locale === "en"
                  ? "Withdrawing..."
                  : "辞退中..."
                : locale === "en"
                  ? "Withdraw"
                  : "辞退する"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
