import ProfileForm from "./ProfileForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { locale } = await params;
  const { saved } = await searchParams;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true, organization: true },
  });

  if (!user) {
    redirect(`/${locale}/auth/signin`);
  }

  const t = await getTranslations("profile");
  const profileType =
    user.role === "REQUESTER" || user.role === "BOTH" || user.role === "ADMIN"
      ? "requester"
      : "volunteer";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900">{t("editTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        {profileType === "requester" ? t("requesterEditIntro") : t("volunteerEditIntro")}
      </p>
      {saved === "1" && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {t("savedMessage")}
        </div>
      )}
      <ProfileForm
        user={user}
        locale={locale}
        next={`/${locale}/profile`}
        mode="edit"
        profileType={profileType}
        labels={profileLabels(t)}
      />
    </div>
  );
}

function profileLabels(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    name: t("fields.name"),
    email: t("fields.email"),
    prefecture: t("fields.prefecture"),
    city: t("fields.city"),
    bio: t("fields.bio"),
    availability: t("fields.availability"),
    availabilityPlaceholder: t("placeholders.availability"),
    environment: t("fields.environment"),
    environmentEither: t("environment.either"),
    environmentRelaxed: t("environment.relaxed"),
    environmentStructured: t("environment.structured"),
    environmentMixed: t("environment.mixed"),
    interests: t("fields.interests"),
    interestsPlaceholder: t("placeholders.interests"),
    skills: t("fields.skills"),
    skillsPlaceholder: t("placeholders.skills"),
    languages: t("fields.languages"),
    languagesPlaceholder: t("placeholders.languages"),
    preferredTaskTypes: t("fields.preferredTaskTypes"),
    preferredTaskTypesPlaceholder: t("placeholders.preferredTaskTypes"),
    organizationName: t("fields.organizationName"),
    organizationType: t("fields.organizationType"),
    description: t("fields.description"),
    website: t("fields.website"),
    address: t("fields.address"),
    typeIndividual: t("organizationTypes.individual"),
    typeCompany: t("organizationTypes.company"),
    typeNpo: t("organizationTypes.npo"),
    typeCommunity: t("organizationTypes.community"),
    typeMunicipal: t("organizationTypes.municipal"),
    finishSetup: t("finishSetup"),
    saveChanges: t("saveChanges"),
  };
}
