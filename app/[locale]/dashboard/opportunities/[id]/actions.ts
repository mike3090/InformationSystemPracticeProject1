"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildConfirmationBody,
  createNotification,
  getArrivalGuidance,
  sendEmailLater,
} from "@/lib/preEventCommunication";

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
    await sendConfirmationNotification(applicationId, locale);
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

export async function bulkUpdateApplicationReview(formData: FormData) {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "ja");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "") as ReviewStatus;
  const applicationIds = formData
    .getAll("applicationIds")
    .map((value) => String(value))
    .filter(Boolean);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!opportunityId || !reviewStatuses.has(nextStatus) || applicationIds.length === 0) {
    revalidatePath(`/${locale}/dashboard/opportunities/${opportunityId}`);
    return;
  }

  const ownedOpportunity = await prisma.opportunity.findFirst({
    where: {
      id: opportunityId,
      requesterId: session.user.id,
    },
    select: { id: true },
  });

  if (!ownedOpportunity) {
    throw new Error("You can only review applications for your own opportunities.");
  }

  for (const applicationId of applicationIds) {
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
      await sendConfirmationNotification(applicationId, locale);
    } else {
      await prisma.$executeRaw`
        DELETE FROM "Booking"
        WHERE "applicationId" = ${applicationId}
      `;
    }
  }

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/opportunities/${opportunityId}`);
}

export async function createOrganizerUpdate(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "ja");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const type = String(formData.get("type") ?? "GENERAL").trim() || "GENERAL";
  const message = String(formData.get("message") ?? "").trim();
  const highlightedDetail = String(formData.get("highlightedDetail") ?? "").trim();

  if (!session?.user?.id) {
    return reviewError(locale, "Please sign in before sending updates.", "お知らせ送信にはログインしてください。");
  }

  if (!message || message.length > 1000) {
    return reviewError(locale, "Update must be between 1 and 1000 characters.", "お知らせは1〜1000文字で入力してください。");
  }

  const ownedOpportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, requesterId: session.user.id },
    select: { id: true, title: true },
  });

  if (!ownedOpportunity) {
    return reviewError(locale, "You can only update your own opportunities.", "自分が投稿した募集のみ更新できます。");
  }

  await prisma.$executeRaw`
    INSERT INTO "EventUpdate" (
      "id",
      "opportunityId",
      "organizerId",
      "type",
      "message",
      "highlightedDetail",
      "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${opportunityId},
      ${session.user.id},
      ${type},
      ${message},
      ${highlightedDetail || null},
      NOW()
    )
  `;

  const confirmedVolunteers = await prisma.$queryRaw<
    { applicationId: string; volunteerId: string }[]
  >`
    SELECT "id" AS "applicationId", "volunteerId"
    FROM "Application"
    WHERE "opportunityId" = ${opportunityId}
      AND "status" = 'ACCEPTED'::"ApplicationStatus"
  `;

  await Promise.all(
    confirmedVolunteers.map((volunteer) =>
      createNotification({
        userId: volunteer.volunteerId,
        opportunityId,
        applicationId: volunteer.applicationId,
        type: "ORGANIZER_UPDATE",
        title: `Update for ${ownedOpportunity.title}`,
        body: highlightedDetail ? `${highlightedDetail}\n\n${message}` : message,
        metadata: { updateType: type },
      }),
    ),
  );

  revalidatePath(`/${locale}/dashboard/opportunities/${opportunityId}`);
  revalidatePath(`/${locale}/dashboard`);

  return {
    status: "success",
    message: locale === "en" ? "Update sent to confirmed volunteers." : "参加確定者にお知らせを送信しました。",
  };
}

export async function replyToVolunteerMessage(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "ja");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!session?.user?.id) {
    return reviewError(locale, "Please sign in before replying.", "返信にはログインしてください。");
  }

  if (!body || body.length > 500) {
    return reviewError(locale, "Reply must be between 1 and 500 characters.", "返信は1〜500文字で入力してください。");
  }

  const rows = await prisma.$queryRaw<
    { volunteerId: string; opportunityTitle: string }[]
  >`
    SELECT
      a."volunteerId",
      o."title" AS "opportunityTitle"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    WHERE a."id" = ${applicationId}
      AND a."opportunityId" = ${opportunityId}
      AND a."status" = 'ACCEPTED'::"ApplicationStatus"
      AND o."requesterId" = ${session.user.id}
    LIMIT 1
  `;
  const application = rows[0];

  if (!application) {
    return reviewError(locale, "You can only reply to confirmed volunteers for your own opportunity.", "自分の募集で参加確定したボランティアにのみ返信できます。");
  }

  await prisma.$executeRaw`
    INSERT INTO "EventMessage" (
      "id",
      "opportunityId",
      "applicationId",
      "senderId",
      "recipientId",
      "body",
      "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${opportunityId},
      ${applicationId},
      ${session.user.id},
      ${application.volunteerId},
      ${body},
      NOW()
    )
  `;

  await createNotification({
    userId: application.volunteerId,
    opportunityId,
    applicationId,
    type: "ORGANIZER_REPLY",
    title: `Reply about ${application.opportunityTitle}`,
    body,
  });

  revalidatePath(`/${locale}/dashboard/opportunities/${opportunityId}`);
  revalidatePath(`/${locale}/my-events/applications/${applicationId}`);

  return {
    status: "success",
    message: locale === "en" ? "Reply sent." : "返信しました。",
  };
}

export async function updateParticipantManagement(
  _prevState: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "ja");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  const participantGroup = String(formData.get("participantGroup") ?? "").trim();
  const participantRole = normalizeChoice(
    formData.get("participantRole"),
    ["MEMBER", "LEADER", "SUPPORT", "OBSERVER"],
    "MEMBER",
  );
  const accessLevel = normalizeChoice(
    formData.get("accessLevel"),
    ["STANDARD", "SENSITIVE", "ONSITE_ONLY"],
    "STANDARD",
  );
  const attendanceStatus = normalizeChoice(
    formData.get("attendanceStatus"),
    ["UNKNOWN", "ATTENDED", "NO_SHOW", "EXCUSED"],
    "UNKNOWN",
  );
  const organizerNote = String(formData.get("organizerNote") ?? "").trim();

  if (!session?.user?.id) {
    return reviewError(locale, "Please sign in before managing participants.", "参加者管理にはログインしてください。");
  }

  if (!opportunityId || !applicationId || organizerNote.length > 1000) {
    return reviewError(locale, "Participant management details were incomplete.", "参加者管理の内容が不完全です。");
  }

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT a."id"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    WHERE a."id" = ${applicationId}
      AND a."opportunityId" = ${opportunityId}
      AND o."requesterId" = ${session.user.id}
    LIMIT 1
  `;

  if (!rows[0]) {
    return reviewError(locale, "You can only manage participants for your own opportunity.", "自分が投稿した募集の参加者のみ管理できます。");
  }

  await prisma.$executeRaw`
    UPDATE "Application"
    SET "participantGroup" = ${participantGroup || null},
        "participantRole" = ${participantRole},
        "accessLevel" = ${accessLevel},
        "attendanceStatus" = ${attendanceStatus},
        "organizerNote" = ${organizerNote || null},
        "updatedAt" = NOW()
    WHERE "id" = ${applicationId}
      AND "opportunityId" = ${opportunityId}
  `;

  revalidatePath(`/${locale}/dashboard/opportunities/${opportunityId}`);
  revalidatePath(`/${locale}/dashboard`);

  return {
    status: "success",
    message: locale === "en" ? "Participant details saved." : "参加者管理情報を保存しました。",
  };
}

async function sendConfirmationNotification(applicationId: string, locale: string) {
  const rows = await prisma.$queryRaw<
    {
      volunteerId: string;
      opportunityId: string;
      title: string;
      startAt: Date | null;
      endAt: Date | null;
      address: string | null;
      city: string | null;
      prefecture: string | null;
      selectedTaskItems: unknown;
      thingsToBring: string[];
    }[]
  >`
    SELECT
      a."volunteerId",
      a."opportunityId",
      a."selectedTaskItems" AS "selectedTaskItems",
      o."title",
      o."startAt",
      o."endAt",
      o."address",
      o."city",
      o."prefecture",
      o."thingsToBring"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    WHERE a."id" = ${applicationId}
    LIMIT 1
  `;
  const detail = rows[0];
  if (!detail) return;

  const guidance = await getArrivalGuidance(detail.opportunityId);
  const body = buildConfirmationBody({
    eventName: detail.title,
    dateTime: formatDateRange(detail.startAt, detail.endAt, locale),
    location:
      detail.address ||
      [detail.city, detail.prefecture].filter(Boolean).join(", ") ||
      "Location TBD",
    task: selectedTaskLabel(detail.selectedTaskItems),
    thingsToBring: detail.thingsToBring ?? [],
    arrivalSummary:
      guidance?.arrivalGuidance || guidance?.firstLandmarkDescription || null,
  });

  await createNotification({
    userId: detail.volunteerId,
    opportunityId: detail.opportunityId,
    applicationId,
    type: "CONFIRMATION",
    title: `Confirmed: ${detail.title}`,
    body,
  });

  await sendEmailLater({
    toUserId: detail.volunteerId,
    subject: `Confirmed: ${detail.title}`,
    body,
  });
}

function reviewError(locale: string, en: string, ja: string): ReviewActionState {
  return {
    status: "error",
    message: locale === "en" ? en : ja,
  };
}

function normalizeChoice(value: FormDataEntryValue | null, allowed: string[], fallback: string) {
  const raw = String(value ?? "");
  return allowed.includes(raw) ? raw : fallback;
}

function selectedTaskLabel(value: unknown) {
  if (!Array.isArray(value)) return "Task assignment pending";
  const names = value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const name = (item as Record<string, unknown>).name;
      return typeof name === "string" ? name : "";
    })
    .filter(Boolean);
  return names.join(", ") || "Task assignment pending";
}

function formatDateRange(startAt: Date | null, endAt: Date | null, locale: string) {
  if (!startAt) return locale === "en" ? "Date TBD" : "日時未定";
  const dateLocale = locale === "en" ? "en-US" : "ja-JP";
  const start = new Intl.DateTimeFormat(dateLocale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(startAt);
  if (!endAt) return start;
  return `${start} - ${new Intl.DateTimeFormat(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(endAt)}`;
}
