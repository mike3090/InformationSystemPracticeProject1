"use client";

import { saveProfile } from "./actions";
import type { Organization, User, VolunteerProfile } from "@/app/generated/prisma/client";
import type { ReactNode } from "react";
import { useState } from "react";

type ProfileUser = User & {
  profile: VolunteerProfile | null;
  organization: Organization | null;
};

function joinList(values: string[] | null | undefined) {
  return values?.join(", ") ?? "";
}

function optionValueOrDefault(
  value: string | null | undefined,
  options: [string, string][],
  fallback: string,
) {
  return options.some(([optionValue]) => optionValue === value)
    ? value ?? fallback
    : fallback;
}

export default function ProfileForm({
  user,
  locale,
  next,
  mode,
  profileType,
  labels,
}: {
  user: ProfileUser;
  locale: string;
  next: string;
  mode: "setup" | "edit";
  profileType: "volunteer" | "requester";
  labels: Record<string, string>;
}) {
  const isRequester = profileType === "requester";

  return (
    <form action={saveProfile} className="mt-8 space-y-6 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="profileType" value={profileType} />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.name}
          </span>
          <input
            name="name"
            defaultValue={user.name ?? ""}
            required
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.email}
          </span>
          <input
            value={user.email}
            disabled
            className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500"
          />
        </label>
      </div>

      {isRequester ? (
        <RequesterFields
          organization={user.organization}
          labels={labels}
          accountEmail={user.email}
        />
      ) : (
        <VolunteerFields profile={user.profile} labels={labels} />
      )}

      <button
        type="submit"
        className="rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600"
      >
        {mode === "setup" ? labels.finishSetup : labels.saveChanges}
      </button>
    </form>
  );
}

function VolunteerFields({
  profile,
  labels,
}: {
  profile: VolunteerProfile | null;
  labels: Record<string, string>;
}) {
  const reminders = getReminderPreferences(profile);

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.prefecture}
          </span>
          <input
            name="prefecture"
            defaultValue={profile?.prefecture ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.city}
          </span>
          <input
            name="city"
            defaultValue={profile?.city ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">{labels.bio}</span>
        <textarea
          name="bio"
          rows={4}
          defaultValue={profile?.bio ?? ""}
          className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.availability}
          </span>
          <input
            name="availability"
            defaultValue={profile?.availability ?? ""}
            placeholder={labels.availabilityPlaceholder}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.environment}
          </span>
          <select
            name="preferredEnvironmentStyle"
            defaultValue={profile?.preferredEnvironmentStyle ?? "either"}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="either">{labels.environmentEither}</option>
            <option value="relaxed">{labels.environmentRelaxed}</option>
            <option value="structured">{labels.environmentStructured}</option>
          </select>
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <CommaInput
          name="interests"
          label={labels.interests}
          defaultValue={joinList(profile?.interests)}
          placeholder={labels.interestsPlaceholder}
        />
        <CommaInput
          name="skills"
          label={labels.skills}
          defaultValue={joinList(profile?.skills)}
          placeholder={labels.skillsPlaceholder}
        />
        <CommaInput
          name="languages"
          label={labels.languages}
          defaultValue={joinList(profile?.languages)}
          placeholder={labels.languagesPlaceholder}
        />
        <CommaInput
          name="preferredTaskTypes"
          label={labels.preferredTaskTypes}
          defaultValue={joinList(profile?.preferredTaskTypes)}
          placeholder={labels.preferredTaskTypesPlaceholder}
        />
      </div>

      <fieldset className="rounded-lg border border-stone-200 bg-stone-50 p-4">
        <legend className="text-sm font-semibold text-stone-800">
          {labels.notificationSettings}
        </legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <CheckboxField
            name="emailNotificationsEnabled"
            label={labels.emailNotifications}
            defaultChecked={reminders.emailNotificationsEnabled}
          />
          <CheckboxField
            name="inAppNotificationsEnabled"
            label={labels.inAppNotifications}
            defaultChecked={reminders.inAppNotificationsEnabled}
          />
          <CheckboxField
            name="reminder3DaysEnabled"
            label={labels.reminder3Days}
            defaultChecked={reminders.reminder3DaysEnabled}
          />
          <CheckboxField
            name="reminder1DayEnabled"
            label={labels.reminder1Day}
            defaultChecked={reminders.reminder1DayEnabled}
          />
          <CheckboxField
            name="reminderSameDayEnabled"
            label={labels.reminderSameDay}
            defaultChecked={reminders.reminderSameDayEnabled}
          />
        </div>
      </fieldset>
    </>
  );
}

function getReminderPreferences(profile: VolunteerProfile | null) {
  const record = (profile ?? {}) as Record<string, unknown>;
  return {
    emailNotificationsEnabled: record.emailNotificationsEnabled !== false,
    inAppNotificationsEnabled: record.inAppNotificationsEnabled !== false,
    reminder3DaysEnabled: record.reminder3DaysEnabled !== false,
    reminder1DayEnabled: record.reminder1DayEnabled !== false,
    reminderSameDayEnabled: record.reminderSameDayEnabled !== false,
  };
}

function CheckboxField({
  name,
  label,
  defaultChecked,
  required = false,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  required?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm text-stone-700">
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        required={required}
        className="mt-1"
      />
      <span>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
    </label>
  );
}

function RequesterFields({
  organization,
  labels,
  accountEmail,
}: {
  organization: Organization | null;
  labels: Record<string, string>;
  accountEmail: string;
}) {
  const isTermsAccepted = (organization as Record<string, unknown> | null)?.termsAccepted === true;
  const isAntiSocialConfirmed =
    (organization as Record<string, unknown> | null)?.antiSocialForcesConfirmed === true;
  const isLocationPublic =
    (organization as Record<string, unknown> | null)?.isLocationPublic === true;
  const hasWaterDispenser =
    (organization as Record<string, unknown> | null)?.hasWaterDispenser === true;
  const hasRestRoom =
    (organization as Record<string, unknown> | null)?.hasRestRoom === true;
  const hasAirConditioning =
    (organization as Record<string, unknown> | null)?.hasAirConditioning === true;
  const [organizationType, setOrganizationType] = useState<string>(
    organization?.type ?? "INDIVIDUAL",
  );
  const showCertification = organizationType !== "INDIVIDUAL";
  const environmentOptions: [string, string][] = [
    ["mixed", labels.environmentMixed],
    ["relaxed", labels.environmentRelaxed],
    ["strict", labels.environmentStructured],
  ];

  return (
    <>
      <ProfileSection
        eyebrow={labels.publicProfileEyebrow}
        title={labels.publicProfileTitle}
        description={labels.publicProfileDescription}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="organizationType"
            label={labels.organizationType}
            value={organizationType}
            onChange={setOrganizationType}
            required
            options={[
              ["INDIVIDUAL", labels.typeIndividual],
              ["VOLUNTARY_GROUP", labels.typeVoluntaryGroup],
              ["NPO", labels.typeNpo],
              ["GENERAL_ASSOCIATION", labels.typeGeneralAssociation],
              ["CORPORATION", labels.typeCorporation],
              ["SCHOOL", labels.typeSchool],
              ["MUNICIPAL", labels.typeMunicipal],
            ]}
          />
          <TextInput
            name="organizationName"
            label={labels.organizationName}
            defaultValue={organization?.name ?? ""}
            required
          />
          <TextInput
            name="nameKana"
            label={labels.nameKana}
            defaultValue={organization?.nameKana ?? ""}
          />
          <TextInput
            name="nameEn"
            label={labels.nameEn}
            defaultValue={organization?.nameEn ?? ""}
          />
          <TextInput
            name="representativeName"
            label={labels.representativeName}
            defaultValue={organization?.representativeName ?? ""}
            required
          />
          <SelectField
            name="recruitmentStatus"
            label={labels.recruitmentStatus}
            defaultValue={organization?.recruitmentStatus ?? "recruiting"}
            options={[
              ["recruiting", labels.recruiting],
              ["paused", labels.recruitmentPaused],
              ["internal_only", labels.internalOnly],
            ]}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextareaField
            name="purpose"
            label={labels.purpose}
            defaultValue={organization?.purpose ?? ""}
            required
          />
          <TextareaField
            name="description"
            label={labels.description}
            defaultValue={organization?.description ?? ""}
            required
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <CommaInput
            name="activityAreas"
            label={labels.activityAreas}
            defaultValue={joinList(organization?.activityAreas)}
            placeholder={labels.activityAreasPlaceholder}
            required
          />
          <CommaInput
            name="activityRegions"
            label={labels.activityRegions}
            defaultValue={joinList(organization?.activityRegions)}
            placeholder={labels.activityRegionsPlaceholder}
            required
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <TextInput
            name="publicEmail"
            label={labels.publicEmail}
            type="email"
            defaultValue={organization?.publicEmail ?? accountEmail}
            required
          />
          <TextInput
            name="publicPhone"
            label={labels.publicPhone}
            type="tel"
            defaultValue={organization?.publicPhone ?? ""}
          />
          <TextInput
            name="contactFormUrl"
            label={labels.contactFormUrl}
            type="url"
            defaultValue={organization?.contactFormUrl ?? ""}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            name="website"
            label={labels.website}
            type="url"
            defaultValue={organization?.website ?? ""}
          />
          <CommaInput
            name="snsLinks"
            label={labels.snsLinks}
            defaultValue={joinList(organization?.snsLinks)}
            placeholder={labels.snsLinksPlaceholder}
          />
          <TextInput
            name="founded"
            label={labels.founded}
            defaultValue={organization?.founded ?? ""}
            placeholder={labels.foundedPlaceholder}
          />
          <SelectField
            name="environmentStyle"
            label={labels.environment}
            defaultValue={optionValueOrDefault(
              organization?.environmentStyle,
              environmentOptions,
              "mixed",
            )}
            options={environmentOptions}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            name="activitySpaceSize"
            label={labels.activitySpaceSize}
            defaultValue={organization?.activitySpaceSize ?? ""}
            placeholder={labels.activitySpaceSizePlaceholder}
          />
          <TextInput
            name="profileImageUrl"
            label={labels.profileImageUrl}
            type="url"
            defaultValue={organization?.profileImageUrl ?? ""}
          />
          <CommaInput
            name="workspaceImageUrls"
            label={labels.workspaceImageUrls}
            defaultValue={joinList(organization?.workspaceImageUrls)}
            placeholder={labels.workspaceImageUrlsPlaceholder}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <CheckboxField
            name="hasWaterDispenser"
            label={labels.hasWaterDispenser}
            defaultChecked={hasWaterDispenser}
          />
          <CheckboxField
            name="hasRestRoom"
            label={labels.hasRestRoom}
            defaultChecked={hasRestRoom}
          />
          <CheckboxField
            name="hasAirConditioning"
            label={labels.hasAirConditioning}
            defaultChecked={hasAirConditioning}
          />
        </div>
      </ProfileSection>

      <ProfileSection
        eyebrow={labels.reviewProfileEyebrow}
        title={labels.reviewProfileTitle}
        description={labels.reviewProfileDescription}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            name="managerLegalName"
            label={labels.managerLegalName}
            defaultValue={organization?.managerLegalName ?? ""}
          />
          <TextInput
            name="managerPhone"
            label={labels.managerPhone}
            type="tel"
            defaultValue={organization?.managerPhone ?? ""}
          />
          <TextInput
            name="contactPersonName"
            label={labels.contactPersonName}
            defaultValue={organization?.contactPersonName ?? ""}
          />
          <TextInput
            name="contactPersonRole"
            label={labels.contactPersonRole}
            defaultValue={organization?.contactPersonRole ?? ""}
          />
          <TextInput
            name="contactPersonPhone"
            label={labels.contactPersonPhone}
            type="tel"
            defaultValue={organization?.contactPersonPhone ?? ""}
          />
          <TextInput
            name="contactPersonEmail"
            label={labels.contactPersonEmail}
            type="email"
            defaultValue={organization?.contactPersonEmail ?? accountEmail}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <TextInput
            name="prefecture"
            label={labels.prefecture}
            defaultValue={organization?.prefecture ?? ""}
          />
          <TextInput
            name="city"
            label={labels.city}
            defaultValue={organization?.city ?? ""}
          />
          <TextInput
            name="address"
            label={labels.address}
            defaultValue={organization?.address ?? ""}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <TextInput
            name="managerAddress"
            label={labels.managerAddress}
            defaultValue={organization?.managerAddress ?? ""}
          />
          <TextareaField
            name="identityDocumentNote"
            label={labels.identityDocumentNote}
            defaultValue={organization?.identityDocumentNote ?? ""}
            rows={3}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <CheckboxField
            name="isLocationPublic"
            label={labels.isLocationPublic}
            defaultChecked={isLocationPublic}
          />
          <CheckboxField
            name="antiSocialForcesConfirmed"
            label={labels.antiSocialForcesConfirmed}
            defaultChecked={isAntiSocialConfirmed}
          />
          <CheckboxField
            name="termsAccepted"
            label={labels.termsAccepted}
            defaultChecked={isTermsAccepted}
          />
        </div>
      </ProfileSection>

      {showCertification && (
        <ProfileSection
          eyebrow={labels.certificationEyebrow}
          title={labels.certificationTitle}
          description={labels.certificationDescription}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField
              name="legalEntityType"
              label={labels.legalEntityType}
              defaultValue={organization?.legalEntityType ?? ""}
              options={[
                ["", labels.notApplicable],
                ["npo", labels.typeNpo],
                ["general_association", labels.typeGeneralAssociation],
                ["corporation", labels.typeCorporation],
                ["school", labels.typeSchool],
                ["municipal", labels.typeMunicipal],
                ["other", labels.otherLegalEntity],
              ]}
            />
            <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase text-stone-500">
                {labels.certificationStatus}
              </p>
              <p className="mt-1 text-sm font-semibold text-stone-950">
                {certificationStatusLabel(
                  organization?.certificationStatus ?? "uncertified",
                  labels,
                )}
              </p>
              <p className="mt-1 text-xs leading-5 text-stone-500">
                {labels.certificationStatusPrivate}
              </p>
            </div>
            <TextInput
              name="corporateNumber"
              label={labels.corporateNumber}
              defaultValue={organization?.corporateNumber ?? ""}
            />
            <TextInput
              name="legalName"
              label={labels.legalName}
              defaultValue={organization?.legalName ?? ""}
            />
            <TextInput
              name="legalAddress"
              label={labels.legalAddress}
              defaultValue={organization?.legalAddress ?? ""}
            />
            <TextInput
              name="registrationDocumentUrl"
              label={labels.registrationDocumentUrl}
              type="url"
              defaultValue={organization?.registrationDocumentUrl ?? ""}
            />
            <TextInput
              name="bylawsUrl"
              label={labels.bylawsUrl}
              type="url"
              defaultValue={organization?.bylawsUrl ?? ""}
            />
            <TextInput
              name="certificationSource"
              label={labels.certificationSource}
              defaultValue={organization?.certificationSource ?? ""}
            />
          </div>
        </ProfileSection>
      )}
    </>
  );
}

function certificationStatusLabel(
  status: string,
  labels: Record<string, string>,
) {
  if (status === "under_review") return labels.certificationUnderReview;
  if (status === "certified") return labels.certificationCertified;
  if (status === "rejected") return labels.certificationRejected;
  if (status === "changes_requested") return labels.certificationChangesRequested;
  return labels.certificationUncertified;
}

function ProfileSection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-stone-200 pt-6 first:border-t-0 first:pt-0">
      <p className="text-xs font-bold uppercase tracking-wide text-green-700">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-bold text-stone-950">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
        {description}
      </p>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function TextInput({
  name,
  label,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </label>
  );
}

function TextareaField({
  name,
  label,
  defaultValue,
  required = false,
  rows = 4,
}: {
  name: string;
  label: string;
  defaultValue: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <textarea
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  value,
  onChange,
  options,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: [string, string][];
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <select
        name={name}
        value={value}
        defaultValue={value === undefined ? defaultValue : undefined}
        onChange={(event) => onChange?.(event.target.value)}
        required={required}
        className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {options.map(([value, text]) => (
          <option key={value || "none"} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function CommaInput({
  name,
  label,
  defaultValue,
  placeholder,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </label>
  );
}
