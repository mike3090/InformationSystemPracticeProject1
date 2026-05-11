"use client";

import { useActionState } from "react";
import { updateApplicationReview, type ReviewActionState } from "./actions";

type ApplicationReviewFormProps = {
  locale: string;
  opportunityId: string;
  applicationId: string;
  currentStatus: string;
};

const initialState: ReviewActionState = {
  status: "idle",
  message: "",
};

const actions = [
  {
    status: "ACCEPTED",
    en: "Accept",
    ja: "承認",
    className: "bg-green-700 text-white hover:bg-green-600",
  },
  {
    status: "WAITLISTED",
    en: "Waitlist",
    ja: "ウェイトリスト",
    className: "bg-sky-700 text-white hover:bg-sky-600",
  },
  {
    status: "REJECTED",
    en: "Reject",
    ja: "不採用",
    className: "bg-stone-900 text-white hover:bg-stone-700",
  },
];

export default function ApplicationReviewForm({
  locale,
  opportunityId,
  applicationId,
  currentStatus,
}: ApplicationReviewFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateApplicationReview,
    initialState,
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const isCurrent = currentStatus === action.status;
          return (
            <form key={action.status} action={formAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="opportunityId" value={opportunityId} />
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="nextStatus" value={action.status} />
              <button
                type="submit"
                disabled={isPending || isCurrent}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${action.className}`}
              >
                {locale === "en" ? action.en : action.ja}
              </button>
            </form>
          );
        })}
      </div>
      {state.message && (
        <p
          className={`mt-2 text-xs font-medium ${
            state.status === "error" ? "text-red-700" : "text-green-700"
          }`}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
