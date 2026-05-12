import type { OpportunityStatus } from "@/app/generated/prisma/client";

export type ApplicationStatusView =
  | "pending"
  | "confirmed"
  | "waitlisted"
  | "cancelled"
  | "completed";

type StatusCopy = {
  label: string;
  description: string;
  tone: string;
  dot: string;
};

const enCopy: Record<ApplicationStatusView, StatusCopy> = {
  pending: {
    label: "Pending",
    description: "Waiting for organizer confirmation.",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "Confirmed",
    description: "You are assigned to this activity.",
    tone: "border-green-200 bg-green-50 text-green-800",
    dot: "bg-green-600",
  },
  waitlisted: {
    label: "Waitlisted",
    description: "You are a backup volunteer if a place opens.",
    tone: "border-sky-200 bg-sky-50 text-sky-800",
    dot: "bg-sky-500",
  },
  cancelled: {
    label: "Cancelled",
    description: "This application is no longer active.",
    tone: "border-stone-200 bg-stone-100 text-stone-700",
    dot: "bg-stone-500",
  },
  completed: {
    label: "Completed",
    description: "The activity has finished.",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-800",
    dot: "bg-indigo-500",
  },
};

const jaCopy: Record<ApplicationStatusView, StatusCopy> = {
  pending: {
    label: "審査中",
    description: "主催者の確認待ちです。",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    dot: "bg-amber-500",
  },
  confirmed: {
    label: "参加確定",
    description: "この活動への参加が確定しています。",
    tone: "border-green-200 bg-green-50 text-green-800",
    dot: "bg-green-600",
  },
  waitlisted: {
    label: "ウェイトリスト",
    description: "空きが出た場合の候補として登録されています。",
    tone: "border-sky-200 bg-sky-50 text-sky-800",
    dot: "bg-sky-500",
  },
  cancelled: {
    label: "キャンセル",
    description: "この応募は現在有効ではありません。",
    tone: "border-stone-200 bg-stone-100 text-stone-700",
    dot: "bg-stone-500",
  },
  completed: {
    label: "完了",
    description: "活動は終了しました。",
    tone: "border-indigo-200 bg-indigo-50 text-indigo-800",
    dot: "bg-indigo-500",
  },
};

export function getApplicationStatusView(
  applicationStatus: string,
  opportunityStatus?: OpportunityStatus | string | null,
  endAt?: Date | null,
): ApplicationStatusView {
  if (applicationStatus === "REJECTED" || applicationStatus === "WITHDRAWN") {
    return "cancelled";
  }

  if (opportunityStatus === "COMPLETED" || (endAt && endAt < new Date())) {
    return "completed";
  }

  if (opportunityStatus === "CANCELLED") {
    return "cancelled";
  }

  if (applicationStatus === "ACCEPTED") return "confirmed";
  if (applicationStatus === "WAITLISTED") return "waitlisted";

  return "pending";
}

export function getApplicationStatusCopy(
  view: ApplicationStatusView,
  locale: string,
) {
  return locale === "en" ? enCopy[view] : jaCopy[view];
}

export function parseSelectedTaskItems(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name : "";
      const startTime =
        typeof record.startTime === "string" ? record.startTime : "";
      const durationMinutes =
        typeof record.durationMinutes === "number" ? record.durationMinutes : null;

      if (!name) return null;

      return {
        name,
        startTime,
        durationMinutes,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}
