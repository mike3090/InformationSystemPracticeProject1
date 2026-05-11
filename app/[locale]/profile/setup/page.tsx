import ProfileForm from "../ProfileForm";
import { addRequesterRole, addVolunteerRole } from "../actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function ProfileSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; saved?: string; intent?: string }>;
}) {
  const { locale } = await params;
  const { next, saved, intent } = await searchParams;
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
  const safeNext = next?.startsWith(`/${locale}/`) ? next : `/${locale}/opportunities`;
  const profileType =
    intent === "requester" || safeNext.includes("/opportunities/new")
      ? "requester"
      : "volunteer";
  const needsRequesterRole =
    profileType === "requester" &&
    user.role !== "REQUESTER" &&
    user.role !== "BOTH" &&
    user.role !== "ADMIN";
  const needsVolunteerRole =
    profileType === "volunteer" &&
    user.role !== "VOLUNTEER" &&
    user.role !== "BOTH" &&
    user.role !== "ADMIN";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900">{t("setupTitle")}</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        {profileType === "requester" ? t("requesterSetupIntro") : t("volunteerSetupIntro")}
      </p>
      {saved === "1" && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          {t("savedMessage")}
        </div>
      )}
      {needsRequesterRole ? (
        <RoleExpansionForm
          action={addRequesterRole}
          locale={locale}
          next={safeNext}
          title={t("becomeRequesterTitle")}
          body={t("becomeRequesterBody")}
          submitLabel={t("becomeRequesterSubmit")}
        />
      ) : needsVolunteerRole ? (
        <RoleExpansionForm
          action={addVolunteerRole}
          locale={locale}
          next={safeNext}
          title={t("becomeVolunteerTitle")}
          body={t("becomeVolunteerBody")}
          submitLabel={t("becomeVolunteerSubmit")}
        />
      ) : (
        <ProfileForm
          user={user}
          locale={locale}
          next={safeNext}
          mode="setup"
          profileType={profileType}
          labels={profileLabels(t)}
        />
      )}
    </div>
  );
}

function RoleExpansionForm({
  action,
  locale,
  next,
  title,
  body,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  locale: string;
  next: string;
  title: string;
  body: string;
  submitLabel: string;
}) {
  return (
    <form
      action={action}
      className="mt-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">{body}</p>
      <button
        type="submit"
        className="mt-5 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600"
      >
        {submitLabel}
      </button>
    </form>
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
    becomeRequesterTitle: t("becomeRequesterTitle"),
    becomeRequesterBody: t("becomeRequesterBody"),
    becomeRequesterSubmit: t("becomeRequesterSubmit"),
    becomeVolunteerTitle: t("becomeVolunteerTitle"),
    becomeVolunteerBody: t("becomeVolunteerBody"),
    becomeVolunteerSubmit: t("becomeVolunteerSubmit"),
  };
}
