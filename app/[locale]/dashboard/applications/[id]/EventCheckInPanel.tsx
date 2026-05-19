"use client";

import { useActionState } from "react";
import { checkInToEvent, type ApplicationActionState } from "./actions";

type AssignedTask = {
  name: string;
  startTime: string;
  durationMinutes: number | null;
};

const initialState: ApplicationActionState = {
  status: "idle",
  message: "",
};

export default function EventCheckInPanel({
  applicationId,
  locale,
  attendanceStatus,
  checkedInAt,
  checkinMethod,
  startAt,
  endAt,
  selectedTasks,
  instructions,
  toolsProvided,
  thingsToBring,
}: {
  applicationId: string;
  locale: string;
  attendanceStatus: string;
  checkedInAt: string | null;
  checkinMethod: string | null;
  startAt: string | null;
  endAt: string | null;
  selectedTasks: AssignedTask[];
  instructions: string | null;
  toolsProvided: string[];
  thingsToBring: string[];
}) {
  const [manualState, manualAction, isManualPending] = useActionState(
    checkInToEvent,
    initialState,
  );
  const [qrState, qrAction, isQrPending] = useActionState(
    checkInToEvent,
    initialState,
  );
  const isCheckedIn = attendanceStatus === "ATTENDED";

  return (
    <section className="mt-6 rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {locale === "en" ? "Attend & check-in" : "参加・チェックイン"}
          </p>
          <h2 className="mt-2 text-xl font-bold text-stone-950">
            {locale === "en" ? "Confirm your arrival" : "到着を確認"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {locale === "en"
              ? "Check in when you arrive, then use this page to review your assigned task."
              : "会場に着いたらチェックインし、このページで担当タスクを確認できます。"}
          </p>
        </div>
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
            isCheckedIn
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {isCheckedIn
            ? locale === "en"
              ? "Checked in"
              : "チェックイン済み"
            : locale === "en"
              ? "Not checked in"
              : "未チェックイン"}
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-semibold">
          {locale === "en" ? "Valid check-in window" : "チェックイン可能時間"}
        </p>
        <p className="mt-1">
          {locale === "en"
            ? "From 30 minutes before the event until it ends."
            : "イベント開始30分前から終了時刻まで利用できます。"}
        </p>
        <p className="mt-1 text-xs text-emerald-800">
          {formatDateRange(startAt, endAt, locale)}
        </p>
      </div>

      {isCheckedIn ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">
            {locale === "en" ? "Arrival confirmed" : "到着が確認されました"}
          </p>
          <p className="mt-1">
            {checkedInAt
              ? `${formatDateTime(checkedInAt, locale)} · ${
                  checkinMethod === "QR" ? "QR" : "Manual"
                }`
              : locale === "en"
                ? "Your attendance has been recorded."
                : "出席が記録されました。"}
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <form action={manualAction} className="rounded-lg border border-stone-200 p-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="applicationId" value={applicationId} />
            <input type="hidden" name="method" value="MANUAL" />
            <h3 className="font-semibold text-stone-950">
              {locale === "en" ? "Manual check-in" : "手動チェックイン"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {locale === "en"
                ? "Use this when the organizer confirms you at the venue."
                : "会場で主催者が確認した場合はこちらを使います。"}
            </p>
            <ActionMessage state={manualState} />
            <button
              type="submit"
              disabled={isManualPending}
              className="mt-4 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isManualPending
                ? locale === "en"
                  ? "Checking in..."
                  : "確認中..."
                : locale === "en"
                  ? "Check in"
                  : "チェックイン"}
            </button>
          </form>

          <form action={qrAction} className="rounded-lg border border-stone-200 p-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="applicationId" value={applicationId} />
            <input type="hidden" name="method" value="QR" />
            <h3 className="font-semibold text-stone-950">
              {locale === "en" ? "QR check-in" : "QRチェックイン"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              {locale === "en"
                ? "For this demo, enter DEMO-CHECKIN as the QR code."
                : "デモでは QR コードとして DEMO-CHECKIN を入力できます。"}
            </p>
            <input
              name="qrCode"
              placeholder="DEMO-CHECKIN"
              className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <ActionMessage state={qrState} />
            <button
              type="submit"
              disabled={isQrPending}
              className="mt-4 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
            >
              {isQrPending
                ? locale === "en"
                  ? "Checking..."
                  : "確認中..."
                : locale === "en"
                  ? "Submit QR"
                  : "QRを送信"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-6 border-t border-stone-200 pt-5">
        <h3 className="font-semibold text-stone-950">
          {locale === "en" ? "Task during the event" : "活動中の担当タスク"}
        </h3>
        <div className="mt-3 grid gap-3">
          {selectedTasks.length === 0 ? (
            <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
              {locale === "en"
                ? "No specific task has been assigned yet."
                : "具体的なタスクはまだ割り当てられていません。"}
            </p>
          ) : (
            selectedTasks.map((task) => (
              <div
                key={`${task.name}-${task.startTime}`}
                className="rounded-lg border border-stone-200 p-4"
              >
                <p className="font-semibold text-stone-950">{task.name}</p>
                <p className="mt-1 text-sm text-stone-600">
                  {task.startTime || (locale === "en" ? "Time TBD" : "時間未定")}
                  {task.durationMinutes ? ` · ${task.durationMinutes} min` : ""}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <DetailBlock
            title={locale === "en" ? "Instructions" : "説明"}
            value={
              instructions ||
              (locale === "en"
                ? "Follow the organizer's guidance at the venue."
                : "会場で主催者の案内に従ってください。")
            }
          />
          <DetailBlock
            title={locale === "en" ? "Tools" : "道具"}
            value={
              toolsProvided.length > 0
                ? toolsProvided.join(", ")
                : locale === "en"
                  ? "No special tools listed."
                  : "特別な道具は登録されていません。"
            }
          />
          <DetailBlock
            title={locale === "en" ? "Bring" : "持ち物"}
            value={
              thingsToBring.length > 0
                ? thingsToBring.join(", ")
                : locale === "en"
                  ? "No required items listed."
                  : "必要な持ち物は登録されていません。"
            }
          />
        </div>
      </div>
    </section>
  );
}

function ActionMessage({ state }: { state: ApplicationActionState }) {
  if (!state.message) return null;

  return (
    <p
      className={`mt-3 text-xs font-medium ${
        state.status === "error" ? "text-red-700" : "text-emerald-700"
      }`}
    >
      {state.message}
    </p>
  );
}

function DetailBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-4">
      <p className="text-xs font-semibold uppercase text-stone-500">{title}</p>
      <p className="mt-2 text-sm leading-6 text-stone-700">{value}</p>
    </div>
  );
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateRange(startAt: string | null, endAt: string | null, locale: string) {
  if (!startAt) return locale === "en" ? "Date TBD" : "日時未定";

  const start = formatDateTime(startAt, locale);
  if (!endAt) return start;

  return `${start} - ${new Intl.DateTimeFormat(
    locale === "en" ? "en-US" : "ja-JP",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(new Date(endAt))}`;
}
