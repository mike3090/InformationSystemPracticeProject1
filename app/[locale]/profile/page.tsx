import ProfileForm from "./ProfileForm";
import ProfileBotForm from "./ProfileBotForm";
import type { Organization, User, VolunteerProfile } from "@/app/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import MethodChoice from "@/components/MethodChoice";
import type { AssistantValues } from "@/lib/formAssistant/flows";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
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
  searchParams: Promise<{ saved?: string; method?: string; mode?: string }>;
}) {
  const { locale } = await params;
  const { saved, method, mode } = await searchParams;
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
  const profileCompleted =
    profileType === "requester"
      ? Boolean(user.organization?.profileCompleted)
      : Boolean(user.profile?.profileCompleted);
  const isEditing = mode === "edit" || method === "manual" || method === "bot";

  if (!profileCompleted) {
    redirect(
      `/${locale}/profile/setup?intent=${
        profileType === "requester" ? "requester" : "volunteer"
      }&next=${encodeURIComponent(`/${locale}/profile`)}`
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold text-stone-900">
        {isEditing ? t("editTitle") : locale === "ja" ? "プロフィール" : "Profile"}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        {isEditing
          ? profileType === "requester"
            ? t("requesterEditIntro")
            : t("volunteerEditIntro")
          : profileType === "requester"
            ? locale === "ja"
              ? "ボランティアに表示される organizer profile と、非公開の審査情報を確認できます。"
              : "Review the organizer profile volunteers can see, plus private review details."
            : locale === "ja"
              ? "応募やおすすめに使われる volunteer profile を確認できます。"
              : "Review the volunteer profile used for applications and matching."}
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
      {!isEditing ? (
        <ProfilePreview
          user={user}
          locale={locale}
          profileType={profileType}
          editHref={`/${locale}/profile?mode=edit`}
          labels={profileLabels(t)}
        />
      ) : profileType === "requester" && method !== "manual" && method !== "bot" ? (
        <MethodChoice
          title={locale === "ja" ? "入力方法を選択" : "Choose how to edit"}
          body={
            locale === "ja"
              ? "通常フォームで編集するか、bot に変更したい項目を伝えて更新できます。"
              : "Use the regular form, or tell the bot which organizer profile fields you want to change."
          }
          manualHref={`/${locale}/profile?mode=edit&method=manual`}
          botHref={`/${locale}/profile?mode=edit&method=bot`}
          manualTitle={locale === "ja" ? "通常フォーム" : "Regular form"}
          manualBody={
            locale === "ja"
              ? "すべての項目を自分で確認しながら編集します。"
              : "Edit all fields directly with the existing profile form."
          }
          botTitle={locale === "ja" ? "bot を使う" : "Use bot"}
          botBody={
            locale === "ja"
              ? "変更したい項目を選ぶと、現在値を確認してから新しい値を入力できます。"
              : "Choose a field, see its current value, then enter the new value before review."
          }
        />
      ) : profileType === "requester" && method === "bot" ? (
        <ProfileBotForm
          locale={locale}
          next={`/${locale}/profile`}
          mode="edit"
          initialValues={profileAssistantValues(user)}
        />
      ) : (
        <ProfileForm
          user={user}
          locale={locale}
          next={`/${locale}/profile`}
          mode="edit"
          profileType={profileType}
          labels={profileLabels(t)}
        />
      )}
    </div>
  );
}

type ProfileUser = User & {
  profile: VolunteerProfile | null;
  organization: Organization | null;
};

function ProfilePreview({
  user,
  locale,
  profileType,
  editHref,
  labels,
}: {
  user: ProfileUser;
  locale: string;
  profileType: "volunteer" | "requester";
  editHref: string;
  labels: Record<string, string>;
}) {
  const isRequester = profileType === "requester";

  return (
    <section className="mt-8 space-y-6">
      <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">
            {isRequester ? "Organizer profile" : "Volunteer profile"}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-stone-950">
            {isRequester
              ? user.organization?.name || user.name || "-"
              : user.name || "-"}
          </h2>
          <p className="mt-2 text-sm text-stone-600">{user.email}</p>
        </div>
        <Link
          href={editHref}
          className="inline-flex items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
        >
          {locale === "ja" ? "編集" : "Edit"}
        </Link>
      </div>

      {isRequester ? (
        <RequesterProfilePreview
          organization={user.organization}
          labels={labels}
          locale={locale}
        />
      ) : (
        <VolunteerProfilePreview
          profile={user.profile}
          labels={labels}
          locale={locale}
        />
      )}
    </section>
  );
}

function RequesterProfilePreview({
  organization,
  labels,
  locale,
}: {
  organization: Organization | null;
  labels: Record<string, string>;
  locale: string;
}) {
  return (
    <>
      <PreviewSection
        title={labels.publicProfileTitle}
        description={labels.publicProfileDescription}
        rows={[
          [labels.organizationType, organization?.type],
          [labels.organizationName, organization?.name],
          [labels.nameKana, organization?.nameKana],
          [labels.nameEn, organization?.nameEn],
          [labels.representativeName, organization?.representativeName],
          [labels.purpose, organization?.purpose],
          [labels.description, organization?.description],
          [labels.activityAreas, organization?.activityAreas?.join(", ")],
          [labels.activityRegions, organization?.activityRegions?.join(", ")],
          [labels.publicEmail, organization?.publicEmail],
          [labels.publicPhone, organization?.publicPhone],
          [labels.website, organization?.website],
          [labels.snsLinks, organization?.snsLinks?.join(", ")],
          [labels.recruitmentStatus, organization?.recruitmentStatus],
        ]}
      />
      <PreviewSection
        title={labels.reviewProfileTitle}
        description={
          locale === "ja"
            ? "このセクションは審査と緊急連絡用で、標準では公開されません。"
            : "This section is private by default and used for review or urgent contact."
        }
        rows={[
          [labels.managerLegalName, organization?.managerLegalName],
          [labels.managerPhone, organization?.managerPhone],
          [labels.contactPersonName, organization?.contactPersonName],
          [labels.contactPersonRole, organization?.contactPersonRole],
          [labels.contactPersonPhone, organization?.contactPersonPhone],
          [labels.contactPersonEmail, organization?.contactPersonEmail],
          [labels.prefecture, organization?.prefecture],
          [labels.city, organization?.city],
          [labels.address, organization?.address],
          [labels.certificationStatus, organization?.certificationStatus],
        ]}
      />
    </>
  );
}

function VolunteerProfilePreview({
  profile,
  labels,
  locale,
}: {
  profile: VolunteerProfile | null;
  labels: Record<string, string>;
  locale: string;
}) {
  return (
    <PreviewSection
      title={locale === "ja" ? "Volunteer details" : "Volunteer details"}
      description={
        locale === "ja"
          ? "応募時に organizer が理解しやすいプロフィール情報です。"
          : "Profile details organizers can use to understand applications."
      }
      rows={[
        [labels.prefecture, profile?.prefecture],
        [labels.city, profile?.city],
        [labels.bio, profile?.bio],
        [labels.availability, profile?.availability],
        [labels.environment, profile?.preferredEnvironmentStyle],
        [labels.interests, profile?.interests?.join(", ")],
        [labels.skills, profile?.skills?.join(", ")],
        [labels.languages, profile?.languages?.join(", ")],
        [labels.preferredTaskTypes, profile?.preferredTaskTypes?.join(", ")],
      ]}
    />
  );
}

function PreviewSection({
  title,
  description,
  rows,
}: {
  title: string;
  description: string;
  rows: [string, string | null | undefined][];
}) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-stone-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-stone-500">{label}</dt>
            <dd className="mt-1 text-sm font-medium text-stone-900">
              {value ? String(value) : "-"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function profileAssistantValues(user: ProfileUser): AssistantValues {
  const organization = user.organization;
  return {
    name: user.name ?? "",
    organizationType: organization?.type ?? "INDIVIDUAL",
    organizationName: organization?.name ?? "",
    representativeName: organization?.representativeName ?? "",
    purpose: organization?.purpose ?? "",
    description: organization?.description ?? "",
    activityAreas: organization?.activityAreas?.join(", ") ?? "",
    activityRegions: organization?.activityRegions?.join(", ") ?? "",
    publicEmail: organization?.publicEmail ?? user.email,
    nameKana: organization?.nameKana ?? "",
    nameEn: organization?.nameEn ?? "",
    publicPhone: organization?.publicPhone ?? "",
    contactFormUrl: organization?.contactFormUrl ?? "",
    website: organization?.website ?? "",
    snsLinks: organization?.snsLinks?.join(", ") ?? "",
    founded: organization?.founded ?? "",
    recruitmentStatus: organization?.recruitmentStatus ?? "recruiting",
    environmentStyle: organization?.environmentStyle ?? "mixed",
    activitySpaceSize: organization?.activitySpaceSize ?? "",
    profileImageUrl: organization?.profileImageUrl ?? "",
    workspaceImageUrls: organization?.workspaceImageUrls?.join(", ") ?? "",
    hasWaterDispenser: organization?.hasWaterDispenser ?? false,
    hasRestRoom: organization?.hasRestRoom ?? false,
    hasAirConditioning: organization?.hasAirConditioning ?? false,
    managerLegalName: organization?.managerLegalName ?? "",
    managerPhone: organization?.managerPhone ?? "",
    contactPersonName: organization?.contactPersonName ?? "",
    contactPersonRole: organization?.contactPersonRole ?? "",
    contactPersonPhone: organization?.contactPersonPhone ?? "",
    contactPersonEmail: organization?.contactPersonEmail ?? user.email,
    prefecture: organization?.prefecture ?? "",
    city: organization?.city ?? "",
    address: organization?.address ?? "",
    managerAddress: organization?.managerAddress ?? "",
    identityDocumentNote: organization?.identityDocumentNote ?? "",
    isLocationPublic: organization?.isLocationPublic ?? false,
    antiSocialForcesConfirmed: organization?.antiSocialForcesConfirmed ?? false,
    termsAccepted: organization?.termsAccepted ?? false,
    legalEntityType: organization?.legalEntityType ?? "",
    corporateNumber: organization?.corporateNumber ?? "",
    legalName: organization?.legalName ?? "",
    legalAddress: organization?.legalAddress ?? "",
    registrationDocumentUrl: organization?.registrationDocumentUrl ?? "",
    bylawsUrl: organization?.bylawsUrl ?? "",
    certificationSource: organization?.certificationSource ?? "",
  };
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
