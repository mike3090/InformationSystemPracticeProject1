"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

type ReviewStatus = "ACCEPTED" | "WAITLISTED" | "REJECTED";
export type ReviewActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const reviewStatuses = new Set<ReviewStatus>([
  "ACCEPTED",
  "WAITLISTED",
  "REJECTED",
]);

export async function updateApplicationReview(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "ja");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "") as ReviewStatus;

  if (!session?.user?.id) {
    return {
      status: "error" as const,
      message:
        locale === "en"
          ? "Please sign in before reviewing applications."
          : "応募を確認するにはログインしてください。",
    };
  }

  if (!opportunityId || !applicationId || !reviewStatuses.has(nextStatus)) {
    return {
      status: "error" as const,
      message:
        locale === "en"
          ? "The review request was incomplete."
          : "審査リクエストが不完全です。",
    };
  }

  const ownedOpportunity = await prisma.opportunity.findFirst({
    where: {
      id: opportunityId,
      requesterId: session.user.id,
    },
    select: { id: true },
  });

  if (!ownedOpportunity) {
    return {
      status: "error" as const,
      message:
        locale === "en"
          ? "You can only review applications for your own opportunities."
          : "自分が投稿した募集の応募のみ確認できます。",
    };
  }

  await prisma.$executeRaw`
    UPDATE "Application"
    SET "status" = ${nextStatus}::"ApplicationStatus",
        "reviewedAt" = NOW(),
        "updatedAt" = NOW(),
        "waitlistPosition" = CASE
          WHEN ${nextStatus} = 'WAITLISTED' THEN COALESCE(
            "waitlistPosition",
            (
              SELECT COUNT(*)::int + 1
              FROM "Application"
              WHERE "opportunityId" = ${opportunityId}
                AND "status" = 'WAITLISTED'::"ApplicationStatus"
                AND "id" <> ${applicationId}
            )
          )
          ELSE NULL
        END
    WHERE "id" = ${applicationId}
      AND "opportunityId" = ${opportunityId}
  `;

  if (nextStatus === "ACCEPTED") {
    await prisma.$executeRaw`
      INSERT INTO "Booking" (
        "id",
        "applicationId",
        "confirmedAt"
      )
      VALUES (
        ${randomUUID()},
        ${applicationId},
        NOW()
      )
      ON CONFLICT ("applicationId") DO UPDATE
      SET "confirmedAt" = EXCLUDED."confirmedAt"
    `;
  } else {
    await prisma.$executeRaw`
      DELETE FROM "Booking"
      WHERE "applicationId" = ${applicationId}
    `;
  }

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/opportunities/${opportunityId}`);

  return {
    status: "success" as const,
    message:
      locale === "en"
        ? "Application status updated."
        : "応募ステータスを更新しました。",
  };
}
