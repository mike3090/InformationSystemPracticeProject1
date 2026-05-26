import { prisma } from "@/lib/db";

export function canUseOrganizerTools(role?: string | null) {
  return role === "REQUESTER" || role === "BOTH" || role === "ADMIN";
}

export async function userCanUseOrganizerTools(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return canUseOrganizerTools(user?.role);
}

export function organizerToolForbiddenResponse() {
  return Response.json(
    {
      ok: false,
      error: "Only organizer accounts can use this tool.",
      code: "FORBIDDEN",
    },
    { status: 403 },
  );
}
