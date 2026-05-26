"use client";

import { useState, useTransition, type ReactNode } from "react";
import { createOpportunity } from "./actions";

type DraftedTask = {
  name: string;
  nameJa: string;
  startTime: string;
  durationMinutes: number | null;
  peopleNeeded: number | null;
  shortDescription: string;
  shortDescriptionJa: string;
  steps: string[];
};

type DraftOpportunityOutput = {
  title: string;
  titleJa: string;
  shortDescription: string;
  description: string;
  descriptionJa: string;
  category: string;
  tags: string[];
  skills: string[];
  schedule: {
    startAt: string;
    endAt: string;
    arrivalTime: string;
    scheduleNote: string;
  };
  location: {
    prefecture: string;
    city: string;
    address: string;
    googleMapsUrl: string;
    locationNote: string;
  };
  capacity: {
    volunteersNeeded: number | null;
    maxApplicants: number | null;
    allowWaitlist: boolean;
  };
  thingsToBring: string[];
  toolsProvided: string[];
  preApplicationQuestions: string[];
  arrivalGuidance: string;
  firstLandmarkDescription: string;
  firstContactName: string;
  firstContactRole: string;
  visuals: {
    coverPhotoPrompt: string;
    workspacePhotoPrompts: string[];
    landmarkPhotoPrompt: string;
    contactPhotoPrompt: string;
  };
  display: {
    taskTypeColor: "green" | "blue" | "orange";
    environmentShape: "relaxed" | "structured";
    physicalEffort: "low" | "medium" | "high";
    mentalEffort: "low" | "medium" | "high";
  };
  missingDetails: {
    field: string;
    severity: "required" | "recommended";
    message: string;
  }[];
  confidence: {
    overall: "low" | "medium" | "high";
    notes: string[];
  };
  taskFlow: DraftedTask[];
};

type DraftResult =
  | { ok: true; data: DraftOpportunityOutput }
  | { ok: false; error: string };

type FormValues = {
  title: string;
  category: string;
  shortDescription: string;
  description: string;
  tags: string;
  skills: string;
  startAt: string;
  endAt: string;
  arrivalTime: string;
  volunteersNeeded: string;
  maxApplicants: string;
  allowWaitlist: boolean;
  prefecture: string;
  city: string;
  address: string;
  googleMapsUrl: string;
  taskName: string;
  taskStartTime: string;
  taskDurationMinutes: string;
  taskPeopleNeeded: string;
  taskShortDescription: string;
  taskSteps: string;
  toolsProvided: string;
  thingsToBring: string;
  preApplicationQuestions: string;
  taskTypeColor: string;
  environmentShape: string;
  physicalEffort: string;
  mentalEffort: string;
  arrivalGuidance: string;
  firstLandmarkDescription: string;
  firstLandmarkImageUrl: string;
  firstContactName: string;
  firstContactRole: string;
  firstContactImageUrl: string;
  coverImageUrl: string;
  workspaceImageUrls: string;
  workspace3dEmbedUrl: string;
  instructions: string;
};

type GuideAnswerKey =
  | "timePlace"
  | "volunteerCount"
  | "firstTask"
  | "thingsToBring"
  | "arrival";

type GuideAnswers = Record<GuideAnswerKey, string>;

const initialValues: FormValues = {
  title: "",
  category: "",
  shortDescription: "",
  description: "",
  tags: "",
  skills: "",
  startAt: "",
  endAt: "",
  arrivalTime: "",
  volunteersNeeded: "1",
  maxApplicants: "",
  allowWaitlist: true,
  prefecture: "",
  city: "",
  address: "",
  googleMapsUrl: "",
  taskName: "",
  taskStartTime: "",
  taskDurationMinutes: "60",
  taskPeopleNeeded: "1",
  taskShortDescription: "",
  taskSteps: "",
  toolsProvided: "",
  thingsToBring: "",
  preApplicationQuestions: "",
  taskTypeColor: "green",
  environmentShape: "relaxed",
  physicalEffort: "medium",
  mentalEffort: "medium",
  arrivalGuidance: "",
  firstLandmarkDescription: "",
  firstLandmarkImageUrl: "",
  firstContactName: "",
  firstContactRole: "",
  firstContactImageUrl: "",
  coverImageUrl: "",
  workspaceImageUrls: "",
  workspace3dEmbedUrl: "",
  instructions: "",
};

const initialGuideAnswers: GuideAnswers = {
  timePlace: "",
  volunteerCount: "",
  firstTask: "",
  thingsToBring: "",
  arrival: "",
};

export default function NewOpportunityForm({
  locale,
}: {
  locale: string;
}) {
  const copy = opportunityFormCopy(locale);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [roughDescription, setRoughDescription] = useState("");
  const [guideAnswers, setGuideAnswers] = useState<GuideAnswers>(initialGuideAnswers);
  const [organizerContext, setOrganizerContext] = useState("");
  const [draft, setDraft] = useState<DraftOpportunityOutput | null>(null);
  const [draftError, setDraftError] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateValue<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function updateGuideAnswer(key: GuideAnswerKey, value: string) {
    setGuideAnswers((current) => ({ ...current, [key]: value }));

    if (key === "volunteerCount") {
      const count = value.match(/\d+/)?.[0];
      if (count) updateValue("volunteersNeeded", count);
      return;
    }

    if (key === "firstTask") {
      updateValue("taskName", value);
      updateValue("taskShortDescription", value);
      return;
    }

    if (key === "thingsToBring") {
      updateValue("thingsToBring", value);
      return;
    }

    if (key === "arrival") {
      updateValue("arrivalGuidance", value);
      return;
    }

    if (key === "timePlace") {
      updateValue("firstLandmarkDescription", value);
    }
  }

  function buildOrganizerContext() {
    const answerLines = copy.aiGuideInputs
      .map((item) => {
        const value = guideAnswers[item.key].trim();
        return value ? `${item.label}: ${value}` : "";
      })
      .filter(Boolean);

    return [organizerContext.trim(), ...answerLines].filter(Boolean).join("\n");
  }

  function applyDraft(data: DraftOpportunityOutput) {
    const title = locale === "ja" ? data.titleJa : data.title;
    const description = locale === "ja" ? data.descriptionJa : data.description;
    const firstTask = data.taskFlow[0];
    const taskName = firstTask
      ? locale === "ja"
        ? firstTask.nameJa
        : firstTask.name
      : "";
    const taskDescription = firstTask
      ? locale === "ja"
        ? firstTask.shortDescriptionJa
        : firstTask.shortDescription
      : "";

    setValues((current) => ({
      ...current,
      title: title || current.title,
      category: data.category || current.category,
      shortDescription: data.shortDescription || firstSentence(description) || current.shortDescription,
      description: description || current.description,
      tags: mergeList(current.tags, data.tags),
      skills: mergeList(current.skills, data.skills),
      startAt: data.schedule.startAt || current.startAt,
      endAt: data.schedule.endAt || current.endAt,
      arrivalTime: data.schedule.arrivalTime || current.arrivalTime,
      volunteersNeeded: data.capacity.volunteersNeeded
        ? String(data.capacity.volunteersNeeded)
        : current.volunteersNeeded,
      maxApplicants: data.capacity.maxApplicants
        ? String(data.capacity.maxApplicants)
        : current.maxApplicants,
      allowWaitlist: data.capacity.allowWaitlist,
      prefecture: data.location.prefecture || current.prefecture,
      city: data.location.city || current.city,
      address: data.location.address || current.address,
      googleMapsUrl: data.location.googleMapsUrl || current.googleMapsUrl,
      thingsToBring: mergeList(current.thingsToBring, data.thingsToBring),
      toolsProvided: mergeList(current.toolsProvided, data.toolsProvided),
      preApplicationQuestions: mergeList(
        current.preApplicationQuestions,
        data.preApplicationQuestions,
      ),
      taskName: taskName || current.taskName,
      taskStartTime: firstTask?.startTime || current.taskStartTime,
      taskDurationMinutes: firstTask?.durationMinutes
        ? String(firstTask.durationMinutes)
        : current.taskDurationMinutes,
      taskPeopleNeeded: firstTask?.peopleNeeded
        ? String(firstTask.peopleNeeded)
        : current.taskPeopleNeeded,
      taskShortDescription: taskDescription || current.taskShortDescription,
      taskSteps: firstTask?.steps?.length
        ? mergeList(current.taskSteps, firstTask.steps)
        : current.taskSteps,
      taskTypeColor: data.display.taskTypeColor || current.taskTypeColor,
      environmentShape: data.display.environmentShape || current.environmentShape,
      physicalEffort: data.display.physicalEffort || current.physicalEffort,
      mentalEffort: data.display.mentalEffort || current.mentalEffort,
      arrivalGuidance: data.arrivalGuidance || current.arrivalGuidance,
      firstLandmarkDescription:
        data.firstLandmarkDescription || current.firstLandmarkDescription,
      firstContactName: data.firstContactName || current.firstContactName,
      firstContactRole: data.firstContactRole || current.firstContactRole,
      instructions: buildTaskFlowNote(data.taskFlow, locale) || current.instructions,
    }));
  }

  function requestDraft() {
    setDraftError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/ai/draft-opportunity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roughDescription,
            organizerContext: buildOrganizerContext(),
            locale,
          }),
        });
        const result = (await response.json()) as DraftResult;
        if (!result.ok) {
          setDraftError(result.error);
          return;
        }
        setDraft(result.data);
        applyDraft(result.data);
      } catch {
        setDraftError(copy.aiNetworkError);
      }
    });
  }

  return (
    <form
      action={createOpportunity}
      className="mt-8 space-y-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="aiDrafted" value={draft ? "true" : "false"} />

      <section className="grid gap-6 border-b border-stone-200 pb-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-green-700">
              {copy.aiEyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-stone-950">
              {copy.aiTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {copy.aiDescription}
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              {copy.aiRoughDescription}
            </span>
            <textarea
              value={roughDescription}
              onChange={(event) => setRoughDescription(event.target.value)}
              rows={8}
              placeholder={copy.aiRoughPlaceholder}
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-700">
              {copy.aiOrganizerContext}
            </span>
            <input
              value={organizerContext}
              onChange={(event) => setOrganizerContext(event.target.value)}
              placeholder={copy.aiOrganizerPlaceholder}
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={requestDraft}
              disabled={isPending || roughDescription.trim().length < 10}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-300"
            >
              <span aria-hidden="true">AI</span>
              {isPending ? copy.aiDrafting : copy.aiDraftButton}
            </button>
            <p className="text-xs leading-5 text-stone-500">{copy.aiHint}</p>
          </div>
          {draftError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {draftError}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-stone-200 bg-stone-50 p-5">
          {draft ? (
            <DraftUnderstanding copy={copy} values={values} draft={draft} />
          ) : (
            <WritingGuide
              answers={guideAnswers}
              copy={copy}
              onAnswerChange={updateGuideAnswer}
            />
          )}
        </div>
      </section>

      <details className="rounded-lg border border-stone-200 bg-stone-50 p-5">
        <summary className="cursor-pointer text-sm font-semibold text-stone-900">
          {copy.detailsSummary}
          <span className="mt-1 block text-xs font-normal leading-5 text-stone-600">
            {copy.detailsDescription}
          </span>
        </summary>
        <div className="mt-6 space-y-8 rounded-lg border border-stone-200 bg-white p-5">
          <FormSection
            eyebrow={copy.basicEyebrow}
            title={copy.basicTitle}
            description={copy.basicDescription}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextInput name="title" label={copy.title} placeholder={copy.titlePlaceholder} required value={values.title} onChange={(value) => updateValue("title", value)} />
              <TextInput name="category" label={copy.category} placeholder={copy.categoryPlaceholder} required value={values.category} onChange={(value) => updateValue("category", value)} />
            </div>
            <TextInput
              name="shortDescription"
              label={copy.shortDescription}
              placeholder={copy.shortDescriptionPlaceholder}
              required
              value={values.shortDescription}
              onChange={(value) => updateValue("shortDescription", value)}
            />
            <TextareaInput
              name="description"
              label={copy.description}
              placeholder={copy.descriptionPlaceholder}
              rows={5}
              required
              value={values.description}
              onChange={(value) => updateValue("description", value)}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextInput name="tags" label={copy.tags} placeholder={copy.tagsPlaceholder} value={values.tags} onChange={(value) => updateValue("tags", value)} />
              <TextInput name="skills" label={copy.skills} placeholder={copy.skillsPlaceholder} value={values.skills} onChange={(value) => updateValue("skills", value)} />
            </div>
          </FormSection>

          <FormSection
            eyebrow={copy.timeEyebrow}
            title={copy.timeTitle}
            description={copy.timeDescription}
          >
            <div className="grid gap-5 sm:grid-cols-3">
              <TextInput name="startAt" label={copy.startAt} type="datetime-local" required value={values.startAt} onChange={(value) => updateValue("startAt", value)} />
              <TextInput name="endAt" label={copy.endAt} type="datetime-local" required value={values.endAt} onChange={(value) => updateValue("endAt", value)} />
              <TextInput name="arrivalTime" label={copy.arrivalTime} type="datetime-local" value={values.arrivalTime} onChange={(value) => updateValue("arrivalTime", value)} />
              <TextInput name="volunteersNeeded" label={copy.volunteersNeeded} type="number" min="1" required value={values.volunteersNeeded} onChange={(value) => updateValue("volunteersNeeded", value)} />
              <TextInput name="maxApplicants" label={copy.maxApplicants} type="number" min="1" value={values.maxApplicants} onChange={(value) => updateValue("maxApplicants", value)} />
              <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
                <input
                  name="allowWaitlist"
                  type="checkbox"
                  checked={values.allowWaitlist}
                  onChange={(event) => updateValue("allowWaitlist", event.target.checked)}
                />
                <span>{copy.allowWaitlist}</span>
              </label>
            </div>
          </FormSection>

          <FormSection
            eyebrow={copy.locationEyebrow}
            title={copy.locationTitle}
            description={copy.locationDescription}
          >
            <div className="grid gap-5 sm:grid-cols-3">
              <TextInput name="prefecture" label={copy.prefecture} required value={values.prefecture} onChange={(value) => updateValue("prefecture", value)} />
              <TextInput name="city" label={copy.city} required value={values.city} onChange={(value) => updateValue("city", value)} />
              <TextInput name="address" label={copy.address} required value={values.address} onChange={(value) => updateValue("address", value)} />
            </div>
            <TextInput name="googleMapsUrl" label={copy.googleMapsUrl} type="url" placeholder="https://maps.google.com/..." value={values.googleMapsUrl} onChange={(value) => updateValue("googleMapsUrl", value)} />
          </FormSection>

          <FormSection
            eyebrow={copy.taskEyebrow}
            title={copy.taskTitle}
            description={copy.taskDescription}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <TextInput name="taskName" label={copy.taskName} required value={values.taskName} onChange={(value) => updateValue("taskName", value)} />
              <TextInput name="taskStartTime" label={copy.taskStartTime} placeholder="10:00" required value={values.taskStartTime} onChange={(value) => updateValue("taskStartTime", value)} />
              <TextInput name="taskDurationMinutes" label={copy.taskDurationMinutes} type="number" min="1" required value={values.taskDurationMinutes} onChange={(value) => updateValue("taskDurationMinutes", value)} />
              <TextInput name="taskPeopleNeeded" label={copy.taskPeopleNeeded} type="number" min="1" required value={values.taskPeopleNeeded} onChange={(value) => updateValue("taskPeopleNeeded", value)} />
            </div>
            <TextareaInput
              name="taskShortDescription"
              label={copy.taskShortDescription}
              rows={3}
              required
              value={values.taskShortDescription}
              onChange={(value) => updateValue("taskShortDescription", value)}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextInput name="taskSteps" label={copy.taskSteps} placeholder={copy.commaPlaceholder} value={values.taskSteps} onChange={(value) => updateValue("taskSteps", value)} />
              <TextInput name="toolsProvided" label={copy.toolsProvided} placeholder={copy.commaPlaceholder} value={values.toolsProvided} onChange={(value) => updateValue("toolsProvided", value)} />
              <TextInput name="thingsToBring" label={copy.thingsToBring} placeholder={copy.commaPlaceholder} value={values.thingsToBring} onChange={(value) => updateValue("thingsToBring", value)} />
              <TextInput name="preApplicationQuestions" label={copy.preApplicationQuestions} placeholder={copy.commaPlaceholder} value={values.preApplicationQuestions} onChange={(value) => updateValue("preApplicationQuestions", value)} />
            </div>
          </FormSection>

          <FormSection
            eyebrow={copy.cardEyebrow}
            title={copy.cardTitle}
            description={copy.cardDescription}
          >
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <SelectInput name="taskTypeColor" label={copy.taskTypeColor} value={values.taskTypeColor} onChange={(value) => updateValue("taskTypeColor", value)} options={[["green", copy.green], ["blue", copy.blue], ["orange", copy.orange]]} />
              <SelectInput name="environmentShape" label={copy.environmentShape} value={values.environmentShape} onChange={(value) => updateValue("environmentShape", value)} options={[["relaxed", copy.relaxed], ["structured", copy.structured]]} />
              <SelectInput name="physicalEffort" label={copy.physicalEffort} value={values.physicalEffort} onChange={(value) => updateValue("physicalEffort", value)} options={[["low", copy.low], ["medium", copy.medium], ["high", copy.high]]} />
              <SelectInput name="mentalEffort" label={copy.mentalEffort} value={values.mentalEffort} onChange={(value) => updateValue("mentalEffort", value)} options={[["low", copy.low], ["medium", copy.medium], ["high", copy.high]]} />
            </div>
          </FormSection>

          <FormSection
            eyebrow={copy.guidanceEyebrow}
            title={copy.guidanceTitle}
            description={copy.guidanceDescription}
          >
            <TextareaInput name="arrivalGuidance" label={copy.arrivalGuidance} rows={3} value={values.arrivalGuidance} onChange={(value) => updateValue("arrivalGuidance", value)} />
            <div className="grid gap-5 sm:grid-cols-2">
              <TextInput name="firstLandmarkDescription" label={copy.firstLandmarkDescription} value={values.firstLandmarkDescription} onChange={(value) => updateValue("firstLandmarkDescription", value)} />
              <ImageUploadInput name="firstLandmarkImageUrl" label={copy.firstLandmarkImageUrl} prompt={draft?.visuals.landmarkPhotoPrompt || copy.landmarkPhotoPrompt} value={values.firstLandmarkImageUrl} onChange={(value) => updateValue("firstLandmarkImageUrl", value)} copy={copy} />
              <TextInput name="firstContactName" label={copy.firstContactName} value={values.firstContactName} onChange={(value) => updateValue("firstContactName", value)} />
              <TextInput name="firstContactRole" label={copy.firstContactRole} value={values.firstContactRole} onChange={(value) => updateValue("firstContactRole", value)} />
              <ImageUploadInput name="firstContactImageUrl" label={copy.firstContactImageUrl} prompt={draft?.visuals.contactPhotoPrompt || copy.contactPhotoPrompt} value={values.firstContactImageUrl} onChange={(value) => updateValue("firstContactImageUrl", value)} copy={copy} />
            </div>
          </FormSection>

          <FormSection
            eyebrow={copy.mediaEyebrow}
            title={copy.mediaTitle}
            description={copy.mediaDescription}
          >
            <p className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm leading-6 text-green-900">
              {copy.photoGuidance}
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <ImageUploadInput name="coverImageUrl" label={copy.coverImageUrl} prompt={draft?.visuals.coverPhotoPrompt || copy.coverPhotoPrompt} value={values.coverImageUrl} onChange={(value) => updateValue("coverImageUrl", value)} copy={copy} />
              <ImageUploadInput name="workspaceImageUrls" label={copy.workspaceImageUrls} prompt={draft?.visuals.workspacePhotoPrompts.join(" ") || copy.workspacePhotoPrompt} value={values.workspaceImageUrls} onChange={(value) => updateValue("workspaceImageUrls", value)} multiple copy={copy} />
              <TextInput name="workspace3dEmbedUrl" label={copy.workspace3dEmbedUrl} type="url" value={values.workspace3dEmbedUrl} onChange={(value) => updateValue("workspace3dEmbedUrl", value)} />
            </div>
            <TextareaInput name="instructions" label={copy.instructions} rows={3} value={values.instructions} onChange={(value) => updateValue("instructions", value)} />
          </FormSection>
        </div>
      </details>

      <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
        <button
          type="submit"
          name="submitIntent"
          value="draft"
          className="rounded-lg border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:border-green-600 hover:text-green-700"
        >
          {copy.saveDraft}
        </button>
        <button
          type="submit"
          name="submitIntent"
          value="publish"
          className="rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600"
        >
          {copy.publish}
        </button>
      </div>
    </form>
  );
}

function WritingGuide({
  answers,
  copy,
  onAnswerChange,
}: {
  answers: GuideAnswers;
  copy: ReturnType<typeof opportunityFormCopy>;
  onAnswerChange: (key: GuideAnswerKey, value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
        {copy.aiGuideEyebrow}
      </p>
      <h3 className="mt-1 text-lg font-bold text-stone-950">
        {copy.aiGuideTitle}
      </h3>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        {copy.aiGuideBody}
      </p>
      <ul className="mt-5 space-y-3">
        {copy.aiGuideInputs.map((item) => (
          <li
            key={item.key}
            className="rounded-lg border border-stone-200 bg-white px-4 py-3"
          >
            <label className="block">
              <span className="text-sm font-medium text-stone-800">
                {item.label}
              </span>
              <input
                value={answers[item.key]}
                onChange={(event) => onAnswerChange(item.key, event.target.value)}
                placeholder={item.placeholder}
                className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImageUploadInput({
  name,
  label,
  prompt,
  value,
  onChange,
  copy,
  multiple = false,
}: {
  name: string;
  label: string;
  prompt: string;
  value: string;
  onChange: (value: string) => void;
  copy: ReturnType<typeof opportunityFormCopy>;
  multiple?: boolean;
}) {
  const [error, setError] = useState("");
  const values = value ? value.split("\n").filter(Boolean) : [];

  async function handleFiles(files: FileList | null) {
    setError("");
    if (!files?.length) return;

    const images = Array.from(files).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (!images.length) {
      setError(copy.imageFileError);
      return;
    }

    const tooLarge = images.find((file) => file.size > 2 * 1024 * 1024);
    if (tooLarge) {
      setError(copy.imageSizeError);
      return;
    }

    const encoded = await Promise.all(images.map(readImageFile));
    onChange(multiple ? encoded.join("\n") : encoded[0]);
  }

  return (
    <div>
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <p className="mt-1 text-xs leading-5 text-stone-500">{prompt}</p>
      <label className="mt-2 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center text-sm text-stone-600 hover:border-green-500 hover:bg-green-50">
        <span className="font-semibold text-stone-800">{copy.choosePhoto}</span>
        <span className="mt-1 text-xs">{copy.imageTypes}</span>
        <input
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={(event) => handleFiles(event.target.files)}
          className="sr-only"
        />
      </label>
      {values.map((imageValue, index) => (
        <input key={`${name}-${index}`} type="hidden" name={name} value={imageValue} />
      ))}
      {values.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {values.map((imageValue, index) => (
            <div
              key={`${imageValue.slice(0, 32)}-${index}`}
              className="h-24 w-full rounded-lg border border-stone-200 object-cover"
              style={{
                backgroundImage: `url("${imageValue}")`,
                backgroundPosition: "center",
                backgroundSize: "cover",
              }}
              aria-label={`${label} preview ${index + 1}`}
            />
          ))}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function DraftUnderstanding({
  copy,
  values,
  draft,
}: {
  copy: ReturnType<typeof opportunityFormCopy>;
  values: FormValues;
  draft: DraftOpportunityOutput;
}) {
  const fallbackMissing = [
    !values.startAt && copy.aiMissingTime,
    (!values.prefecture || !values.city || !values.address) && copy.aiMissingPlace,
    !values.volunteersNeeded && copy.aiMissingPeople,
    !values.taskName && copy.aiMissingTask,
    !values.thingsToBring && copy.aiMissingBring,
    !values.arrivalGuidance && copy.aiMissingArrival,
  ].filter(Boolean) as string[];
  const missing = draft.missingDetails.length
    ? draft.missingDetails.map((detail) => detail.message)
    : fallbackMissing;

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
        {copy.aiUnderstandingEyebrow}
      </p>
      <h3 className="mt-1 text-lg font-bold text-stone-950">
        {values.title || copy.aiUntitledDraft}
      </h3>
      <p className="mt-3 text-sm leading-6 text-stone-600">
        {values.shortDescription || copy.aiUnderstandingEmpty}
      </p>

      <dl className="mt-5 space-y-3 text-sm">
        <PreviewRow label={copy.aiUnderstoodSkills} value={values.skills || copy.aiNotSpecified} />
        <PreviewRow label={copy.aiUnderstoodFirstTask} value={values.taskName || copy.aiNotSpecified} />
        <PreviewRow label={copy.aiUnderstoodBring} value={values.thingsToBring || copy.aiNotSpecified} />
      </dl>

      <div className="mt-5 rounded-lg border border-green-100 bg-green-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-green-800">
          {copy.aiPhotoSuggestions}
        </p>
        <ul className="mt-3 space-y-2 text-sm text-green-900">
          {[
            draft.visuals.coverPhotoPrompt,
            ...draft.visuals.workspacePhotoPrompts,
            draft.visuals.landmarkPhotoPrompt,
            draft.visuals.contactPhotoPrompt,
          ].filter(Boolean).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
          {copy.aiStillNeeds}
        </p>
        {missing.length ? (
          <ul className="mt-3 space-y-2 text-sm text-amber-900">
            {missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-amber-900">{copy.aiReadyToReview}</p>
        )}
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-lg border border-stone-200 bg-white px-4 py-3 sm:grid-cols-[130px_1fr] sm:gap-3">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-800">{value}</dd>
    </div>
  );
}

function FormSection({
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
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: string;
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
        placeholder={placeholder}
        value={value}
        min={min}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </label>
  );
}

function TextareaInput({
  name,
  label,
  value,
  onChange,
  placeholder,
  rows,
  required = false,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      <textarea
        name={name}
        placeholder={placeholder}
        rows={rows}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </label>
  );
}

function SelectInput({
  name,
  label,
  value,
  onChange,
  options,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <select
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {options.map(([optionValue, text]) => (
          <option key={optionValue} value={optionValue}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function firstSentence(text: string) {
  return text.split(/(?<=[.!?。！？])\s*/)[0]?.trim() ?? "";
}

function mergeList(existing: string, incoming: string[]) {
  const items = new Set([
    ...existing.split(",").map((item) => item.trim()).filter(Boolean),
    ...incoming.map((item) => item.trim()).filter(Boolean),
  ]);
  return Array.from(items).join(", ");
}

function buildTaskFlowNote(tasks: DraftedTask[], locale: string) {
  return tasks
    .map((task) => {
      const name = locale === "ja" ? task.nameJa : task.name;
      const description = locale === "ja" ? task.shortDescriptionJa : task.shortDescription;
      return `${task.startTime} ${name}: ${description}`;
    })
    .join("\n");
}

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function opportunityFormCopy(locale: string) {
  if (locale === "ja") {
    return {
      intro: "ボランティアが応募前に安心して判断できるよう、場所、時間、作業内容、到着案内を登録します。",
      aiEyebrow: "AI 下書き",
      aiTitle: "自然な文章から募集内容を組み立てる",
      aiDescription: "主催者が普段の言葉で説明した内容を、下の正式な入力欄に写せる形へ変換します。生成後もすべて編集できます。",
      aiRoughDescription: "募集内容を文章で入力",
      aiRoughPlaceholder: "例: 来週土曜の午前中、京都の商店街で夏祭り準備を手伝ってくれる人を3名募集。テント設営、案内板の配置、受付の準備など。初心者歓迎で、軍手はこちらで用意します。",
      aiOrganizerContext: "団体・場所の補足",
      aiOrganizerPlaceholder: "例: 小さな商店会、京都市左京区、地域イベントが中心",
      aiDraftButton: "AIで整理する",
      aiDrafting: "整理中...",
      aiHint: "Gemini API の既存エンドポイントを使います。MOCK_AI=true ならモックで動きます。",
      aiNetworkError: "AI下書きに接続できませんでした。もう一度試してください。",
      aiGuideEyebrow: "書き方のヒント",
      aiGuideTitle: "同僚に説明するように書いてください",
      aiGuideBody: "分かっていることだけで大丈夫です。AI は文章から活動の輪郭を読み取り、足りない点だけ後で確認できる形にします。",
      aiGuideInputs: [
        {
          key: "timePlace" as const,
          label: "いつ、どこで行う活動ですか？",
          placeholder: "例: 来週土曜 9:00、京都市左京区の商店街入口",
        },
        {
          key: "volunteerCount" as const,
          label: "何人くらいのボランティアが必要ですか？",
          placeholder: "例: 3名",
        },
        {
          key: "firstTask" as const,
          label: "最初に何を手伝ってほしいですか？",
          placeholder: "例: テント設営と案内板の配置",
        },
        {
          key: "thingsToBring" as const,
          label: "当日持ってきてほしい物はありますか？",
          placeholder: "例: 飲み物、動きやすい靴",
        },
        {
          key: "arrival" as const,
          label: "集合場所や最初に会う人は誰ですか？",
          placeholder: "例: 商店街入口で田中さんに声をかける",
        },
      ],
      aiUnderstandingEyebrow: "AI の理解",
      aiUntitledDraft: "タイトル未設定の下書き",
      aiUnderstandingEmpty: "AI が抽出した概要がここに表示されます。",
      aiUnderstoodSkills: "スキル・タグ",
      aiUnderstoodFirstTask: "最初の作業",
      aiUnderstoodBring: "持ち物",
      aiPhotoSuggestions: "おすすめの写真",
      aiNotSpecified: "未指定",
      aiStillNeeds: "まだ確認したいこと",
      aiMissingTime: "日時を確認してください。",
      aiMissingPlace: "具体的な集合場所・住所を確認してください。",
      aiMissingPeople: "募集人数を確認してください。",
      aiMissingTask: "最初の作業内容を確認してください。",
      aiMissingBring: "持ち物が必要か確認してください。",
      aiMissingArrival: "到着後の案内や最初に会う人を追加すると安心です。",
      aiReadyToReview: "主要な内容はそろっています。下の正式欄で確認・調整してください。",
      detailsSummary: "正式な入力欄を確認・編集する",
      detailsDescription: "AI が埋めた内容を細かく直したいときだけ開いてください。",
      basicEyebrow: "公開情報",
      basicTitle: "基本情報",
      basicDescription: "募集一覧と詳細ページに表示される主要な説明です。",
      title: "タイトル",
      titlePlaceholder: "例: 地域の花壇整備を手伝ってほしい",
      category: "カテゴリ",
      categoryPlaceholder: "環境, 教育, イベント補助",
      shortDescription: "短い説明",
      shortDescriptionPlaceholder: "一覧カードに表示する1文",
      description: "詳しい説明",
      descriptionPlaceholder: "作業内容、対象者、注意事項を記入してください。",
      tags: "タグ（カンマ区切り）",
      tagsPlaceholder: "初心者歓迎, 屋外, 京都",
      skills: "必要なスキル（カンマ区切り）",
      skillsPlaceholder: "案内, 園芸, 英語",
      timeEyebrow: "日時",
      timeTitle: "スケジュールと定員",
      timeDescription: "応募者が予定を確認できるようにします。",
      startAt: "開始日時",
      endAt: "終了日時",
      arrivalTime: "集合日時",
      volunteersNeeded: "募集人数",
      maxApplicants: "最大応募者数",
      allowWaitlist: "定員後もウェイトリストを許可する",
      locationEyebrow: "場所",
      locationTitle: "所在地と地図",
      locationDescription: "住所と Google Maps リンクを登録します。",
      prefecture: "都道府県",
      city: "市区町村",
      address: "住所",
      googleMapsUrl: "Google Maps URL",
      taskEyebrow: "作業",
      taskTitle: "タスクカード",
      taskDescription: "最初の具体的な作業カードを登録します。",
      taskName: "タスク名",
      taskStartTime: "開始時刻",
      taskDurationMinutes: "所要時間（分）",
      taskPeopleNeeded: "必要人数",
      taskShortDescription: "タスク説明",
      taskSteps: "作業ステップ",
      toolsProvided: "提供する道具",
      thingsToBring: "持ち物",
      preApplicationQuestions: "応募前質問",
      commaPlaceholder: "カンマ区切りで入力",
      cardEyebrow: "表示",
      cardTitle: "カードの見え方",
      cardDescription: "Notion の色・形・負荷の考え方に合わせて表示情報を保存します。",
      taskTypeColor: "タスク色",
      green: "緑: 植物・屋外",
      blue: "青: 屋内・整理",
      orange: "オレンジ: 交流",
      environmentShape: "環境の形",
      relaxed: "ゆったり",
      structured: "手順が明確",
      physicalEffort: "身体的負荷",
      mentalEffort: "精神的負荷",
      low: "低",
      medium: "中",
      high: "高",
      guidanceEyebrow: "到着案内",
      guidanceTitle: "不安を減らす案内",
      guidanceDescription: "最初に見る目印や会う人を登録します。",
      arrivalGuidance: "到着後の案内",
      firstLandmarkDescription: "最初の目印",
      firstLandmarkImageUrl: "目印の写真",
      firstContactName: "最初に会う人",
      firstContactRole: "役割",
      firstContactImageUrl: "担当者の写真",
      mediaEyebrow: "メディア",
      mediaTitle: "写真と補足",
      mediaDescription: "活動場所の雰囲気が伝わる画像や補足情報を登録します。",
      photoGuidance: "写真は、応募者が当日を想像できるものを選ぶと効果的です。入口、集合場所、作業場所、道具、最初に会う人の写真が特に役立ちます。",
      coverImageUrl: "カバー写真",
      workspaceImageUrls: "活動場所の写真",
      landmarkPhotoPrompt: "駅や入口から見つけやすい目印を撮ってください。",
      contactPhotoPrompt: "当日声をかける相手が分かる写真を追加できます。",
      coverPhotoPrompt: "募集一覧で最初に見える写真です。活動の雰囲気が伝わるものを選んでください。",
      workspacePhotoPrompt: "作業場所、入口、道具、休憩場所などを複数追加できます。",
      choosePhoto: "写真を選択",
      imageTypes: "JPG、PNG、WebP（各2MBまで）",
      imageFileError: "画像ファイルを選択してください。",
      imageSizeError: "このプロトタイプでは各画像を2MB以下にしてください。",
      workspace3dEmbedUrl: "3D プレビュー URL",
      instructions: "追加メモ",
      saveDraft: "下書き保存",
      publish: "公開する",
    };
  }

  return {
    intro: "Publish a volunteer task with the details people need before applying: place, time, task flow, guidance, and workspace context.",
    aiEyebrow: "AI draft",
    aiTitle: "Turn a plain-language note into a structured post",
    aiDescription: "Organizers can describe the need in their own words, then let Gemini shape it into editable fields that match this system.",
    aiRoughDescription: "Describe the opportunity",
    aiRoughPlaceholder: "Example: Next Saturday morning we need 3 people to help prepare the Kyoto shopping street summer festival. Tasks include setting up tents, placing signs, and preparing reception. Beginners are welcome and we can provide gloves.",
    aiOrganizerContext: "Organizer or place context",
    aiOrganizerPlaceholder: "Example: small shopping association, Sakyo-ku Kyoto, mostly local events",
    aiDraftButton: "Structure with AI",
    aiDrafting: "Structuring...",
    aiHint: "Uses the existing Gemini endpoint. Set MOCK_AI=true for local UI work without API calls.",
    aiNetworkError: "Could not reach the AI drafting service. Please try again.",
    aiGuideEyebrow: "Writing guide",
    aiGuideTitle: "Write it like a message to a teammate",
    aiGuideBody: "Mention only what you already know. AI will read the shape of the activity and leave only the missing details for review.",
    aiGuideInputs: [
      {
        key: "timePlace" as const,
        label: "When and where will it happen?",
        placeholder: "Example: next Saturday 9:00, shopping street entrance in Sakyo-ku",
      },
      {
        key: "volunteerCount" as const,
        label: "How many volunteers do you need?",
        placeholder: "Example: 3 people",
      },
      {
        key: "firstTask" as const,
        label: "What should they help with first?",
        placeholder: "Example: setting up tents and placing signs",
      },
      {
        key: "thingsToBring" as const,
        label: "Should volunteers bring anything?",
        placeholder: "Example: water bottle, comfortable shoes",
      },
      {
        key: "arrival" as const,
        label: "Where should they meet, and who will greet them?",
        placeholder: "Example: meet Tanaka-san at the shopping street entrance",
      },
    ],
    aiUnderstandingEyebrow: "AI understanding",
    aiUntitledDraft: "Untitled draft",
    aiUnderstandingEmpty: "AI's extracted summary will appear here.",
    aiUnderstoodSkills: "Skills and tags",
    aiUnderstoodFirstTask: "First task",
    aiUnderstoodBring: "Things to bring",
    aiPhotoSuggestions: "Photo suggestions",
    aiNotSpecified: "Not specified",
    aiStillNeeds: "Still needs confirmation",
    aiMissingTime: "Confirm the exact date and time.",
    aiMissingPlace: "Confirm the meeting place and address.",
    aiMissingPeople: "Confirm how many volunteers are needed.",
    aiMissingTask: "Confirm the first concrete task.",
    aiMissingBring: "Confirm whether volunteers should bring anything.",
    aiMissingArrival: "Add arrival guidance or the first person volunteers should meet.",
    aiReadyToReview: "The main pieces are present. Review and tune the formal fields below.",
    detailsSummary: "Review or edit the formal fields",
    detailsDescription: "Open this only when you want to fine-tune what AI filled in.",
    basicEyebrow: "Public",
    basicTitle: "Basic task information",
    basicDescription: "This is the core copy volunteers see in discovery and detail pages.",
    title: "Title",
    titlePlaceholder: "e.g. Help clean the community garden",
    category: "Category",
    categoryPlaceholder: "Outdoor care, education, event support",
    shortDescription: "Short description",
    shortDescriptionPlaceholder: "A one-line summary for task cards",
    description: "Full description",
    descriptionPlaceholder: "Describe the work, schedule, audience, and anything volunteers should know.",
    tags: "Tags (comma-separated)",
    tagsPlaceholder: "beginner friendly, outdoor, Kyoto",
    skills: "Skills needed (comma-separated)",
    skillsPlaceholder: "guiding, gardening, English",
    timeEyebrow: "Schedule",
    timeTitle: "Time and capacity",
    timeDescription: "Help applicants understand the commitment before they apply.",
    startAt: "Start date and time",
    endAt: "End date and time",
    arrivalTime: "Arrival time",
    volunteersNeeded: "Volunteers needed",
    maxApplicants: "Maximum applicants",
    allowWaitlist: "Allow waitlist after capacity is reached",
    locationEyebrow: "Location",
    locationTitle: "Place and map",
    locationDescription: "Add an address and an optional Google Maps link.",
    prefecture: "Prefecture",
    city: "City / area",
    address: "Address",
    googleMapsUrl: "Google Maps URL",
    taskEyebrow: "Task flow",
    taskTitle: "First task card",
    taskDescription: "Create the first concrete task volunteers can understand and choose.",
    taskName: "Task name",
    taskStartTime: "Start time",
    taskDurationMinutes: "Duration minutes",
    taskPeopleNeeded: "People needed",
    taskShortDescription: "Task description",
    taskSteps: "Task steps",
    toolsProvided: "Tools provided",
    thingsToBring: "Things to bring",
    preApplicationQuestions: "Pre-application questions",
    commaPlaceholder: "Separate items with commas",
    cardEyebrow: "Visual encoding",
    cardTitle: "Task card appearance",
    cardDescription: "Store the color, shape, and effort signals from the Notion task-card model.",
    taskTypeColor: "Task color",
    green: "Green: plant / outdoor",
    blue: "Blue: indoor / tidying",
    orange: "Orange: social / collaborative",
    environmentShape: "Environment shape",
    relaxed: "Relaxed rounded",
    structured: "Structured square",
    physicalEffort: "Physical effort",
    mentalEffort: "Mental effort",
    low: "Low",
    medium: "Medium",
    high: "High",
    guidanceEyebrow: "Arrival",
    guidanceTitle: "Anxiety-reducing guidance",
    guidanceDescription: "Tell volunteers what they will see first and who they will meet.",
    arrivalGuidance: "Arrival guidance",
    firstLandmarkDescription: "First landmark",
    firstLandmarkImageUrl: "Landmark photo",
    firstContactName: "First contact name",
    firstContactRole: "First contact role",
    firstContactImageUrl: "Contact photo",
    mediaEyebrow: "Media",
    mediaTitle: "Workspace photos and notes",
    mediaDescription: "Show the real environment and add practical notes.",
    photoGuidance: "Photos help volunteers picture the day before applying. Useful shots include the entrance, meeting point, workspace, tools, and the person they should greet first.",
    coverImageUrl: "Cover photo",
    workspaceImageUrls: "Workspace photos",
    landmarkPhotoPrompt: "Add the landmark volunteers should look for when they arrive.",
    contactPhotoPrompt: "Add the person volunteers should recognize first, if appropriate.",
    coverPhotoPrompt: "This is the first image in discovery. Choose one that shows the activity clearly.",
    workspacePhotoPrompt: "Add a few photos of the workspace, tools, entrance, or rest area.",
    choosePhoto: "Choose photo",
    imageTypes: "JPG, PNG, or WebP, up to 2 MB each",
    imageFileError: "Please choose an image file.",
    imageSizeError: "Please keep each image under 2 MB for this prototype.",
    workspace3dEmbedUrl: "3D preview URL",
    instructions: "Additional instructions",
    saveDraft: "Save draft",
    publish: "Publish",
  };
}
