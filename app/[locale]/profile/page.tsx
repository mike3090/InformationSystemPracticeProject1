import ProfileForm from "./ProfileForm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

type SkillBadgeRow = {
  id: string;
  name: string;
  icon: string;
  description: string;
  earnedCount: number;
  lastEarnedAt: Date;
};

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
  const skillBadges = await getSkillBadges(session.user.id);
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
      {skillBadges.length > 0 && (
        <section className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {locale === "en" ? "Skill badges" : "スキルバッジ"}
          </p>
          <h2 className="mt-2 text-xl font-bold text-stone-950">
            {locale === "en" ? "Visible volunteer experience" : "見える参加経験"}
          </h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {skillBadges.map((badge) => (
              <article key={badge.id} className="rounded-lg bg-white p-4">
                <p className="text-sm font-bold text-stone-950">
                  {badge.icon} {badge.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-600">
                  {badge.description}
                </p>
                <p className="mt-2 text-xs font-semibold text-emerald-700">
                  {locale === "en"
                    ? `${badge.earnedCount} time(s) earned`
                    : `${badge.earnedCount}回獲得`}
                </p>
              </article>
            ))}
          </div>
        </section>
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

async function getSkillBadges(userId: string) {
  try {
    return await prisma.$queryRaw<SkillBadgeRow[]>`
      SELECT
        "id",
        "name",
        "icon",
        "description",
        "earnedCount",
        "lastEarnedAt"
      FROM "VolunteerSkillBadge"
      WHERE "userId" = ${userId}
      ORDER BY "lastEarnedAt" DESC
      LIMIT 6
    `;
  } catch {
    return [];
  }
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
    activityAreasPlaceholder: t("placeholders.activityAreas"),
    activityRegionsPlaceholder: t("placeholders.activityRegions"),
    snsLinksPlaceholder: t("placeholders.snsLinks"),
    foundedPlaceholder: t("placeholders.founded"),
    activitySpaceSizePlaceholder: t("placeholders.activitySpaceSize"),
    workspaceImageUrlsPlaceholder: t("placeholders.workspaceImageUrls"),
    notificationSettings: t("fields.notificationSettings"),
    emailNotifications: t("fields.emailNotifications"),
    inAppNotifications: t("fields.inAppNotifications"),
    reminder3Days: t("fields.reminder3Days"),
    reminder1Day: t("fields.reminder1Day"),
    reminderSameDay: t("fields.reminderSameDay"),
    organizationName: t("fields.organizationName"),
    organizationType: t("fields.organizationType"),
    nameKana: t("fields.nameKana"),
    nameEn: t("fields.nameEn"),
    representativeName: t("fields.representativeName"),
    purpose: t("fields.purpose"),
    activityAreas: t("fields.activityAreas"),
    activityRegions: t("fields.activityRegions"),
    publicEmail: t("fields.publicEmail"),
    publicPhone: t("fields.publicPhone"),
    contactFormUrl: t("fields.contactFormUrl"),
    description: t("fields.description"),
    website: t("fields.website"),
    snsLinks: t("fields.snsLinks"),
    founded: t("fields.founded"),
    recruitmentStatus: t("fields.recruitmentStatus"),
    activitySpaceSize: t("fields.activitySpaceSize"),
    profileImageUrl: t("fields.profileImageUrl"),
    workspaceImageUrls: t("fields.workspaceImageUrls"),
    hasWaterDispenser: t("fields.hasWaterDispenser"),
    hasRestRoom: t("fields.hasRestRoom"),
    hasAirConditioning: t("fields.hasAirConditioning"),
    certificationStatus: t("fields.certificationStatus"),
    certificationStatusPrivate: t("fields.certificationStatusPrivate"),
    certificationSource: t("fields.certificationSource"),
    managerPhone: t("fields.managerPhone"),
    managerLegalName: t("fields.managerLegalName"),
    identityDocumentNote: t("fields.identityDocumentNote"),
    managerAddress: t("fields.managerAddress"),
    isLocationPublic: t("fields.isLocationPublic"),
    contactPersonName: t("fields.contactPersonName"),
    contactPersonRole: t("fields.contactPersonRole"),
    contactPersonPhone: t("fields.contactPersonPhone"),
    contactPersonEmail: t("fields.contactPersonEmail"),
    antiSocialForcesConfirmed: t("fields.antiSocialForcesConfirmed"),
    termsAccepted: t("fields.termsAccepted"),
    legalEntityType: t("fields.legalEntityType"),
    corporateNumber: t("fields.corporateNumber"),
    legalName: t("fields.legalName"),
    legalAddress: t("fields.legalAddress"),
    registrationDocumentUrl: t("fields.registrationDocumentUrl"),
    bylawsUrl: t("fields.bylawsUrl"),
    address: t("fields.address"),
    typeIndividual: t("organizationTypes.individual"),
    typeVoluntaryGroup: t("organizationTypes.voluntaryGroup"),
    typeCompany: t("organizationTypes.company"),
    typeNpo: t("organizationTypes.npo"),
    typeGeneralAssociation: t("organizationTypes.generalAssociation"),
    typeCorporation: t("organizationTypes.corporation"),
    typeSchool: t("organizationTypes.school"),
    typeCommunity: t("organizationTypes.community"),
    typeMunicipal: t("organizationTypes.municipal"),
    publicProfileEyebrow: t("requesterSections.public.eyebrow"),
    publicProfileTitle: t("requesterSections.public.title"),
    publicProfileDescription: t("requesterSections.public.description"),
    reviewProfileEyebrow: t("requesterSections.review.eyebrow"),
    reviewProfileTitle: t("requesterSections.review.title"),
    reviewProfileDescription: t("requesterSections.review.description"),
    certificationEyebrow: t("requesterSections.certification.eyebrow"),
    certificationTitle: t("requesterSections.certification.title"),
    certificationDescription: t("requesterSections.certification.description"),
    recruiting: t("recruitmentStatus.recruiting"),
    recruitmentPaused: t("recruitmentStatus.paused"),
    internalOnly: t("recruitmentStatus.internalOnly"),
    notApplicable: t("legalEntityTypes.notApplicable"),
    otherLegalEntity: t("legalEntityTypes.other"),
    certificationUncertified: t("certificationStatus.uncertified"),
    certificationUnderReview: t("certificationStatus.underReview"),
    certificationCertified: t("certificationStatus.certified"),
    certificationRejected: t("certificationStatus.rejected"),
    certificationChangesRequested: t("certificationStatus.changesRequested"),
    finishSetup: t("finishSetup"),
    saveChanges: t("saveChanges"),
    changePhoto: t("changePhoto"),
    addPhoto: t("addPhoto"),
    photoHint: t("photoHint"),
  };
}
