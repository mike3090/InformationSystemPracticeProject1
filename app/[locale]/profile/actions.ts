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

export async function saveProfile(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;
  const role = session.user.role;
  const name = String(formData.get("name") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: name || undefined,
    },
  });

  if (role === "REQUESTER") {
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
