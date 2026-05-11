import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

export type ArrivalGuidance = {
  arrivalGuidance: string | null;
  firstLandmarkDescription: string | null;
  firstLandmarkImageUrl: string | null;
  firstContactName: string | null;
  firstContactRole: string | null;
  firstContactImageUrl: string | null;
  thingsToBring: string[];
};

export type EventUpdateView = {
  id: string;
  type: string;
  message: string;
  highlightedDetail: string | null;
  createdAt: Date;
  organizerName: string | null;
};

export type EventMessageView = {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  senderName: string | null;
};

export function hasArrivalGuidance(guidance: ArrivalGuidance | null) {
  if (!guidance) return false;
  return Boolean(
    guidance.arrivalGuidance ||
      guidance.firstLandmarkDescription ||
      guidance.firstLandmarkImageUrl ||
      guidance.firstContactName ||
      guidance.firstContactRole ||
      guidance.firstContactImageUrl,
  );
}

export async function createNotification(input: {
  userId: string;
  opportunityId?: string | null;
  applicationId?: string | null;
  type: string;
  title: string;
  body: string;
  metadata?: unknown;
}) {
  try {
    await prisma.$executeRaw`
      INSERT INTO "Notification" (
        "id",
        "userId",
        "opportunityId",
        "applicationId",
        "type",
        "title",
        "body",
        "metadata",
        "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.userId},
        ${input.opportunityId ?? null},
        ${input.applicationId ?? null},
        ${input.type},
        ${input.title},
        ${input.body},
        CAST(${JSON.stringify(input.metadata ?? {})} AS jsonb),
        NOW()
      )
    `;
  } catch (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }
}

export async function getArrivalGuidance(
  opportunityId: string,
): Promise<ArrivalGuidance | null> {
  try {
    const rows = await prisma.$queryRaw<ArrivalGuidance[]>`
      SELECT
        "arrivalGuidance",
        "firstLandmarkDescription",
        "firstLandmarkImageUrl",
        "firstContactName",
        "firstContactRole",
        "firstContactImageUrl",
        "thingsToBring"
      FROM "Opportunity"
      WHERE "id" = ${opportunityId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getEventUpdates(
  opportunityId: string,
): Promise<EventUpdateView[]> {
  try {
    return await prisma.$queryRaw<EventUpdateView[]>`
      SELECT
        eu."id",
        eu."type",
        eu."message",
        eu."highlightedDetail",
        eu."createdAt",
        u."name" AS "organizerName"
      FROM "EventUpdate" eu
      INNER JOIN "User" u ON u."id" = eu."organizerId"
      WHERE eu."opportunityId" = ${opportunityId}
      ORDER BY eu."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

function isMissingRelationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = "message" in error ? String(error.message) : "";
  const code = "code" in error ? String(error.code) : "";
  return code === "P2010" && message.includes("42P01");
}

export async function getEventMessages(
  applicationId: string,
): Promise<EventMessageView[]> {
  try {
    return await prisma.$queryRaw<EventMessageView[]>`
      SELECT
        em."id",
        em."body",
        em."createdAt",
        em."senderId",
        u."name" AS "senderName"
      FROM "EventMessage" em
      INNER JOIN "User" u ON u."id" = em."senderId"
      WHERE em."applicationId" = ${applicationId}
      ORDER BY em."createdAt" ASC
    `;
  } catch {
    return [];
  }
}

export function buildConfirmationBody(input: {
  eventName: string;
  dateTime: string;
  location: string;
  task: string;
  thingsToBring: string[];
  arrivalSummary?: string | null;
}) {
  const bring = input.thingsToBring.length
    ? input.thingsToBring.join(", ")
    : "Nothing special listed";

  return [
    `Your spot is confirmed for ${input.eventName}.`,
    `Time: ${input.dateTime}`,
    `Location: ${input.location}`,
    `Task: ${input.task}`,
    `Bring: ${bring}`,
    input.arrivalSummary ? `Arrival: ${input.arrivalSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendEmailLater(input: {
  toUserId: string;
  subject: string;
  body: string;
}) {
  void input;
  // Placeholder until the project chooses an email provider.
}
