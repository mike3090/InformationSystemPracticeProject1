"use client";

import { useActionState } from "react";
import {
  savePostEventReflection,
  type ReflectionActionState,
} from "./actions";

type TaskView = {
  name: string;
  startTime: string;
  durationMinutes: number | null;
};

type BadgeView = {
  key: string;
  name: string;
  icon: string;
  description: string;
};

const initialState: ReflectionActionState = {
  status: "idle",
  message: "",
};

export default function ReflectionForm({
  applicationId,
  locale,
  defaultDurationMinutes,
  tasks,
  existing,
}: {
  applicationId: string;
  locale: string;
  defaultDurationMinutes: number;
  tasks: TaskView[];
  existing: {
    durationMinutes: number;
    accomplishmentSummary: string;
    shareCardText: string;
    badges: BadgeView[];
    taskClarityRating: number | null;
    preparationRating: number | null;
    timeWellSpentRating: number | null;
    feedbackComment: string | null;
  } | null;
}) {
  const [state, action, isPending] = useActionState(
    savePostEventReflection,
    initialState,
  );
  const duration = existing?.durationMinutes ?? defaultDurationMinutes;

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="applicationId" value={applicationId} />

      <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          {locale === "en" ? "Step 1" : "ステップ 1"}
        </p>
        <h2 className="mt-2 text-xl font-bold text-stone-950">
          {locale === "en" ? "Log what you did" : "行ったことを記録"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {locale === "en"
            ? "Use the time you actually worked. The summary will stay concrete and task-based."
            : "実際に活動した時間を入力してください。成果はタスクに基づいて具体的に表示されます。"}
        </p>

        <label className="mt-5 block text-sm font-semibold text-stone-800">
          {locale === "en" ? "Logged duration" : "活動時間"}
          <input
            type="number"
            name="durationMinutes"
            min={15}
            max={720}
            step={15}
            defaultValue={duration}
            className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>

        <div className="mt-5 grid gap-3">
          {tasks.length === 0 ? (
            <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
              {locale === "en"
                ? "No assigned task was recorded, so the summary will use a general event support task."
                : "担当タスクが記録されていないため、一般的なイベントサポートとして記録します。"}
            </p>
          ) : (
            tasks.map((task) => (
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
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
          {locale === "en" ? "Step 2" : "ステップ 2"}
        </p>
        <h2 className="mt-2 text-xl font-bold text-stone-950">
          {locale === "en" ? "Event feedback" : "活動フィードバック"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          {locale === "en"
            ? "This is optional. Organizers can see it, while public pages show only aggregate ratings."
            : "任意です。主催者には内容が見えますが、公開ページでは集計のみ表示されます。"}
        </p>

        <div className="mt-5 grid gap-4">
          <RatingGroup
            name="taskClarityRating"
            title={locale === "en" ? "Task clarity" : "タスクの明確さ"}
            defaultValue={existing?.taskClarityRating}
          />
          <RatingGroup
            name="preparationRating"
            title={locale === "en" ? "Preparation" : "準備"}
            defaultValue={existing?.preparationRating}
          />
          <RatingGroup
            name="timeWellSpentRating"
            title={locale === "en" ? "Time well spent" : "充実した時間"}
            defaultValue={existing?.timeWellSpentRating}
          />
        </div>

        <label className="mt-5 block text-sm font-semibold text-stone-800">
          {locale === "en" ? "Optional comment" : "任意コメント"}
          <textarea
            name="feedbackComment"
            maxLength={300}
            rows={4}
            defaultValue={existing?.feedbackComment ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </label>
      </section>

      {existing && (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {locale === "en" ? "Saved result" : "保存済みの結果"}
          </p>
          <h2 className="mt-2 text-xl font-bold text-emerald-950">
            {existing.accomplishmentSummary}
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {existing.badges.map((badge) => (
              <div key={badge.key} className="rounded-lg bg-white p-4">
                <p className="text-sm font-bold text-stone-950">
                  {badge.icon} {badge.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {badge.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-white p-4 text-sm leading-6 text-stone-700">
            <p className="font-semibold text-stone-950">
              {locale === "en" ? "Share card text" : "共有カード用テキスト"}
            </p>
            <pre className="mt-2 whitespace-pre-wrap font-sans">
              {existing.shareCardText}
            </pre>
          </div>
        </section>
      )}

      {state.message && (
        <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {isPending
            ? locale === "en"
              ? "Saving..."
              : "保存中..."
            : existing
              ? locale === "en"
                ? "Update reflection"
                : "振り返りを更新"
              : locale === "en"
                ? "Save reflection"
                : "振り返りを保存"}
        </button>
        <p className="text-xs text-stone-500">
          {locale === "en"
            ? "You can come back from My Events -> Past Events."
            : "My Events の Past Events からいつでも戻れます。"}
        </p>
      </div>
    </form>
  );
}

function RatingGroup({
  name,
  title,
  defaultValue,
}: {
  name: string;
  title: string;
  defaultValue?: number | null;
}) {
  return (
    <fieldset className="rounded-lg border border-stone-200 p-4">
      <legend className="px-1 text-sm font-semibold text-stone-900">{title}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {[
          { value: 1, label: "Down" },
          { value: 2, label: "Neutral" },
          { value: 3, label: "Up" },
        ].map((option) => (
          <label
            key={option.value}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800"
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              className="h-4 w-4 accent-emerald-700"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
