import { saveProfile } from "./actions";
import type { Organization, User, VolunteerProfile } from "@/app/generated/prisma/client";

type ProfileUser = User & {
  profile: VolunteerProfile | null;
  organization: Organization | null;
};

function joinList(values: string[] | null | undefined) {
  return values?.join(", ") ?? "";
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
        <RequesterFields organization={user.organization} labels={labels} />
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
    </>
  );
}

function RequesterFields({
  organization,
  labels,
}: {
  organization: Organization | null;
  labels: Record<string, string>;
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.organizationName}
          </span>
          <input
            name="organizationName"
            defaultValue={organization?.name ?? ""}
            required
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.organizationType}
          </span>
          <select
            name="organizationType"
            defaultValue={organization?.type ?? "INDIVIDUAL"}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="INDIVIDUAL">{labels.typeIndividual}</option>
            <option value="SMALL_BUSINESS">{labels.typeCompany}</option>
            <option value="NPO">{labels.typeNpo}</option>
            <option value="COMMUNITY_GROUP">{labels.typeCommunity}</option>
            <option value="MUNICIPAL">{labels.typeMunicipal}</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-stone-700">
          {labels.description}
        </span>
        <textarea
          name="description"
          rows={4}
          defaultValue={organization?.description ?? ""}
          className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.environment}
          </span>
          <select
            name="environmentStyle"
            defaultValue={organization?.environmentStyle ?? "mixed"}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="mixed">{labels.environmentMixed}</option>
            <option value="relaxed">{labels.environmentRelaxed}</option>
            <option value="strict">{labels.environmentStructured}</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.website}
          </span>
          <input
            name="website"
            defaultValue={organization?.website ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.prefecture}
          </span>
          <input
            name="prefecture"
            defaultValue={organization?.prefecture ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.city}
          </span>
          <input
            name="city"
            defaultValue={organization?.city ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">
            {labels.address}
          </span>
          <input
            name="address"
            defaultValue={organization?.address ?? ""}
            className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </label>
      </div>
    </>
  );
}

function CommaInput({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </label>
  );
}
