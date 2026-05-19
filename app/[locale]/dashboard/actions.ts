"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const statusActions = new Set(["publish", "pause", "complete", "cancel"]);
const certificationActions = new Set(["approve", "reject", "request_changes"]);

export async function updateOpportunityStatus(formData: FormData) {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "en");
  const opportunityId = String(formData.get("opportunityId") ?? "");
  const action = String(formData.get("statusAction") ?? "");

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!opportunityId || !statusActions.has(action)) {
    throw new Error("Invalid opportunity action.");
  }

  const opportunity = await prisma.opportunity.findFirst({
    where: {
      id: opportunityId,
      requesterId: session.user.id,
    },
    select: { id: true },
  });

  if (!opportunity) {
    throw new Error("You can only manage your own opportunities.");
  }

  const nextStatus =
    action === "publish"
      ? "OPEN"
      : action === "pause"
        ? "PAUSED"
        : action === "complete"
          ? "COMPLETED"
          : "CANCELLED";

  await prisma.$executeRaw`
    UPDATE "Opportunity"
    SET "status" = ${nextStatus}::"OpportunityStatus",
        "publishedAt" = CASE
          WHEN ${nextStatus} = 'OPEN' THEN COALESCE("publishedAt", NOW())
          ELSE "publishedAt"
        END,
        "completedAt" = CASE
          WHEN ${nextStatus} = 'COMPLETED' THEN NOW()
          ELSE "completedAt"
        END,
        "updatedAt" = NOW()
    WHERE "id" = ${opportunityId}
      AND "requesterId" = ${session.user.id}
  `;

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/opportunities/${opportunityId}`);
  revalidatePath(`/${locale}/opportunities`);
}

export async function copyOpportunity(formData: FormData) {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "en");
  const opportunityId = String(formData.get("opportunityId") ?? "");

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const source = await prisma.opportunity.findFirst({
    where: { id: opportunityId, requesterId: session.user.id },
  });

  if (!source) {
    throw new Error("You can only copy your own opportunities.");
  }

  const copy = await prisma.opportunity.create({
    data: {
      title: `${source.title} copy`,
      titleJa: source.titleJa,
      shortDescription: source.shortDescription,
      description: source.description,
      descriptionJa: source.descriptionJa,
      type: source.type,
      status: "DRAFT",
      category: source.category,
      tags: source.tags,
      taskTypeColor: source.taskTypeColor,
      environmentShape: source.environmentShape,
      physicalEffort: source.physicalEffort,
      mentalEffort: source.mentalEffort,
      skills: source.skills,
      prefecture: source.prefecture,
      city: source.city,
      address: source.address,
      googleMapsUrl: source.googleMapsUrl,
      startAt: source.startAt,
      endAt: source.endAt,
      arrivalTime: source.arrivalTime,
      durationMinutes: source.durationMinutes,
      recurrenceRule: source.recurrenceRule,
      volunteersNeeded: source.volunteersNeeded,
      maxApplicants: source.maxApplicants,
      allowWaitlist: source.allowWaitlist,
      allowMultipleTaskSelection: source.allowMultipleTaskSelection,
      taskFlow: source.taskFlow ?? [],
      instructions: source.instructions,
      toolsProvided: source.toolsProvided,
      thingsToBring: source.thingsToBring,
      arrivalGuidance: source.arrivalGuidance,
      firstLandmarkDescription: source.firstLandmarkDescription,
      firstLandmarkImageUrl: source.firstLandmarkImageUrl,
      firstContactName: source.firstContactName,
      firstContactRole: source.firstContactRole,
      firstContactImageUrl: source.firstContactImageUrl,
      coverImageUrl: source.coverImageUrl,
      workspaceImageUrls: source.workspaceImageUrls,
      workspace3dEmbedUrl: source.workspace3dEmbedUrl,
      preApplicationQuestions: source.preApplicationQuestions ?? [],
      aiTemplateUsed: source.aiTemplateUsed,
      requesterId: session.user.id,
      organizationId: source.organizationId,
    },
    select: { id: true },
  });

  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/dashboard/opportunities/${copy.id}`);
}

export async function submitOrganizationCertification(formData: FormData) {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "en");

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const organization = await prisma.organization.findUnique({
    where: { userId: session.user.id },
    select: {
      id: true,
      termsAccepted: true,
      managerPhone: true,
      managerLegalName: true,
      contactPersonEmail: true,
      contactPersonPhone: true,
      legalName: true,
      legalAddress: true,
      type: true,
    },
  });

  if (!organization) {
    redirect(`/${locale}/profile/setup?intent=requester&next=/${locale}/dashboard`);
  }

  const isLegalEntity = organization.type !== "INDIVIDUAL";
  const hasPrivateContact =
    organization.termsAccepted &&
    organization.managerPhone &&
    organization.managerLegalName &&
    organization.contactPersonEmail &&
    organization.contactPersonPhone;
  const hasLegalDetails =
    !isLegalEntity || (organization.legalName && organization.legalAddress);

  if (!hasPrivateContact || !hasLegalDetails) {
    redirect(`/${locale}/profile?certificationMissing=1`);
  }

  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      certificationStatus: "under_review",
      certificationSubmittedAt: new Date(),
      certificationReviewedAt: null,
      certificationReviewNote: null,
    },
  });

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/profile`);
}

export async function reviewOrganizationCertification(formData: FormData) {
  const session = await auth();
  const locale = String(formData.get("locale") ?? "en");
  const organizationId = String(formData.get("organizationId") ?? "");
  const action = String(formData.get("certificationAction") ?? "");
  const note = String(formData.get("reviewNote") ?? "").trim();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!organizationId || !certificationActions.has(action)) {
    throw new Error("Invalid certification action.");
  }

  const reviewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, name: true },
  });

  if (reviewer?.role !== "ADMIN") {
    throw new Error("Only admins can review organization certification.");
  }

  const status =
    action === "approve"
      ? "certified"
      : action === "reject"
        ? "rejected"
        : "changes_requested";
  const source =
    action === "approve"
      ? `Reviewed by ${reviewer.name || "admin"}`
      : undefined;

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      certificationStatus: status,
      certificationSource: source,
      certifiedAt: action === "approve" ? new Date() : null,
      certificationReviewedAt: new Date(),
      certificationReviewNote: note || null,
    },
  });

  revalidatePath(`/${locale}/dashboard`);
  revalidatePath(`/${locale}/dashboard/certifications`);
}
