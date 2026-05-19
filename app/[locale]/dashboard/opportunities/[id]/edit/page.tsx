import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateOpportunity } from "./actions";

type TaskDefaults = {
  name: string;
  startTime: string;
  durationMinutes: string;
  peopleNeeded: string;
  shortDescription: string;
  steps: string;
};

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/${locale}/auth/signin?intent=requester&callbackUrl=/${locale}/dashboard/opportunities/${id}/edit`,
    );
  }

  const opportunity = await prisma.opportunity.findFirst({
    where: { id, requesterId: session.user.id },
    select: {
      id: true,
      title: true,
      shortDescription: true,
      description: true,
      status: true,
      category: true,
      tags: true,
      skills: true,
      taskTypeColor: true,
      environmentShape: true,
      physicalEffort: true,
      mentalEffort: true,
      prefecture: true,
      city: true,
      address: true,
      googleMapsUrl: true,
      startAt: true,
      endAt: true,
      arrivalTime: true,
      volunteersNeeded: true,
      maxApplicants: true,
      allowWaitlist: true,
      taskFlow: true,
      instructions: true,
      toolsProvided: true,
      thingsToBring: true,
      arrivalGuidance: true,
      firstLandmarkDescription: true,
      firstLandmarkImageUrl: true,
      firstContactName: true,
      firstContactRole: true,
      firstContactImageUrl: true,
      coverImageUrl: true,
      workspaceImageUrls: true,
      workspace3dEmbedUrl: true,
      preApplicationQuestions: true,
    },
  });

  if (!opportunity) notFound();

  const copy = editCopy(locale);
  const task = firstTaskDefaults(opportunity.taskFlow);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href={`/${locale}/dashboard/opportunities/${opportunity.id}`}
        className="text-sm font-semibold text-green-700 hover:text-green-600"
      >
        {copy.back}
      </Link>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">
            {copy.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-stone-950">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {copy.intro}
          </p>
        </div>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase text-stone-600">
          {opportunity.status}
        </span>
      </div>

      <form
        action={updateOpportunity}
        className="mt-8 space-y-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="opportunityId" value={opportunity.id} />

        <FormSection title={copy.basicTitle} description={copy.basicDescription}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="title" label={copy.name} defaultValue={opportunity.title} required />
            <TextInput name="category" label={copy.category} defaultValue={opportunity.category ?? ""} required />
          </div>
          <TextInput name="shortDescription" label={copy.shortDescription} defaultValue={opportunity.shortDescription ?? ""} required />
          <TextareaInput name="description" label={copy.description} defaultValue={opportunity.description} rows={5} required />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="tags" label={copy.tags} defaultValue={opportunity.tags.join(", ")} />
            <TextInput name="skills" label={copy.skills} defaultValue={opportunity.skills.join(", ")} />
          </div>
        </FormSection>

        <FormSection title={copy.scheduleTitle} description={copy.scheduleDescription}>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextInput name="startAt" label={copy.startAt} type="datetime-local" defaultValue={datetimeLocal(opportunity.startAt)} required />
            <TextInput name="endAt" label={copy.endAt} type="datetime-local" defaultValue={datetimeLocal(opportunity.endAt)} required />
            <TextInput name="arrivalTime" label={copy.arrivalTime} type="datetime-local" defaultValue={datetimeLocal(opportunity.arrivalTime)} />
            <TextInput name="volunteersNeeded" label={copy.volunteersNeeded} type="number" min="1" defaultValue={String(opportunity.volunteersNeeded)} required />
            <TextInput name="maxApplicants" label={copy.maxApplicants} type="number" min="1" defaultValue={String(opportunity.maxApplicants ?? "")} />
            <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
              <input name="allowWaitlist" type="checkbox" defaultChecked={opportunity.allowWaitlist} />
              <span>{copy.allowWaitlist}</span>
            </label>
          </div>
        </FormSection>

        <FormSection title={copy.locationTitle} description={copy.locationDescription}>
          <div className="grid gap-5 sm:grid-cols-3">
            <TextInput name="prefecture" label={copy.prefecture} defaultValue={opportunity.prefecture ?? ""} required />
            <TextInput name="city" label={copy.city} defaultValue={opportunity.city ?? ""} required />
            <TextInput name="address" label={copy.address} defaultValue={opportunity.address ?? ""} required />
          </div>
          <TextInput name="googleMapsUrl" label={copy.googleMapsUrl} type="url" defaultValue={opportunity.googleMapsUrl ?? ""} />
        </FormSection>

        <FormSection title={copy.taskTitle} description={copy.taskDescription}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="taskName" label={copy.taskName} defaultValue={task.name} required />
            <TextInput name="taskStartTime" label={copy.taskStartTime} defaultValue={task.startTime} required />
            <TextInput name="taskDurationMinutes" label={copy.taskDurationMinutes} type="number" min="1" defaultValue={task.durationMinutes} required />
            <TextInput name="taskPeopleNeeded" label={copy.taskPeopleNeeded} type="number" min="1" defaultValue={task.peopleNeeded} required />
          </div>
          <TextareaInput name="taskShortDescription" label={copy.taskShortDescription} defaultValue={task.shortDescription} rows={3} required />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="taskSteps" label={copy.taskSteps} defaultValue={task.steps} />
            <TextInput name="toolsProvided" label={copy.toolsProvided} defaultValue={opportunity.toolsProvided.join(", ")} />
            <TextInput name="thingsToBring" label={copy.thingsToBring} defaultValue={opportunity.thingsToBring.join(", ")} />
            <TextInput name="preApplicationQuestions" label={copy.preApplicationQuestions} defaultValue={questionsText(opportunity.preApplicationQuestions)} />
          </div>
        </FormSection>

        <FormSection title={copy.cardTitle} description={copy.cardDescription}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <SelectInput name="taskTypeColor" label={copy.taskTypeColor} defaultValue={opportunity.taskTypeColor ?? "green"} options={[["green", copy.green], ["blue", copy.blue], ["orange", copy.orange]]} />
            <SelectInput name="environmentShape" label={copy.environmentShape} defaultValue={opportunity.environmentShape ?? "relaxed"} options={[["relaxed", copy.relaxed], ["structured", copy.structured]]} />
            <SelectInput name="physicalEffort" label={copy.physicalEffort} defaultValue={opportunity.physicalEffort} options={[["low", copy.low], ["medium", copy.medium], ["high", copy.high]]} />
            <SelectInput name="mentalEffort" label={copy.mentalEffort} defaultValue={opportunity.mentalEffort} options={[["low", copy.low], ["medium", copy.medium], ["high", copy.high]]} />
          </div>
        </FormSection>

        <FormSection title={copy.guidanceTitle} description={copy.guidanceDescription}>
          <TextareaInput name="arrivalGuidance" label={copy.arrivalGuidance} defaultValue={opportunity.arrivalGuidance ?? ""} rows={3} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="firstLandmarkDescription" label={copy.firstLandmarkDescription} defaultValue={opportunity.firstLandmarkDescription ?? ""} />
            <TextInput name="firstLandmarkImageUrl" label={copy.firstLandmarkImageUrl} type="url" defaultValue={opportunity.firstLandmarkImageUrl ?? ""} />
            <TextInput name="firstContactName" label={copy.firstContactName} defaultValue={opportunity.firstContactName ?? ""} />
            <TextInput name="firstContactRole" label={copy.firstContactRole} defaultValue={opportunity.firstContactRole ?? ""} />
            <TextInput name="firstContactImageUrl" label={copy.firstContactImageUrl} type="url" defaultValue={opportunity.firstContactImageUrl ?? ""} />
          </div>
        </FormSection>

        <FormSection title={copy.mediaTitle} description={copy.mediaDescription}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="coverImageUrl" label={copy.coverImageUrl} type="url" defaultValue={opportunity.coverImageUrl ?? ""} />
            <TextInput name="workspaceImageUrls" label={copy.workspaceImageUrls} defaultValue={opportunity.workspaceImageUrls.join(", ")} />
            <TextInput name="workspace3dEmbedUrl" label={copy.workspace3dEmbedUrl} type="url" defaultValue={opportunity.workspace3dEmbedUrl ?? ""} />
          </div>
          <TextareaInput name="instructions" label={copy.instructions} defaultValue={opportunity.instructions ?? ""} rows={3} />
        </FormSection>

        <div className="flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
          <button
            type="submit"
            name="submitIntent"
            value="save"
            className="rounded-lg border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 hover:border-green-600 hover:text-green-700"
          >
            {copy.save}
          </button>
          {opportunity.status !== "COMPLETED" && (
            <button
              type="submit"
              name="submitIntent"
              value="publish"
              className="rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600"
            >
              {copy.saveAndPublish}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-stone-200 pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-xl font-bold text-stone-950">{title}</h2>
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
  type = "text",
  defaultValue,
  min,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        min={min}
        required={required}
        className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </label>
  );
}

function TextareaInput({
  name,
  label,
  defaultValue,
  rows,
  required = false,
}: {
  name: string;
  label: string;
  defaultValue: string;
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
        defaultValue={defaultValue}
        rows={rows}
        required={required}
        className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />
    </label>
  );
}

function SelectInput({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: [string, string][];
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function firstTaskDefaults(value: unknown): TaskDefaults {
  if (!Array.isArray(value) || !value[0] || typeof value[0] !== "object") {
    return {
      name: "",
      startTime: "",
      durationMinutes: "60",
      peopleNeeded: "1",
      shortDescription: "",
      steps: "",
    };
  }
  const task = value[0] as Record<string, unknown>;
  const steps = Array.isArray(task.steps)
    ? task.steps.filter((item): item is string => typeof item === "string")
    : [];
  return {
    name: typeof task.name === "string" ? task.name : "",
    startTime: typeof task.startTime === "string" ? task.startTime : "",
    durationMinutes:
      typeof task.durationMinutes === "number"
        ? String(task.durationMinutes)
        : "60",
    peopleNeeded:
      typeof task.peopleNeeded === "number" ? String(task.peopleNeeded) : "1",
    shortDescription:
      typeof task.shortDescription === "string" ? task.shortDescription : "",
    steps: steps.join(", "),
  };
}

function questionsText(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const question = (item as Record<string, unknown>).question;
      return typeof question === "string" ? question : "";
    })
    .filter(Boolean)
    .join(", ");
}

function datetimeLocal(value: Date | null) {
  if (!value) return "";
  const offset = value.getTimezoneOffset();
  const local = new Date(value.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function editCopy(locale: string) {
  if (locale === "ja") {
    return {
      back: "応募者確認へ戻る",
      eyebrow: "募集編集",
      title: "募集内容を編集",
      intro: "公開前後の募集内容、タスク、案内、画像を更新します。",
      basicTitle: "基本情報",
      basicDescription: "募集一覧と詳細ページに表示される主要な説明です。",
      name: "タイトル",
      category: "カテゴリ",
      shortDescription: "短い説明",
      description: "詳しい説明",
      tags: "タグ（カンマ区切り）",
      skills: "必要なスキル（カンマ区切り）",
      scheduleTitle: "スケジュールと定員",
      scheduleDescription: "日時、集合時間、募集人数を更新します。",
      startAt: "開始日時",
      endAt: "終了日時",
      arrivalTime: "集合日時",
      volunteersNeeded: "募集人数",
      maxApplicants: "最大応募者数",
      allowWaitlist: "定員後もウェイトリストを許可する",
      locationTitle: "所在地と地図",
      locationDescription: "住所と Google Maps リンクを更新します。",
      prefecture: "都道府県",
      city: "市区町村",
      address: "住所",
      googleMapsUrl: "Google Maps URL",
      taskTitle: "タスクカード",
      taskDescription: "最初の具体的な作業カードを更新します。",
      taskName: "タスク名",
      taskStartTime: "開始時刻",
      taskDurationMinutes: "所要時間（分）",
      taskPeopleNeeded: "必要人数",
      taskShortDescription: "タスク説明",
      taskSteps: "作業ステップ",
      toolsProvided: "提供する道具",
      thingsToBring: "持ち物",
      preApplicationQuestions: "応募前質問",
      cardTitle: "カードの見え方",
      cardDescription: "色・形・負荷の表示情報を更新します。",
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
      guidanceTitle: "到着案内",
      guidanceDescription: "最初に見る目印や会う人を更新します。",
      arrivalGuidance: "到着後の案内",
      firstLandmarkDescription: "最初の目印",
      firstLandmarkImageUrl: "目印画像 URL",
      firstContactName: "最初に会う人",
      firstContactRole: "役割",
      firstContactImageUrl: "担当者画像 URL",
      mediaTitle: "写真と補足",
      mediaDescription: "活動場所の画像や補足情報を更新します。",
      coverImageUrl: "カバー画像 URL",
      workspaceImageUrls: "活動場所画像 URL",
      workspace3dEmbedUrl: "3D プレビュー URL",
      instructions: "追加メモ",
      save: "保存",
      saveAndPublish: "保存して公開",
    };
  }

  return {
    back: "Back to applicants",
    eyebrow: "Opportunity editing",
    title: "Edit opportunity",
    intro: "Update the task, schedule, guidance, and workspace details before or after publishing.",
    basicTitle: "Basic task information",
    basicDescription: "This is the core copy volunteers see in discovery and detail pages.",
    name: "Title",
    category: "Category",
    shortDescription: "Short description",
    description: "Full description",
    tags: "Tags (comma-separated)",
    skills: "Skills needed (comma-separated)",
    scheduleTitle: "Time and capacity",
    scheduleDescription: "Update the time commitment, capacity, and waitlist behavior.",
    startAt: "Start date and time",
    endAt: "End date and time",
    arrivalTime: "Arrival time",
    volunteersNeeded: "Volunteers needed",
    maxApplicants: "Maximum applicants",
    allowWaitlist: "Allow waitlist after capacity is reached",
    locationTitle: "Place and map",
    locationDescription: "Update the address and optional Google Maps link.",
    prefecture: "Prefecture",
    city: "City / area",
    address: "Address",
    googleMapsUrl: "Google Maps URL",
    taskTitle: "First task card",
    taskDescription: "Update the first concrete task volunteers can understand and choose.",
    taskName: "Task name",
    taskStartTime: "Start time",
    taskDurationMinutes: "Duration minutes",
    taskPeopleNeeded: "People needed",
    taskShortDescription: "Task description",
    taskSteps: "Task steps",
    toolsProvided: "Tools provided",
    thingsToBring: "Things to bring",
    preApplicationQuestions: "Pre-application questions",
    cardTitle: "Task card appearance",
    cardDescription: "Update the color, shape, and effort signals for the task card.",
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
    guidanceTitle: "Arrival guidance",
    guidanceDescription: "Tell volunteers what they will see first and who they will meet.",
    arrivalGuidance: "Arrival guidance",
    firstLandmarkDescription: "First landmark",
    firstLandmarkImageUrl: "Landmark image URL",
    firstContactName: "First contact name",
    firstContactRole: "First contact role",
    firstContactImageUrl: "Contact image URL",
    mediaTitle: "Workspace photos and notes",
    mediaDescription: "Show the real environment and add practical notes.",
    coverImageUrl: "Cover image URL",
    workspaceImageUrls: "Workspace image URLs",
    workspace3dEmbedUrl: "3D preview URL",
    instructions: "Additional instructions",
    save: "Save changes",
    saveAndPublish: "Save and publish",
  };
}
