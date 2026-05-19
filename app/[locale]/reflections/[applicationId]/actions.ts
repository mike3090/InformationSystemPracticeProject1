"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseSelectedTaskItems } from "../../dashboard/applicationStatus";

export type ReflectionActionState = {
  status: "idle" | "error";
  message: string;
};

type BadgeDefinition = {
  key: string;
  name: string;
  icon: string;
  description: string;
};

const badgeDefinitions: BadgeDefinition[] = [
  {
    key: "basic-horticulture",
    name: "Basic Horticulture",
    icon: "Leaf",
    description: "Experience with planting, gardening, or green space care.",
  },
  {
    key: "donation-sorting",
    name: "Donation Sorting",
    icon: "Package",
    description: "Experience sorting, organizing, and preparing donated items.",
  },
  {
    key: "animal-handling",
    name: "Animal Handling",
    icon: "Heart",
    description: "Experience working directly with animals in a care setting.",
  },
  {
    key: "event-support",
    name: "Event Support",
    icon: "Users",
    description: "Experience helping an event run smoothly for participants.",
  },
];

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function ratingValue(formData: FormData, key: string) {
  const value = Number(textValue(formData, key));
  if (![1, 2, 3].includes(value)) return null;
  return value;
}

export async function savePostEventReflection(
  _prevState: ReflectionActionState,
  formData: FormData,
): Promise<ReflectionActionState> {
  const session = await auth();
  const locale = textValue(formData, "locale") || "ja";
  const applicationId = textValue(formData, "applicationId");

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/reflections/${applicationId}`);
  }

  const durationMinutes = Math.max(
    15,
    Math.min(720, Number(textValue(formData, "durationMinutes")) || 60),
  );
  const taskClarityRating = ratingValue(formData, "taskClarityRating");
  const preparationRating = ratingValue(formData, "preparationRating");
  const timeWellSpentRating = ratingValue(formData, "timeWellSpentRating");
  const feedbackComment = textValue(formData, "feedbackComment").slice(0, 300);

  const rows = await prisma.$queryRaw<
    {
      opportunityId: string;
      opportunityTitle: string;
      opportunityEndAt: Date | null;
      status: string;
      attendanceStatus: string;
      selectedTaskItems: unknown;
      existingReflectionId: string | null;
    }[]
  >`
    SELECT
      a."opportunityId" AS "opportunityId",
      a."status"::text AS "status",
      a."attendanceStatus" AS "attendanceStatus",
      a."selectedTaskItems" AS "selectedTaskItems",
      o."title" AS "opportunityTitle",
      o."endAt" AS "opportunityEndAt",
      r."id" AS "existingReflectionId"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    LEFT JOIN "PostEventReflection" r ON r."applicationId" = a."id"
    WHERE a."id" = ${applicationId}
      AND a."volunteerId" = ${session.user.id}
      AND a."status" = 'ACCEPTED'::"ApplicationStatus"
    LIMIT 1
  `;
  const application = rows[0];

  if (!application) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "This reflection is available only for confirmed events."
          : "この振り返りは参加確定済みの活動で利用できます。",
    };
  }

  const isPastEvent =
    application.attendanceStatus === "ATTENDED" ||
    (application.opportunityEndAt && application.opportunityEndAt < new Date());

  if (!isPastEvent && process.env.NODE_ENV === "production") {
    return {
      status: "error",
      message:
        locale === "en"
          ? "Reflection opens after you attend the event."
          : "振り返りは活動参加後に利用できます。",
    };
  }

  const tasks = parseSelectedTaskItems(application.selectedTaskItems);
  const accomplishmentSummary = buildAccomplishmentSummary(
    tasks.map((task) => task.name),
    durationMinutes,
  );
  const badges = pickBadges(tasks.map((task) => task.name));
  const shareCardText = `${application.opportunityTitle}\n${accomplishmentSummary}\n${badges
    .map((badge) => badge.name)
    .join(" · ")}`;

  if (application.existingReflectionId) {
    await prisma.$executeRaw`
      UPDATE "PostEventReflection"
      SET "durationMinutes" = ${durationMinutes},
          "accomplishmentSummary" = ${accomplishmentSummary},
          "shareCardText" = ${shareCardText},
          "badges" = ${JSON.stringify(badges)}::jsonb,
          "taskClarityRating" = ${taskClarityRating},
          "preparationRating" = ${preparationRating},
          "timeWellSpentRating" = ${timeWellSpentRating},
          "feedbackComment" = ${feedbackComment || null},
          "updatedAt" = NOW()
      WHERE "id" = ${application.existingReflectionId}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO "PostEventReflection" (
        "id",
        "applicationId",
        "userId",
        "opportunityId",
        "durationMinutes",
        "accomplishmentSummary",
        "shareCardText",
        "badges",
        "taskClarityRating",
        "preparationRating",
        "timeWellSpentRating",
        "feedbackComment",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${applicationId},
        ${session.user.id},
        ${application.opportunityId},
        ${durationMinutes},
        ${accomplishmentSummary},
        ${shareCardText},
        ${JSON.stringify(badges)}::jsonb,
        ${taskClarityRating},
        ${preparationRating},
        ${timeWellSpentRating},
        ${feedbackComment || null},
        NOW(),
        NOW()
      )
    `;
  }

  for (const badge of badges) {
    await prisma.$executeRaw`
      INSERT INTO "VolunteerSkillBadge" (
        "id",
        "userId",
        "badgeKey",
        "name",
        "icon",
        "description",
        "earnedCount",
        "firstEarnedAt",
        "lastEarnedAt"
      )
      VALUES (
        ${randomUUID()},
        ${session.user.id},
        ${badge.key},
        ${badge.name},
        ${badge.icon},
        ${badge.description},
        1,
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId", "badgeKey") DO UPDATE
      SET "earnedCount" = "VolunteerSkillBadge"."earnedCount" + 1,
          "lastEarnedAt" = NOW()
    `;
  }

  revalidatePath(`/${locale}/reflections/${applicationId}`);
  revalidatePath(`/${locale}/my-events`);
  revalidatePath(`/${locale}/profile`);
  revalidatePath(`/${locale}/opportunities/${application.opportunityId}`);
  redirect(`/${locale}/reflections/${applicationId}?saved=1`);
}

function buildAccomplishmentSummary(taskNames: string[], durationMinutes: number) {
  const taskText = taskNames.join(" ").toLowerCase();
  const durationText =
    durationMinutes >= 60
      ? `${Math.round((durationMinutes / 60) * 10) / 10} hours`
      : `${durationMinutes} minutes`;

  if (/(plant|garden|seed|tree|green|clean)/i.test(taskText)) {
    return `You cared for green space for ${durationText}.`;
  }
  if (/(donation|sort|shelf|food|clothes|package)/i.test(taskText)) {
    return `You sorted and prepared donations for ${durationText}.`;
  }
  if (/(animal|dog|cat|shelter|feed|walk)/i.test(taskText)) {
    return `You supported animal care for ${durationText}.`;
  }
  if (/(check|guide|front|reception|event|support)/i.test(taskText)) {
    return `You supported event operations for ${durationText}.`;
  }

  const taskName = taskNames[0] || "your assigned task";
  return `You worked on ${taskName} for ${durationText}.`;
}

function pickBadges(taskNames: string[]) {
  const taskText = taskNames.join(" ").toLowerCase();
  const badges = badgeDefinitions.filter((badge) => {
    if (badge.key === "basic-horticulture") {
      return /(plant|garden|seed|tree|green|clean)/i.test(taskText);
    }
    if (badge.key === "donation-sorting") {
      return /(donation|sort|shelf|food|clothes|package)/i.test(taskText);
    }
    if (badge.key === "animal-handling") {
      return /(animal|dog|cat|shelter|feed|walk)/i.test(taskText);
    }
    return /(check|guide|front|reception|event|support)/i.test(taskText);
  });

  return badges.length > 0 ? badges.slice(0, 2) : [badgeDefinitions[3]];
}
