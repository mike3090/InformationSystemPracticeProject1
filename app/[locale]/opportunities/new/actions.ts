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
  if (!value) {
    throw new Error(`Missing required field: ${key}`);
  }
  return value;
}

function listValue(formData: FormData, key: string) {
  const values = formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (values.length > 1) {
    return values;
  }

  const value = values[0] ?? "";
  if (value.startsWith("data:image/")) {
    return [value];
  }

  return value
    .split(/[,\n]/)
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
  const serialized = String(formData.get("taskFlowJson") ?? "").trim();
  if (serialized) {
    try {
      const rawTasks = JSON.parse(serialized) as unknown;
      if (Array.isArray(rawTasks) && rawTasks.length > 0) {
        return rawTasks.map((rawTask, index) => normalizeTask(rawTask, index));
      }
    } catch {
      throw new Error("Task cards could not be read. Please review and submit again.");
    }
  }

  const name = requiredText(formData, "taskName");
  const startTime = String(formData.get("taskStartTime") ?? "").trim();
  const durationMinutes = numberValue(formData, "taskDurationMinutes", 60);
  const peopleNeeded = numberValue(formData, "taskPeopleNeeded", 1);
  const shortDescription = requiredText(formData, "taskShortDescription");
  const toolsProvided = listValue(formData, "toolsProvided");
  const thingsToBring = listValue(formData, "thingsToBring");

  return [
    {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "task-1",
      name,
      startTime,
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

function normalizeTask(rawTask: unknown, index: number) {
  if (!rawTask || typeof rawTask !== "object") {
    throw new Error("Each task card must contain task details.");
  }

  const task = rawTask as Record<string, unknown>;
  const name = String(task.name ?? "").trim();
  const shortDescription = String(task.shortDescription ?? "").trim();

  if (!name || !shortDescription) {
    throw new Error("Each task card needs a name and description.");
  }

  const peopleNeeded = positiveNumber(task.peopleNeeded, 1);

  return {
    id: slug(name) ? `${slug(name)}-${index + 1}` : `task-${index + 1}`,
    name,
    startTime: String(task.startTime ?? "").trim(),
    durationMinutes: positiveNumber(task.durationMinutes, 60),
    peopleNeeded,
    spotsRemaining: peopleNeeded,
    shortDescription,
    fullDescription: shortDescription,
    typeColor: optionValue(task.typeColor, ["green", "blue", "orange"], "green"),
    environmentShape: optionValue(task.environmentShape, ["relaxed", "structured"], "relaxed"),
    physicalEffort: optionValue(task.physicalEffort, ["low", "medium", "high"], "medium"),
    mentalEffort: optionValue(task.mentalEffort, ["low", "medium", "high"], "medium"),
    toolsProvided: splitList(task.toolsProvided),
    thingsToBring: splitList(task.thingsToBring),
    steps: splitList(task.steps),
    customFields: [],
  };
}

function splitList(value: unknown) {
  return String(value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function positiveNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function optionValue(value: unknown, options: string[], fallback: string) {
  const string = String(value ?? "");
  return options.includes(string) ? string : fallback;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createOpportunity(formData: FormData) {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "en");

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      organization: {
        select: {
          id: true,
          name: true,
          profileCompleted: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("Unauthorized");
  }

  const canPost =
    user.role === "REQUESTER" || user.role === "BOTH" || user.role === "ADMIN";

  if (!canPost) {
    redirect(`/${locale}/opportunities`);
  }

  if (!user.organization?.profileCompleted) {
    redirect(`/${locale}/profile/setup?intent=requester&next=/${locale}/opportunities/new`);
  }

  const startAt = dateValue(formData, "startAt");
  const endAt = dateValue(formData, "endAt");
  const submitIntent = String(formData.get("submitIntent") ?? "draft");
  const status = submitIntent === "publish" ? "OPEN" : "DRAFT";
  const taskFlow = parseTaskFlow(formData);
  const toolsProvided = Array.from(new Set(taskFlow.flatMap((task) => task.toolsProvided)));
  const thingsToBring = Array.from(new Set(taskFlow.flatMap((task) => task.thingsToBring)));
  const volunteersNeeded = numberValue(formData, "volunteersNeeded", 1);

  if (startAt && endAt && endAt <= startAt) {
    throw new Error("End time must be after start time.");
  }

  const opportunity = await prisma.opportunity.create({
    data: {
      title: requiredText(formData, "title"),
      shortDescription: requiredText(formData, "shortDescription"),
      description: requiredText(formData, "description"),
      type: "EVENT",
      status,
      category: requiredText(formData, "category"),
      tags: listValue(formData, "tags"),
      skills: listValue(formData, "skills"),
      taskTypeColor: taskFlow[0]?.typeColor ?? "green",
      environmentShape: taskFlow[0]?.environmentShape ?? "relaxed",
      physicalEffort: taskFlow[0]?.physicalEffort ?? "medium",
      mentalEffort: taskFlow[0]?.mentalEffort ?? "medium",
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
      allowMultipleTaskSelection: false,
      taskFlow,
      instructions: textValue(formData, "instructions"),
      toolsProvided,
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
      aiDrafted: String(formData.get("aiDrafted") ?? "") === "true",
      publishedAt: status === "OPEN" ? new Date() : null,
      requesterId: session.user.id,
      organizationId: user.organization.id,
    },
    select: { id: true },
  });

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/opportunities`);
  redirect(`/${locale}/dashboard/opportunities/${opportunity.id}`);
}
