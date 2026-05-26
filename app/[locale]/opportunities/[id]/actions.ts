"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMockOpportunity, type MockOpportunity } from "@/lib/mockOpportunities";
import { getVolunteerOpportunity } from "@/lib/opportunityData";

export type ApplicationFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

type SelectedTaskItem = {
  id: string;
  name: string;
  startTime: string;
  durationMinutes: number;
};

const systemRequesterId = "system-mock-requester";
const systemRequesterEmail = "mock-requester@gotouchgrass.local";

export async function submitEventApplication(
  _prevState: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "ja");

  if (!session?.user?.id) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "Please sign in before applying."
          : "応募するにはログインしてください。",
    };
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (
    currentUser?.role !== "VOLUNTEER" &&
    currentUser?.role !== "BOTH" &&
    currentUser?.role !== "ADMIN"
  ) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "Only volunteer accounts can apply to events."
          : "イベントに応募できるのはボランティアアカウントのみです。",
    };
  }

  const opportunityId = String(formData.get("opportunityId") ?? "");
  const selectedTaskIds = formData
    .getAll("selectedTaskIds")
    .map((value) => String(value))
    .filter(Boolean);
  const confirmedTimeCommitment =
    String(formData.get("confirmedTimeCommitment") ?? "") === "on";
  const skillTags = parseSkillTags(String(formData.get("skillTags") ?? ""));
  const experienceNote = String(formData.get("experienceNote") ?? "").trim();

  const opportunity = await getVolunteerOpportunity(opportunityId);

  if (!opportunity) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "This event could not be found."
          : "イベントが見つかりませんでした。",
    };
  }

  if (selectedTaskIds.length === 0) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "Please choose at least one task."
          : "少なくとも1つのタスクを選択してください。",
    };
  }

  if (!opportunity.allowMultipleTaskSelection && selectedTaskIds.length > 1) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "This event only allows one task selection."
          : "このイベントでは選択できるタスクは1つだけです。",
    };
  }

  if (!confirmedTimeCommitment) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "Please confirm the time commitment before submitting."
          : "応募前に参加時間を確認してください。",
    };
  }

  if (experienceNote.length > 300) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "The experience note must be 300 characters or fewer."
          : "経験メモは300文字以内で入力してください。",
    };
  }

  const selectedTaskItems = selectedTaskIds
    .map((taskId) => opportunity.taskFlow.find((task) => task.id === taskId))
    .filter((task): task is NonNullable<typeof task> => Boolean(task))
    .map<SelectedTaskItem>((task) => ({
      id: task.id,
      name: task.name,
      startTime: task.startTime,
      durationMinutes: task.durationMinutes,
    }));

  if (selectedTaskItems.length !== selectedTaskIds.length) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "One of the selected tasks is no longer available."
          : "選択したタスクの一部が利用できません。",
    };
  }

  const isWaitlistApplication = opportunity.spotsRemaining <= 0;
  const selectedFullTask = selectedTaskIds.some((taskId) => {
    const task = opportunity.taskFlow.find((item) => item.id === taskId);
    return task ? task.spotsRemaining <= 0 : true;
  });

  if (selectedFullTask && !isWaitlistApplication) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "One of the selected tasks is full."
          : "選択したタスクの一部は満員です。",
    };
  }

  if (getMockOpportunity(opportunityId)) {
    await ensureMockOpportunityExists(opportunity);
  }

  const existingApplication = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "Application"
    WHERE "opportunityId" = ${opportunityId}
      AND "volunteerId" = ${session.user.id}
    LIMIT 1
  `;

  if (existingApplication.length > 0) {
    return {
      status: "error",
      message:
        locale === "en"
          ? "You have already applied to this event."
          : "このイベントにはすでに応募しています。",
    };
  }

  const waitlistPosition = isWaitlistApplication
    ? Number(
        (
          await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT COUNT(*)::bigint AS count
            FROM "Application"
            WHERE "opportunityId" = ${opportunityId}
              AND "status" = 'WAITLISTED'
          `
        )[0]?.count ?? BigInt(0),
      ) + 1
    : null;

  try {
    await prisma.$executeRaw`
      INSERT INTO "Application" (
        "id",
        "opportunityId",
        "volunteerId",
        "status",
        "selectedTaskItems",
        "confirmedTimeCommitment",
        "skillTags",
        "experienceNote",
        "message",
        "waitlistPosition",
        "aiRecommended",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${opportunityId},
        ${session.user.id},
        ${isWaitlistApplication ? "WAITLISTED" : "PENDING"}::"ApplicationStatus",
        CAST(${JSON.stringify(selectedTaskItems)} AS jsonb),
        ${confirmedTimeCommitment},
        ${skillTags},
        ${experienceNote || null},
        ${experienceNote || null},
        ${waitlistPosition},
        false,
        NOW(),
        NOW()
      )
    `;
  } catch {
    return {
      status: "error",
      message:
        locale === "en"
          ? "The application database migration has not been applied yet."
          : "応募用のデータベース移行がまだ適用されていません。",
    };
  }

  revalidatePath(`/${locale}/opportunities/${opportunityId}`);

  return {
    status: "success",
    message: isWaitlistApplication
      ? locale === "en"
        ? "You joined the waitlist."
        : "ウェイトリストに登録しました。"
      : locale === "en"
        ? "Your application was submitted."
        : "応募を送信しました。",
  };
}

export async function withdrawEventApplication(opportunityId: string, locale: string) {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      status: "error" as const,
      message:
        locale === "en"
          ? "Please sign in before changing your application."
          : "応募を変更するにはログインしてください。",
    };
  }

  const applications = await prisma.$queryRaw<{ status: string }[]>`
    SELECT "status"
    FROM "Application"
    WHERE "opportunityId" = ${opportunityId}
      AND "volunteerId" = ${session.user.id}
    LIMIT 1
  `;
  const application = applications[0];

  if (!application || application.status !== "WAITLISTED") {
    return {
      status: "error" as const,
      message:
        locale === "en"
          ? "Only waitlist applications can be removed here."
          : "ここではウェイトリスト応募のみ取り消せます。",
    };
  }

  await prisma.$executeRaw`
    UPDATE "Application"
    SET "status" = 'WITHDRAWN'::"ApplicationStatus",
        "withdrawnAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "opportunityId" = ${opportunityId}
      AND "volunteerId" = ${session.user.id}
  `;

  revalidatePath(`/${locale}/opportunities/${opportunityId}`);

  return {
    status: "success" as const,
    message:
      locale === "en"
        ? "You left the waitlist."
        : "ウェイトリストから取り消しました。",
  };
}

function parseSkillTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

async function ensureMockOpportunityExists(
  opportunity: MockOpportunity,
) {
  await prisma.user.upsert({
    where: { id: systemRequesterId },
    create: {
      id: systemRequesterId,
      email: systemRequesterEmail,
      name: "Go Touch Grass Demo Organizer",
      role: "REQUESTER",
    },
    update: {},
  });

  await prisma.opportunity.upsert({
    where: { id: opportunity.id },
    create: {
      id: opportunity.id,
      title: opportunity.title,
      description: opportunity.description,
      type: "EVENT",
      status: opportunity.spotsRemaining > 0 ? "OPEN" : "FILLED",
      skills: opportunity.tags,
      prefecture: opportunity.prefecture,
      city: opportunity.city,
      address: opportunity.address,
      startAt: new Date(opportunity.startsAt),
      endAt: new Date(opportunity.endsAt),
      volunteersNeeded: opportunity.volunteersNeeded,
      requesterId: systemRequesterId,
      aiDrafted: opportunity.aiGenerated,
    },
    update: {
      title: opportunity.title,
      description: opportunity.description,
      status: opportunity.spotsRemaining > 0 ? "OPEN" : "FILLED",
      skills: opportunity.tags,
      prefecture: opportunity.prefecture,
      city: opportunity.city,
      address: opportunity.address,
      startAt: new Date(opportunity.startsAt),
      endAt: new Date(opportunity.endsAt),
      volunteersNeeded: opportunity.volunteersNeeded,
      aiDrafted: opportunity.aiGenerated,
    },
  });

  try {
    await prisma.$executeRaw`
      UPDATE "Opportunity"
      SET "allowMultipleTaskSelection" = ${opportunity.allowMultipleTaskSelection ?? false},
          "thingsToBring" = ${opportunity.thingsToBring ?? []},
          "arrivalGuidance" = ${opportunity.arrivalGuidance ?? null},
          "firstLandmarkDescription" = ${opportunity.firstLandmarkDescription ?? null},
          "firstLandmarkImageUrl" = ${opportunity.firstLandmarkImageUrl ?? null},
          "firstContactName" = ${opportunity.firstContactName ?? null},
          "firstContactRole" = ${opportunity.firstContactRole ?? null},
          "firstContactImageUrl" = ${opportunity.firstContactImageUrl ?? null}
      WHERE "id" = ${opportunity.id}
    `;
  } catch {
    // Older databases do not have this column until the event application migration runs.
  }
}
