"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function requiredText(formData: FormData, key: string) {
  const value = textValue(formData, key);
  if (!value) throw new Error(`Missing required field: ${key}`);
  return value;
}

function listValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberValue(formData: FormData, key: string, fallback: number) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function dateValue(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function parseTaskFlow(formData: FormData) {
  const name = requiredText(formData, "taskName");
  const durationMinutes = numberValue(formData, "taskDurationMinutes", 60);
  const peopleNeeded = numberValue(formData, "taskPeopleNeeded", 1);
  const shortDescription = requiredText(formData, "taskShortDescription");
  const toolsProvided = listValue(formData, "toolsProvided");
  const thingsToBring = listValue(formData, "thingsToBring");

  return [
    {
      id:
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "task-1",
      name,
      startTime: String(formData.get("taskStartTime") ?? "").trim(),
      durationMinutes,
      peopleNeeded,
      spotsRemaining: peopleNeeded,
      shortDescription,
      fullDescription: shortDescription,
      typeColor: String(formData.get("taskTypeColor") ?? "green"),
      environmentShape: String(formData.get("environmentShape") ?? "relaxed"),
      physicalEffort: String(formData.get("physicalEffort") ?? "medium"),
      mentalEffort: String(formData.get("mentalEffort") ?? "medium"),
      toolsProvided,
      thingsToBring,
      steps: listValue(formData, "taskSteps"),
      customFields: [],
    },
  ];
}

export async function updateOpportunity(formData: FormData) {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "en");
  const opportunityId = String(formData.get("opportunityId") ?? "");

  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!opportunityId) throw new Error("Missing opportunity id.");

  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, requesterId: session.user.id },
    select: { id: true, status: true },
  });

  if (!opportunity) {
    throw new Error("You can only edit your own opportunities.");
  }

  const startAt = dateValue(formData, "startAt");
  const endAt = dateValue(formData, "endAt");
  const submitIntent = String(formData.get("submitIntent") ?? "save");
  const nextStatus =
    submitIntent === "publish" && opportunity.status !== "COMPLETED"
      ? "OPEN"
      : opportunity.status;
  const volunteersNeeded = numberValue(formData, "volunteersNeeded", 1);
  const taskFlow = parseTaskFlow(formData);
  const thingsToBring = listValue(formData, "thingsToBring");

  if (startAt && endAt && endAt <= startAt) {
    throw new Error("End time must be after start time.");
  }

  await prisma.opportunity.update({
    where: { id: opportunityId },
    data: {
      title: requiredText(formData, "title"),
      shortDescription: requiredText(formData, "shortDescription"),
      description: requiredText(formData, "description"),
      status: nextStatus,
      category: requiredText(formData, "category"),
      tags: listValue(formData, "tags"),
      skills: listValue(formData, "skills"),
      taskTypeColor: String(formData.get("taskTypeColor") ?? "green"),
      environmentShape: String(formData.get("environmentShape") ?? "relaxed"),
      physicalEffort: String(formData.get("physicalEffort") ?? "medium"),
      mentalEffort: String(formData.get("mentalEffort") ?? "medium"),
      prefecture: requiredText(formData, "prefecture"),
      city: requiredText(formData, "city"),
      address: requiredText(formData, "address"),
      googleMapsUrl: textValue(formData, "googleMapsUrl"),
      startAt,
      endAt,
      arrivalTime: dateValue(formData, "arrivalTime"),
      volunteersNeeded,
      maxApplicants: numberValue(formData, "maxApplicants", volunteersNeeded),
      allowWaitlist: String(formData.get("allowWaitlist") ?? "") === "on",
      taskFlow,
      instructions: textValue(formData, "instructions"),
      toolsProvided: listValue(formData, "toolsProvided"),
      thingsToBring,
      arrivalGuidance: textValue(formData, "arrivalGuidance"),
      firstLandmarkDescription: textValue(formData, "firstLandmarkDescription"),
      firstLandmarkImageUrl: textValue(formData, "firstLandmarkImageUrl"),
      firstContactName: textValue(formData, "firstContactName"),
      firstContactRole: textValue(formData, "firstContactRole"),
      firstContactImageUrl: textValue(formData, "firstContactImageUrl"),
      coverImageUrl: textValue(formData, "coverImageUrl"),
      workspaceImageUrls: listValue(formData, "workspaceImageUrls"),
      workspace3dEmbedUrl: textValue(formData, "workspace3dEmbedUrl"),
      preApplicationQuestions: listValue(formData, "preApplicationQuestions").map(
        (question) => ({ question }),
      ),
      publishedAt:
        nextStatus === "OPEN" && opportunity.status !== "OPEN"
          ? new Date()
          : undefined,
    },
  });

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/opportunities/${opportunityId}`);
  revalidatePath(`/${locale}/opportunities`);
  revalidatePath(`/${locale}/opportunities/${opportunityId}`);
  redirect(`/${locale}/dashboard/opportunities/${opportunityId}`);
}
