import ProfileForm from "../ProfileForm";
import ProfileBotForm from "../ProfileBotForm";
import { addRequesterRole, addVolunteerRole } from "../actions";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import MethodChoice from "@/components/MethodChoice";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function ProfileSetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; saved?: string; intent?: string; method?: string }>;
}) {
  const { locale } = await params;
  const { next, saved, intent, method } = await searchParams;
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
  const requestedProfileType =
    intent === "requester" || safeNext.includes("/opportunities/new")
      ? "requester"
      : "volunteer";
  const canUseRequesterProfile =
    user.role === "REQUESTER" || user.role === "BOTH" || user.role === "ADMIN";
  const canUseVolunteerProfile =
    user.role === "VOLUNTEER" || user.role === "BOTH" || user.role === "ADMIN";
  const profileType =
    requestedProfileType === "volunteer" &&
    !canUseVolunteerProfile &&
    canUseRequesterProfile
      ? "requester"
      : requestedProfileType;
  const needsRequesterRole =
    profileType === "requester" &&
    !canUseRequesterProfile;
  const needsVolunteerRole =
    profileType === "volunteer" &&
    !canUseVolunteerProfile;
  const profileAlreadyCompleted =
    profileType === "requester"
      ? Boolean(user.organization?.profileCompleted)
      : Boolean(user.profile?.profileCompleted);

  if (!needsRequesterRole && !needsVolunteerRole && profileAlreadyCompleted) {
    redirect(safeNext);
  }

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
      ) : profileType === "requester" && method !== "manual" && method !== "bot" ? (
        <MethodChoice
          title={locale === "ja" ? "プロフィールの入力方法" : "Choose profile setup method"}
          body={
            locale === "ja"
              ? "通常フォームで入力するか、bot と会話しながら organizer profile を作成できます。"
              : "Use the regular form, or let the bot guide you through organizer profile setup."
          }
          manualHref={`/${locale}/profile/setup?intent=requester&next=${encodeURIComponent(safeNext)}&method=manual`}
          botHref={`/${locale}/profile/setup?intent=requester&next=${encodeURIComponent(safeNext)}&method=bot`}
          manualTitle={locale === "ja" ? "通常フォーム" : "Regular form"}
          manualBody={
            locale === "ja"
              ? "現在のフォームで全項目を直接入力します。"
              : "Fill the existing profile form directly."
          }
          botTitle={locale === "ja" ? "bot を使う" : "Use bot"}
          botBody={
            locale === "ja"
              ? "必須項目から順番に会話形式で入力します。"
              : "Answer guided questions, review, then save."
          }
        />
      ) : profileType === "requester" && method === "bot" ? (
        <ProfileBotForm
          locale={locale}
          next={safeNext}
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
    becomeRequesterTitle: t("becomeRequesterTitle"),
    becomeRequesterBody: t("becomeRequesterBody"),
    becomeRequesterSubmit: t("becomeRequesterSubmit"),
    becomeVolunteerTitle: t("becomeVolunteerTitle"),
    becomeVolunteerBody: t("becomeVolunteerBody"),
    becomeVolunteerSubmit: t("becomeVolunteerSubmit"),
  };
}
