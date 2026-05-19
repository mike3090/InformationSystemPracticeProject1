"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export async function createExperienceShare(formData: FormData) {
  const session = await auth();
  const locale = textValue(formData, "locale") || "ja";

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/experiences/new`);
  }

  const applicationId = textValue(formData, "applicationId");
  const title = textValue(formData, "title");
  const body = textValue(formData, "body");
  const imageUrl = textValue(formData, "imageUrl");
  const tags = parseTags(textValue(formData, "tags"));
  const ratingValue = Number(textValue(formData, "rating"));
  const rating = Number.isFinite(ratingValue)
    ? Math.min(5, Math.max(1, ratingValue))
    : null;

  if (!applicationId || title.length < 4 || body.length < 40) {
    redirect(`/${locale}/experiences/new?error=missing`);
  }

  const eligibleApplications = await prisma.$queryRaw<
    { opportunityId: string; existingShareId: string | null }[]
  >`
    SELECT
      a."opportunityId" AS "opportunityId",
      s."id" AS "existingShareId"
    FROM "Application" a
    INNER JOIN "Opportunity" o ON o."id" = a."opportunityId"
    LEFT JOIN "ExperienceShare" s ON s."applicationId" = a."id"
    WHERE a."id" = ${applicationId}
      AND a."volunteerId" = ${session.user.id}
      AND (
        a."status" = 'ACCEPTED'::"ApplicationStatus"
        OR o."status" = 'COMPLETED'::"OpportunityStatus"
        OR o."endAt" < NOW()
      )
    LIMIT 1
  `;

  const eligibleApplication = eligibleApplications[0];

  if (!eligibleApplication || eligibleApplication.existingShareId) {
    redirect(`/${locale}/experiences/new?error=ineligible`);
  }

  await prisma.$executeRaw`
    INSERT INTO "ExperienceShare" (
      "id",
      "authorId",
      "opportunityId",
      "applicationId",
      "title",
      "body",
      "imageUrl",
      "tags",
      "rating",
      "isPublished",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${session.user.id},
      ${eligibleApplication.opportunityId},
      ${applicationId},
      ${title},
      ${body},
      ${imageUrl || null},
      ${tags},
      ${rating},
      true,
      NOW(),
      NOW()
    )
  `;

  revalidatePath(`/${locale}/experiences`);
  revalidatePath(`/${locale}/dashboard`);
  redirect(`/${locale}/experiences`);
}
