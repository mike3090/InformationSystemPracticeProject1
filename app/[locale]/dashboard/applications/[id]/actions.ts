"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/preEventCommunication";

export type ApplicationActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function sendOrganizerMessage(
  _prevState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "ja");
  const applicationId = String(formData.get("applicationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!session?.user?.id) {
    return error(locale, "Please sign in before sending a message.", "メッセージ送信にはログインしてください。");
  }

  if (!body || body.length > 500) {
    return error(locale, "Message must be between 1 and 500 characters.", "メッセージは1〜500文字で入力してください。");
  }

  const rows = await prisma.$queryRaw<
    {
      opportunityId: string;
      requesterId: string;
      opportunityTitle: string;
      status: string;
    }[]
  >`
    SELECT
      a."opportunityId" AS "opportunityId",
      a."status"::text AS "status",
      o."requesterId" AS "requesterId",
      o."title" AS "opportunityTitle"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    WHERE a."id" = ${applicationId}
      AND a."volunteerId" = ${session.user.id}
    LIMIT 1
  `;
  const application = rows[0];

  if (!application || application.status !== "ACCEPTED") {
    return error(locale, "Messages are available after confirmation.", "メッセージは参加確定後に利用できます。");
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
      ${application.opportunityId},
      ${applicationId},
      ${session.user.id},
      ${application.requesterId},
      ${body},
      NOW()
    )
  `;

  await createNotification({
    userId: application.requesterId,
    opportunityId: application.opportunityId,
    applicationId,
    type: "VOLUNTEER_MESSAGE",
    title: `Question about ${application.opportunityTitle}`,
    body,
  });

  revalidatePath(`/${locale}/dashboard/applications/${applicationId}`);
  redirect(`/${locale}/dashboard/applications/${applicationId}?message=sent`);
}

export async function withdrawConfirmedApplication(
  _prevState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "ja");
  const applicationId = String(formData.get("applicationId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!session?.user?.id) {
    return error(locale, "Please sign in before withdrawing.", "辞退するにはログインしてください。");
  }

  if (reason.length > 300) {
    return error(locale, "Reason must be 300 characters or fewer.", "理由は300文字以内で入力してください。");
  }

  const rows = await prisma.$queryRaw<
    {
      opportunityId: string;
      requesterId: string;
      opportunityTitle: string;
      status: string;
      selectedTaskItems: unknown;
    }[]
  >`
    SELECT
      a."opportunityId" AS "opportunityId",
      a."status"::text AS "status",
      a."selectedTaskItems" AS "selectedTaskItems",
      o."requesterId" AS "requesterId",
      o."title" AS "opportunityTitle"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    WHERE a."id" = ${applicationId}
      AND a."volunteerId" = ${session.user.id}
    LIMIT 1
  `;
  const application = rows[0];

  if (!application || !["ACCEPTED", "WAITLISTED"].includes(application.status)) {
    return error(locale, "Only confirmed or waitlisted applications can be withdrawn here.", "ここでは参加確定・ウェイトリストの応募のみ辞退できます。");
  }

  await prisma.$executeRaw`
    UPDATE "Application"
    SET "status" = 'WITHDRAWN'::"ApplicationStatus",
        "withdrawnAt" = NOW(),
        "message" = COALESCE(${reason || null}, "message"),
        "updatedAt" = NOW()
    WHERE "id" = ${applicationId}
      AND "volunteerId" = ${session.user.id}
  `;

  await prisma.$executeRaw`
    DELETE FROM "Booking"
    WHERE "applicationId" = ${applicationId}
  `;

  await createNotification({
    userId: application.requesterId,
    opportunityId: application.opportunityId,
    applicationId,
    type: "VOLUNTEER_WITHDRAWAL",
    title: `Volunteer withdrew from ${application.opportunityTitle}`,
    body: reason || "The volunteer withdrew without a reason.",
    metadata: { selectedTaskItems: application.selectedTaskItems },
  });

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/applications/${applicationId}`);

  return {
    status: "success",
    message: locale === "en" ? "You withdrew from this event." : "このイベントを辞退しました。",
  };
}

export async function checkInToEvent(
  _prevState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "ja");
  const applicationId = String(formData.get("applicationId") ?? "");
  const method = String(formData.get("method") ?? "MANUAL");
  const qrCode = String(formData.get("qrCode") ?? "").trim();

  if (!session?.user?.id) {
    return error(locale, "Please sign in before checking in.", "チェックインにはログインしてください。");
  }

  const rows = await prisma.$queryRaw<
    {
      opportunityId: string;
      requesterId: string;
      opportunityTitle: string;
      status: string;
      startAt: Date | null;
      endAt: Date | null;
      attendanceStatus: string;
    }[]
  >`
    SELECT
      a."opportunityId" AS "opportunityId",
      a."status"::text AS "status",
      a."attendanceStatus" AS "attendanceStatus",
      o."requesterId" AS "requesterId",
      o."title" AS "opportunityTitle",
      o."startAt" AS "startAt",
      o."endAt" AS "endAt"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    WHERE a."id" = ${applicationId}
      AND a."volunteerId" = ${session.user.id}
    LIMIT 1
  `;
  const application = rows[0];

  if (!application || application.status !== "ACCEPTED") {
    return error(locale, "Check-in is available only after confirmation.", "チェックインは参加確定後に利用できます。");
  }

  const isLocalDemoQr =
    process.env.NODE_ENV !== "production" &&
    method === "QR" &&
    qrCode === "DEMO-CHECKIN";

  if (method === "QR") {
    const acceptedCodes = new Set([
      applicationId,
      application.opportunityId,
      `GTT-${application.opportunityId}`,
      "DEMO-CHECKIN",
    ]);
    if (!acceptedCodes.has(qrCode)) {
      return error(locale, "The QR code is not valid for this event.", "このイベントのQRコードではありません。");
    }
  }

  if (!isLocalDemoQr && !isWithinCheckInWindow(application.startAt, application.endAt)) {
    return error(
      locale,
      "Check-in opens 30 minutes before the event and closes when the event ends.",
      "チェックインは開始30分前からイベント終了まで利用できます。",
    );
  }

  await prisma.$executeRaw`
    UPDATE "Application"
    SET "attendanceStatus" = 'ATTENDED',
        "checkedInAt" = NOW(),
        "checkinMethod" = ${method === "QR" ? "QR" : "MANUAL"},
        "updatedAt" = NOW()
    WHERE "id" = ${applicationId}
      AND "volunteerId" = ${session.user.id}
  `;

  await createNotification({
    userId: application.requesterId,
    opportunityId: application.opportunityId,
    applicationId,
    type: "VOLUNTEER_CHECKED_IN",
    title: `Volunteer checked in: ${application.opportunityTitle}`,
    body: method === "QR" ? "Checked in with QR code." : "Checked in manually.",
  });

  revalidatePath(`/${locale}/dashboard/applications/${applicationId}`);
  revalidatePath(`/${locale}/dashboard/opportunities/${application.opportunityId}`);
  redirect(`/${locale}/dashboard/applications/${applicationId}?checkin=success`);
}

function isWithinCheckInWindow(startAt: Date | null, endAt: Date | null) {
  if (!startAt) return false;

  const now = Date.now();
  const opensAt = startAt.getTime() - 30 * 60 * 1000;
  const closesAt = endAt?.getTime() ?? startAt.getTime() + 8 * 60 * 60 * 1000;

  return now >= opensAt && now <= closesAt;
}

export async function devConfirmOwnApplication(
  _prevState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "ja");
  const applicationId = String(formData.get("applicationId") ?? "");

  if (process.env.NODE_ENV === "production") {
    return error(locale, "This test action is disabled in production.", "本番環境ではこのテスト操作は無効です。");
  }

  if (!session?.user?.id) {
    return error(locale, "Please sign in before using the test action.", "テスト操作にはログインしてください。");
  }

  const rows = await prisma.$queryRaw<
    {
      opportunityId: string;
      opportunityTitle: string;
      requesterId: string;
      status: string;
    }[]
  >`
    SELECT
      a."opportunityId" AS "opportunityId",
      a."status"::text AS "status",
      o."title" AS "opportunityTitle",
      o."requesterId" AS "requesterId"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    WHERE a."id" = ${applicationId}
      AND a."volunteerId" = ${session.user.id}
    LIMIT 1
  `;
  const application = rows[0];

  if (!application) {
    return error(locale, "Application not found.", "応募が見つかりません。");
  }

  if (application.status === "ACCEPTED") {
    return error(locale, "This application is already confirmed.", "この応募はすでに参加確定です。");
  }

  if (!["PENDING", "WAITLISTED"].includes(application.status)) {
    return error(locale, "Only pending or waitlisted applications can be test-confirmed.", "テスト確定できるのは審査中・ウェイトリストの応募のみです。");
  }

  await prisma.$executeRaw`
    UPDATE "Application"
    SET "status" = 'ACCEPTED'::"ApplicationStatus",
        "reviewedAt" = NOW(),
        "waitlistPosition" = NULL,
        "updatedAt" = NOW()
    WHERE "id" = ${applicationId}
      AND "volunteerId" = ${session.user.id}
  `;

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

  await createNotification({
    userId: session.user.id,
    opportunityId: application.opportunityId,
    applicationId,
    type: "DEV_CONFIRMATION",
    title: `Test confirmed: ${application.opportunityTitle}`,
    body: "This application was confirmed with the local test button.",
  });

  await createNotification({
    userId: application.requesterId,
    opportunityId: application.opportunityId,
    applicationId,
    type: "DEV_CONFIRMATION_USED",
    title: `Test confirmation used for ${application.opportunityTitle}`,
    body: "A volunteer used the local test confirmation button.",
  });

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/applications/${applicationId}`);
  revalidatePath(`/${locale}/opportunities/${application.opportunityId}`);

  return {
    status: "success",
    message:
      locale === "en"
        ? "Test confirmation applied. Refreshing this page will show confirmed-only sections."
        : "テスト用に参加確定へ変更しました。このページを更新すると確定後の表示を確認できます。",
  };
}

function error(locale: string, en: string, ja: string): ApplicationActionState {
  return {
    status: "error",
    message: locale === "en" ? en : ja,
  };
}
