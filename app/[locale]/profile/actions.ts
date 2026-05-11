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
    select: { role: true },
  });

  if (!currentUser) {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || undefined,
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
        contactName: name || null,
        type: String(formData.get("organizationType") ?? "INDIVIDUAL") as never,
        description: textValue(formData, "description"),
        environmentStyle: String(formData.get("environmentStyle") ?? "mixed"),
        prefecture: textValue(formData, "prefecture"),
        city: textValue(formData, "city"),
        address: textValue(formData, "address"),
        website: textValue(formData, "website"),
        profileCompleted: true,
      },
      update: {
        name: String(formData.get("organizationName") ?? name).trim() || name,
        contactName: name || null,
        type: String(formData.get("organizationType") ?? "INDIVIDUAL") as never,
        description: textValue(formData, "description"),
        environmentStyle: String(formData.get("environmentStyle") ?? "mixed"),
        prefecture: textValue(formData, "prefecture"),
        city: textValue(formData, "city"),
        address: textValue(formData, "address"),
        website: textValue(formData, "website"),
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
