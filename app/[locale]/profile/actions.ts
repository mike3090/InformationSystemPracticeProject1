"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

function listValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function textValue(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function checkboxValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") === "on";
}

function certificationStatusValue(formData: FormData, currentStatus?: string | null) {
  if (currentStatus) return currentStatus;
  const value = String(formData.get("certificationStatus") ?? "uncertified");
  return value === "under_review" ? "under_review" : "uncertified";
}

function organizationTypeValue(formData: FormData) {
  const value = String(formData.get("organizationType") ?? "INDIVIDUAL");
  const allowed = new Set([
    "INDIVIDUAL",
    "VOLUNTARY_GROUP",
    "NPO",
    "GENERAL_ASSOCIATION",
    "CORPORATION",
    "SCHOOL",
    "MUNICIPAL",
    "SMALL_BUSINESS",
    "COMMUNITY_GROUP",
  ]);

  return allowed.has(value) ? value : "INDIVIDUAL";
}

function environmentStyleValue(formData: FormData) {
  const value = String(formData.get("environmentStyle") ?? "mixed");
  const allowed = new Set(["mixed", "relaxed", "strict"]);

  return allowed.has(value) ? value : "mixed";
}

function recruitmentStatusValue(formData: FormData) {
  const value = String(formData.get("recruitmentStatus") ?? "recruiting");
  const allowed = new Set(["recruiting", "paused", "internal_only"]);

  return allowed.has(value) ? value : "recruiting";
}

function savedRedirectPath(next: string) {
  const target = next && next.startsWith("/") ? next : "/";
  const separator = target.includes("?") ? "&" : "?";
  return `${target}${separator}saved=1`;
}

function canEditRequesterProfile(role: string | undefined) {
  return role === "REQUESTER" || role === "BOTH" || role === "ADMIN";
}

function canEditVolunteerProfile(role: string | undefined) {
  return role === "VOLUNTEER" || role === "BOTH" || role === "ADMIN";
}

export async function saveProfile(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const profileType = String(formData.get("profileType") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      organization: {
        select: { certificationStatus: true },
      },
    },
  });

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  const imageDataUrl = String(formData.get("imageDataUrl") ?? "").trim();
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || undefined,
      // Only overwrite the image when the user uploaded a new one (data URL)
      ...(imageDataUrl.startsWith("data:") ? { image: imageDataUrl } : {}),
    },
  });

  if (profileType === "requester") {
    if (!canEditRequesterProfile(currentUser.role)) {
      throw new Error("Unauthorized");
    }

    await prisma.organization.upsert({
      where: { userId },
      create: {
        userId,
        name: String(formData.get("organizationName") ?? name).trim() || name,
        nameKana: textValue(formData, "nameKana"),
        nameEn: textValue(formData, "nameEn"),
        contactName: name || null,
        type: organizationTypeValue(formData) as never,
        representativeName: textValue(formData, "representativeName"),
        purpose: textValue(formData, "purpose"),
        description: textValue(formData, "description"),
        activityAreas: listValue(formData, "activityAreas"),
        activityRegions: listValue(formData, "activityRegions"),
        environmentStyle: environmentStyleValue(formData),
        prefecture: textValue(formData, "prefecture"),
        city: textValue(formData, "city"),
        address: textValue(formData, "address"),
        publicEmail: textValue(formData, "publicEmail"),
        publicPhone: textValue(formData, "publicPhone"),
        contactFormUrl: textValue(formData, "contactFormUrl"),
        website: textValue(formData, "website"),
        snsLinks: listValue(formData, "snsLinks"),
        founded: textValue(formData, "founded"),
        recruitmentStatus: recruitmentStatusValue(formData),
        hasWaterDispenser: checkboxValue(formData, "hasWaterDispenser"),
        hasRestRoom: checkboxValue(formData, "hasRestRoom"),
        hasAirConditioning: checkboxValue(formData, "hasAirConditioning"),
        activitySpaceSize: textValue(formData, "activitySpaceSize"),
        profileImageUrl: textValue(formData, "profileImageUrl"),
        workspaceImageUrls: listValue(formData, "workspaceImageUrls"),
        certificationStatus: certificationStatusValue(
          formData,
          currentUser.organization?.certificationStatus,
        ),
        certificationSource: textValue(formData, "certificationSource"),
        managerPhone: textValue(formData, "managerPhone"),
        managerLegalName: textValue(formData, "managerLegalName"),
        identityDocumentNote: textValue(formData, "identityDocumentNote"),
        managerAddress: textValue(formData, "managerAddress"),
        isLocationPublic: checkboxValue(formData, "isLocationPublic"),
        contactPersonName: textValue(formData, "contactPersonName"),
        contactPersonRole: textValue(formData, "contactPersonRole"),
        contactPersonPhone: textValue(formData, "contactPersonPhone"),
        contactPersonEmail: textValue(formData, "contactPersonEmail"),
        antiSocialForcesConfirmed: checkboxValue(formData, "antiSocialForcesConfirmed"),
        termsAccepted: checkboxValue(formData, "termsAccepted"),
        legalEntityType: textValue(formData, "legalEntityType"),
        corporateNumber: textValue(formData, "corporateNumber"),
        legalName: textValue(formData, "legalName"),
        legalAddress: textValue(formData, "legalAddress"),
        registrationDocumentUrl: textValue(formData, "registrationDocumentUrl"),
        bylawsUrl: textValue(formData, "bylawsUrl"),
        profileCompleted: true,
      },
      update: {
        name: String(formData.get("organizationName") ?? name).trim() || name,
        nameKana: textValue(formData, "nameKana"),
        nameEn: textValue(formData, "nameEn"),
        contactName: name || null,
        type: organizationTypeValue(formData) as never,
        representativeName: textValue(formData, "representativeName"),
        purpose: textValue(formData, "purpose"),
        description: textValue(formData, "description"),
        activityAreas: listValue(formData, "activityAreas"),
        activityRegions: listValue(formData, "activityRegions"),
        environmentStyle: environmentStyleValue(formData),
        prefecture: textValue(formData, "prefecture"),
        city: textValue(formData, "city"),
        address: textValue(formData, "address"),
        publicEmail: textValue(formData, "publicEmail"),
        publicPhone: textValue(formData, "publicPhone"),
        contactFormUrl: textValue(formData, "contactFormUrl"),
        website: textValue(formData, "website"),
        snsLinks: listValue(formData, "snsLinks"),
        founded: textValue(formData, "founded"),
        recruitmentStatus: recruitmentStatusValue(formData),
        hasWaterDispenser: checkboxValue(formData, "hasWaterDispenser"),
        hasRestRoom: checkboxValue(formData, "hasRestRoom"),
        hasAirConditioning: checkboxValue(formData, "hasAirConditioning"),
        activitySpaceSize: textValue(formData, "activitySpaceSize"),
        profileImageUrl: textValue(formData, "profileImageUrl"),
        workspaceImageUrls: listValue(formData, "workspaceImageUrls"),
        certificationStatus: certificationStatusValue(
          formData,
          currentUser.organization?.certificationStatus,
        ),
        certificationSource: textValue(formData, "certificationSource"),
        managerPhone: textValue(formData, "managerPhone"),
        managerLegalName: textValue(formData, "managerLegalName"),
        identityDocumentNote: textValue(formData, "identityDocumentNote"),
        managerAddress: textValue(formData, "managerAddress"),
        isLocationPublic: checkboxValue(formData, "isLocationPublic"),
        contactPersonName: textValue(formData, "contactPersonName"),
        contactPersonRole: textValue(formData, "contactPersonRole"),
        contactPersonPhone: textValue(formData, "contactPersonPhone"),
        contactPersonEmail: textValue(formData, "contactPersonEmail"),
        antiSocialForcesConfirmed: checkboxValue(formData, "antiSocialForcesConfirmed"),
        termsAccepted: checkboxValue(formData, "termsAccepted"),
        legalEntityType: textValue(formData, "legalEntityType"),
        corporateNumber: textValue(formData, "corporateNumber"),
        legalName: textValue(formData, "legalName"),
        legalAddress: textValue(formData, "legalAddress"),
        registrationDocumentUrl: textValue(formData, "registrationDocumentUrl"),
        bylawsUrl: textValue(formData, "bylawsUrl"),
        profileCompleted: true,
      },
    });
  } else {
    if (!canEditVolunteerProfile(currentUser.role)) {
      throw new Error("Unauthorized");
    }

    await prisma.volunteerProfile.upsert({
      where: { userId },
      create: {
        userId,
        bio: textValue(formData, "bio"),
        availability: textValue(formData, "availability"),
        interests: listValue(formData, "interests"),
        skills: listValue(formData, "skills"),
        languages: listValue(formData, "languages"),
        preferredTaskTypes: listValue(formData, "preferredTaskTypes"),
        preferredEnvironmentStyle: String(
          formData.get("preferredEnvironmentStyle") ?? "either"
        ),
        prefecture: textValue(formData, "prefecture"),
        city: textValue(formData, "city"),
        profileCompleted: true,
      },
      update: {
        bio: textValue(formData, "bio"),
        availability: textValue(formData, "availability"),
        interests: listValue(formData, "interests"),
        skills: listValue(formData, "skills"),
        languages: listValue(formData, "languages"),
        preferredTaskTypes: listValue(formData, "preferredTaskTypes"),
        preferredEnvironmentStyle: String(
          formData.get("preferredEnvironmentStyle") ?? "either"
        ),
        prefecture: textValue(formData, "prefecture"),
        city: textValue(formData, "city"),
        profileCompleted: true,
      },
    });

    try {
      await prisma.$executeRaw`
        UPDATE "VolunteerProfile"
        SET "emailNotificationsEnabled" = ${checkboxValue(formData, "emailNotificationsEnabled")},
            "inAppNotificationsEnabled" = ${checkboxValue(formData, "inAppNotificationsEnabled")},
            "reminder3DaysEnabled" = ${checkboxValue(formData, "reminder3DaysEnabled")},
            "reminder1DayEnabled" = ${checkboxValue(formData, "reminder1DayEnabled")},
            "reminderSameDayEnabled" = ${checkboxValue(formData, "reminderSameDayEnabled")}
        WHERE "userId" = ${userId}
      `;
    } catch {
      // Older databases do not have reminder preference columns until the migration runs.
    }
  }

  redirect(savedRedirectPath(next));
}

export async function addRequesterRole(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const locale = String(formData.get("locale") ?? "ja");
  const next = String(formData.get("next") ?? `/${locale}/opportunities/new`);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      role: "BOTH",
    },
    select: { name: true },
  });

  await prisma.organization.upsert({
    where: { userId },
    create: {
      userId,
      name: user.name || "New organization",
      contactName: user.name,
    },
    update: {},
  });

  redirect(
    `/${locale}/profile/setup?intent=requester&next=${encodeURIComponent(next)}`
  );
}

export async function addVolunteerRole(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const locale = String(formData.get("locale") ?? "ja");
  const next = String(formData.get("next") ?? `/${locale}/opportunities`);

  await prisma.user.update({
    where: { id: userId },
    data: { role: "BOTH" },
  });

  await prisma.volunteerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  redirect(
    `/${locale}/profile/setup?intent=volunteer&next=${encodeURIComponent(next)}`
  );
}
