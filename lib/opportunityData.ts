import { prisma } from "@/lib/db";
import type {
  EffortLevel,
  EnvironmentShape,
  MockOpportunity,
  OpportunityTask,
  TaskVisualType,
} from "@/lib/mockOpportunities";
import {
  getMockOpportunity,
  mockOpportunities,
} from "@/lib/mockOpportunities";

type OpportunityRow = {
  id: string;
  requesterId: string;
  title: string;
  shortDescription: string | null;
  description: string;
  category: string | null;
  tags: string[];
  taskTypeColor: string | null;
  environmentShape: string | null;
  physicalEffort: string;
  mentalEffort: string;
  skills: string[];
  prefecture: string | null;
  city: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  startAt: Date | null;
  endAt: Date | null;
  durationMinutes: number | null;
  volunteersNeeded: number;
  maxApplicants: number | null;
  allowWaitlist: boolean;
  allowMultipleTaskSelection: boolean;
  taskFlow: unknown;
  toolsProvided: string[];
  thingsToBring: string[];
  arrivalGuidance: string | null;
  firstLandmarkDescription: string | null;
  firstLandmarkImageUrl: string | null;
  firstContactName: string | null;
  firstContactRole: string | null;
  firstContactImageUrl: string | null;
  coverImageUrl: string | null;
  workspaceImageUrls: string[];
  aiDrafted: boolean;
  createdAt: Date;
  organizationName: string | null;
  requesterName: string | null;
  certificationStatus: string | null;
  applicantCount: number;
};

const systemMockRequesterId = "system-mock-requester";

export async function getVolunteerDiscoveryOpportunities() {
  const dbOpportunities = await prisma.$queryRaw<OpportunityRow[]>`
    SELECT
      o."id",
      o."requesterId",
      o."title",
      o."shortDescription",
      o."description",
      o."category",
      o."tags",
      o."taskTypeColor",
      o."environmentShape",
      o."physicalEffort",
      o."mentalEffort",
      o."skills",
      o."prefecture",
      o."city",
      o."address",
      o."googleMapsUrl",
      o."startAt",
      o."endAt",
      o."durationMinutes",
      o."volunteersNeeded",
      o."maxApplicants",
      o."allowWaitlist",
      o."allowMultipleTaskSelection",
      o."taskFlow",
      o."toolsProvided",
      o."thingsToBring",
      o."arrivalGuidance",
      o."firstLandmarkDescription",
      o."firstLandmarkImageUrl",
      o."firstContactName",
      o."firstContactRole",
      o."firstContactImageUrl",
      o."coverImageUrl",
      o."workspaceImageUrls",
      o."aiDrafted",
      o."createdAt",
      org."name" AS "organizationName",
      u."name" AS "requesterName",
      org."certificationStatus" AS "certificationStatus",
      COALESCE(application_counts.count, 0)::int AS "applicantCount"
    FROM "Opportunity" o
    INNER JOIN "User" u ON u."id" = o."requesterId"
    LEFT JOIN "Organization" org ON org."id" = o."organizationId"
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS count
      FROM "Application" a
      WHERE a."opportunityId" = o."id"
        AND a."status" IN (
          'PENDING'::"ApplicationStatus",
          'ACCEPTED'::"ApplicationStatus",
          'WAITLISTED'::"ApplicationStatus"
        )
    ) application_counts ON TRUE
    WHERE o."status" = 'OPEN'::"OpportunityStatus"
    ORDER BY o."startAt" ASC NULLS LAST, o."createdAt" DESC
  `;

  const visibleDbOpportunities = dbOpportunities.filter(
    (opportunity) =>
      !(
        opportunity.requesterId === systemMockRequesterId &&
        getMockOpportunity(opportunity.id)
      ),
  );
  const dbIds = new Set(visibleDbOpportunities.map((opportunity) => opportunity.id));
  return [
    ...visibleDbOpportunities.map(mapDbOpportunityToVolunteerOpportunity),
    ...mockOpportunities.filter((opportunity) => !dbIds.has(opportunity.id)),
  ];
}

export async function getVolunteerOpportunity(id: string) {
  const dbRows = await prisma.$queryRaw<OpportunityRow[]>`
    SELECT
      o."id",
      o."requesterId",
      o."title",
      o."shortDescription",
      o."description",
      o."category",
      o."tags",
      o."taskTypeColor",
      o."environmentShape",
      o."physicalEffort",
      o."mentalEffort",
      o."skills",
      o."prefecture",
      o."city",
      o."address",
      o."googleMapsUrl",
      o."startAt",
      o."endAt",
      o."durationMinutes",
      o."volunteersNeeded",
      o."maxApplicants",
      o."allowWaitlist",
      o."allowMultipleTaskSelection",
      o."taskFlow",
      o."toolsProvided",
      o."thingsToBring",
      o."arrivalGuidance",
      o."firstLandmarkDescription",
      o."firstLandmarkImageUrl",
      o."firstContactName",
      o."firstContactRole",
      o."firstContactImageUrl",
      o."coverImageUrl",
      o."workspaceImageUrls",
      o."aiDrafted",
      o."createdAt",
      org."name" AS "organizationName",
      u."name" AS "requesterName",
      org."certificationStatus" AS "certificationStatus",
      COALESCE(application_counts.count, 0)::int AS "applicantCount"
    FROM "Opportunity" o
    INNER JOIN "User" u ON u."id" = o."requesterId"
    LEFT JOIN "Organization" org ON org."id" = o."organizationId"
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS count
      FROM "Application" a
      WHERE a."opportunityId" = o."id"
        AND a."status" IN (
          'PENDING'::"ApplicationStatus",
          'ACCEPTED'::"ApplicationStatus",
          'WAITLISTED'::"ApplicationStatus"
        )
    ) application_counts ON TRUE
    WHERE o."id" = ${id}
      AND o."status" = 'OPEN'::"OpportunityStatus"
    LIMIT 1
  `;

  if (
    dbRows[0]?.requesterId === systemMockRequesterId &&
    getMockOpportunity(id)
  ) {
    return getMockOpportunity(id);
  }

  return dbRows[0] ? mapDbOpportunityToVolunteerOpportunity(dbRows[0]) : getMockOpportunity(id);
}

function mapDbOpportunityToVolunteerOpportunity(row: OpportunityRow): MockOpportunity {
  const startsAt = (row.startAt ?? row.createdAt).toISOString();
  const endsAt =
    row.endAt ??
    new Date((row.startAt ?? row.createdAt).getTime() + (row.durationMinutes ?? 60) * 60_000);
  const capacity = row.maxApplicants ?? row.volunteersNeeded;
  const spotsRemaining = Math.max(0, capacity - row.applicantCount);
  const taskFlow = normalizeTaskFlow(row, spotsRemaining);
  const workspaceImageUrls = row.workspaceImageUrls.length > 0
    ? row.workspaceImageUrls
    : row.coverImageUrl
      ? [row.coverImageUrl]
      : [];

  return {
    id: row.id,
    title: row.title,
    organizerName:
      row.organizationName ?? row.requesterName ?? "Community organizer",
    trustedOrganizer: row.certificationStatus === "certified",
    category: row.category ?? "Volunteer task",
    city: row.city ?? row.prefecture ?? "Online",
    prefecture: row.prefecture ?? row.city ?? "Online",
    address:
      row.address ??
      ([row.city, row.prefecture].filter(Boolean).join(", ") || "Online"),
    mapsUrl:
      row.googleMapsUrl ??
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        row.address ?? [row.city, row.prefecture].filter(Boolean).join(", "),
      )}`,
    startsAt,
    endsAt: endsAt.toISOString(),
    scheduleLabel: formatScheduleLabel(row.startAt ?? row.createdAt, endsAt),
    durationLabel: formatDurationLabel(row.startAt ?? row.createdAt, endsAt),
    volunteersNeeded: row.volunteersNeeded,
    spotsRemaining,
    allowMultipleTaskSelection: row.allowMultipleTaskSelection,
    tags: row.tags,
    shortDescription: row.shortDescription ?? row.description.slice(0, 160),
    description: row.description,
    coverImageUrl: row.coverImageUrl ?? undefined,
    workspaceImageUrls,
    thingsToBring: row.thingsToBring,
    arrivalGuidance: row.arrivalGuidance ?? undefined,
    firstLandmarkDescription: row.firstLandmarkDescription ?? undefined,
    firstLandmarkImageUrl: row.firstLandmarkImageUrl ?? undefined,
    firstContactName: row.firstContactName ?? undefined,
    firstContactRole: row.firstContactRole ?? undefined,
    firstContactImageUrl: row.firstContactImageUrl ?? undefined,
    aiGenerated: row.aiDrafted,
    taskFlow,
  };
}

function normalizeTaskFlow(row: OpportunityRow, opportunitySpotsRemaining: number) {
  const rawTasks = Array.isArray(row.taskFlow) ? row.taskFlow : [];
  const tasks = rawTasks
    .filter((task): task is Record<string, unknown> => Boolean(task) && typeof task === "object")
    .map((task, index): OpportunityTask => {
      const peopleNeeded = positiveNumber(task.peopleNeeded, row.volunteersNeeded);
      return {
        id: text(task.id) || `task-${index + 1}`,
        name: text(task.name) || row.title,
        startTime: text(task.startTime) || formatTime(row.startAt ?? row.createdAt),
        durationMinutes: positiveNumber(task.durationMinutes, row.durationMinutes ?? 60),
        peopleNeeded,
        spotsRemaining: Math.min(
          peopleNeeded,
          positiveNumber(task.spotsRemaining, opportunitySpotsRemaining),
        ),
        shortDescription: text(task.shortDescription) || row.shortDescription || row.description,
        fullDescription: text(task.fullDescription) || text(task.shortDescription) || row.description,
        typeColor: taskVisualType(task.typeColor ?? row.taskTypeColor),
        environmentShape: environmentShape(task.environmentShape ?? row.environmentShape),
        physicalEffort: effortLevel(task.physicalEffort ?? row.physicalEffort),
        mentalEffort: effortLevel(task.mentalEffort ?? row.mentalEffort),
        steps: stringList(task.steps),
        toolsProvided: stringList(task.toolsProvided, row.toolsProvided),
        thingsToBring: stringList(task.thingsToBring, row.thingsToBring),
        customFields: [],
      };
    });

  if (tasks.length > 0) return tasks;

  return [
    {
      id: "task-1",
      name: row.title,
      startTime: formatTime(row.startAt ?? row.createdAt),
      durationMinutes: row.durationMinutes ?? 60,
      peopleNeeded: row.volunteersNeeded,
      spotsRemaining: opportunitySpotsRemaining,
      shortDescription: row.shortDescription ?? row.description,
      fullDescription: row.description,
      typeColor: taskVisualType(row.taskTypeColor),
      environmentShape: environmentShape(row.environmentShape),
      physicalEffort: effortLevel(row.physicalEffort),
      mentalEffort: effortLevel(row.mentalEffort),
      steps: [],
      toolsProvided: row.toolsProvided,
      thingsToBring: row.thingsToBring,
      customFields: [],
    },
  ];
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function stringList(value: unknown, fallback: string[] = []) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : fallback;
}

function positiveNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function taskVisualType(value: unknown): TaskVisualType {
  return value === "blue" || value === "orange" || value === "green"
    ? value
    : "green";
}

function environmentShape(value: unknown): EnvironmentShape {
  return value === "structured" ? "structured" : "relaxed";
}

function effortLevel(value: unknown): EffortLevel {
  return value === "low" || value === "medium" || value === "high"
    ? value
    : "medium";
}

function formatScheduleLabel(start: Date, end: Date) {
  return `${new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start)} · ${formatTime(start)}-${formatTime(end)}`;
}

function formatDurationLabel(start: Date, end: Date) {
  const minutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining} min`;
  if (remaining === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${hours} hr ${remaining} min`;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
