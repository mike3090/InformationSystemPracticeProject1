"use client";

import { useActionState } from "react";
import { updateParticipantManagement, type ReviewActionState } from "./actions";

type ParticipantManagementFormProps = {
  locale: string;
  opportunityId: string;
  applicationId: string;
  participantGroup: string | null;
  participantRole: string;
  accessLevel: string;
  attendanceStatus: string;
  organizerNote: string | null;
};

const initialState: ReviewActionState = {
  status: "idle",
  message: "",
};

export default function ParticipantManagementForm({
  locale,
  opportunityId,
  applicationId,
  participantGroup,
  participantRole,
  accessLevel,
  attendanceStatus,
  organizerNote,
}: ParticipantManagementFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateParticipantManagement,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="applicationId" value={applicationId} />

      <h4 className="text-sm font-bold text-stone-950">
        {locale === "en" ? "Participant management" : "参加者管理"}
      </h4>
      <p className="mt-1 text-xs leading-5 text-stone-500">
        {locale === "en"
          ? "Private organizer-only fields for grouping, leadership, sensitive access, and event completion."
          : "グループ分け、リーダー設定、機密情報アクセス、参加実績のための主催者専用項目です。"}
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <label className="text-xs font-semibold text-stone-600">
          {locale === "en" ? "Group" : "グループ"}
          <input
            name="participantGroup"
            defaultValue={participantGroup ?? ""}
            placeholder={locale === "en" ? "Morning team" : "午前チーム"}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-900 outline-none focus:border-green-700"
          />
        </label>
        <label className="text-xs font-semibold text-stone-600">
          {locale === "en" ? "Role" : "役割"}
          <select
            name="participantRole"
            defaultValue={participantRole}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-900 outline-none focus:border-green-700"
          >
            <option value="MEMBER">{locale === "en" ? "Member" : "メンバー"}</option>
            <option value="LEADER">{locale === "en" ? "Leader" : "リーダー"}</option>
            <option value="SUPPORT">{locale === "en" ? "Support" : "サポート"}</option>
            <option value="OBSERVER">{locale === "en" ? "Observer" : "見学"}</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-600">
          {locale === "en" ? "Access" : "アクセス"}
          <select
            name="accessLevel"
            defaultValue={accessLevel}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-900 outline-none focus:border-green-700"
          >
            <option value="STANDARD">{locale === "en" ? "Standard" : "標準"}</option>
            <option value="SENSITIVE">{locale === "en" ? "Sensitive info" : "機密情報あり"}</option>
            <option value="ONSITE_ONLY">{locale === "en" ? "On-site only" : "当日現地のみ"}</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-600">
          {locale === "en" ? "Attendance" : "参加実績"}
          <select
            name="attendanceStatus"
            defaultValue={attendanceStatus}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-900 outline-none focus:border-green-700"
          >
            <option value="UNKNOWN">{locale === "en" ? "Unknown" : "未確認"}</option>
            <option value="ATTENDED">{locale === "en" ? "Attended" : "参加"}</option>
            <option value="NO_SHOW">{locale === "en" ? "No-show" : "無断欠席"}</option>
            <option value="EXCUSED">{locale === "en" ? "Excused" : "連絡あり欠席"}</option>
          </select>
        </label>
      </div>

      <label className="mt-3 block text-xs font-semibold text-stone-600">
        {locale === "en" ? "Private note" : "内部メモ"}
        <textarea
          name="organizerNote"
          defaultValue={organizerNote ?? ""}
          rows={3}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-900 outline-none focus:border-green-700"
        />
      </label>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-stone-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? locale === "en"
              ? "Saving..."
              : "保存中..."
            : locale === "en"
              ? "Save participant details"
              : "参加者情報を保存"}
        </button>
        {state.message && (
          <p
            className={`text-xs font-medium ${
              state.status === "error" ? "text-red-700" : "text-green-700"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
