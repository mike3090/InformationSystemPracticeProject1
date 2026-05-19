import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { createOpportunity } from "./actions";

export default async function NewOpportunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(
      `/${locale}/auth/signin?intent=requester&callbackUrl=/${locale}/opportunities/new`,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      organization: { select: { profileCompleted: true } },
    },
  });

  if (!user) {
    redirect(`/${locale}/auth/signin?intent=requester`);
  }

  if (
    user.role !== "REQUESTER" &&
    user.role !== "BOTH" &&
    user.role !== "ADMIN"
  ) {
    redirect(
      `/${locale}/profile/setup?intent=requester&next=/${locale}/opportunities/new`,
    );
  }

  if (!user.organization?.profileCompleted) {
    redirect(
      `/${locale}/profile/setup?intent=requester&next=/${locale}/opportunities/new`,
    );
  }

  const t = await getTranslations("opportunities.new");
  const copy = opportunityFormCopy(locale);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {copy.intro}
          </p>
        </div>
      </div>

      <form
        action={createOpportunity}
        className="mt-8 space-y-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm"
      >
        <input type="hidden" name="locale" value={locale} />

        <FormSection
          eyebrow={copy.basicEyebrow}
          title={copy.basicTitle}
          description={copy.basicDescription}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="title" label={copy.title} placeholder={copy.titlePlaceholder} required />
            <TextInput name="category" label={copy.category} placeholder={copy.categoryPlaceholder} required />
          </div>
          <TextInput
            name="shortDescription"
            label={copy.shortDescription}
            placeholder={copy.shortDescriptionPlaceholder}
            required
          />
          <TextareaInput
            name="description"
            label={copy.description}
            placeholder={copy.descriptionPlaceholder}
            rows={5}
            required
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="tags" label={copy.tags} placeholder={copy.tagsPlaceholder} />
            <TextInput name="skills" label={copy.skills} placeholder={copy.skillsPlaceholder} />
          </div>
        </FormSection>

        <FormSection
          eyebrow={copy.timeEyebrow}
          title={copy.timeTitle}
          description={copy.timeDescription}
        >
          <div className="grid gap-5 sm:grid-cols-3">
            <TextInput name="startAt" label={copy.startAt} type="datetime-local" required />
            <TextInput name="endAt" label={copy.endAt} type="datetime-local" required />
            <TextInput name="arrivalTime" label={copy.arrivalTime} type="datetime-local" />
            <TextInput name="volunteersNeeded" label={copy.volunteersNeeded} type="number" min="1" defaultValue="1" required />
            <TextInput name="maxApplicants" label={copy.maxApplicants} type="number" min="1" />
            <label className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
              <input name="allowWaitlist" type="checkbox" defaultChecked />
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
            <TextInput name="prefecture" label={copy.prefecture} required />
            <TextInput name="city" label={copy.city} required />
            <TextInput name="address" label={copy.address} required />
          </div>
          <TextInput name="googleMapsUrl" label={copy.googleMapsUrl} type="url" placeholder="https://maps.google.com/..." />
        </FormSection>

        <FormSection
          eyebrow={copy.taskEyebrow}
          title={copy.taskTitle}
          description={copy.taskDescription}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="taskName" label={copy.taskName} required />
            <TextInput name="taskStartTime" label={copy.taskStartTime} placeholder="10:00" required />
            <TextInput name="taskDurationMinutes" label={copy.taskDurationMinutes} type="number" min="1" defaultValue="60" required />
            <TextInput name="taskPeopleNeeded" label={copy.taskPeopleNeeded} type="number" min="1" defaultValue="1" required />
          </div>
          <TextareaInput
            name="taskShortDescription"
            label={copy.taskShortDescription}
            rows={3}
            required
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="taskSteps" label={copy.taskSteps} placeholder={copy.commaPlaceholder} />
            <TextInput name="toolsProvided" label={copy.toolsProvided} placeholder={copy.commaPlaceholder} />
            <TextInput name="thingsToBring" label={copy.thingsToBring} placeholder={copy.commaPlaceholder} />
            <TextInput name="preApplicationQuestions" label={copy.preApplicationQuestions} placeholder={copy.commaPlaceholder} />
          </div>
        </FormSection>

        <FormSection
          eyebrow={copy.cardEyebrow}
          title={copy.cardTitle}
          description={copy.cardDescription}
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <SelectInput
              name="taskTypeColor"
              label={copy.taskTypeColor}
              options={[
                ["green", copy.green],
                ["blue", copy.blue],
                ["orange", copy.orange],
              ]}
            />
            <SelectInput
              name="environmentShape"
              label={copy.environmentShape}
              options={[
                ["relaxed", copy.relaxed],
                ["structured", copy.structured],
              ]}
            />
            <SelectInput
              name="physicalEffort"
              label={copy.physicalEffort}
              options={[
                ["low", copy.low],
                ["medium", copy.medium],
                ["high", copy.high],
              ]}
            />
            <SelectInput
              name="mentalEffort"
              label={copy.mentalEffort}
              options={[
                ["low", copy.low],
                ["medium", copy.medium],
                ["high", copy.high],
              ]}
            />
          </div>
        </FormSection>

        <FormSection
          eyebrow={copy.guidanceEyebrow}
          title={copy.guidanceTitle}
          description={copy.guidanceDescription}
        >
          <TextareaInput name="arrivalGuidance" label={copy.arrivalGuidance} rows={3} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="firstLandmarkDescription" label={copy.firstLandmarkDescription} />
            <TextInput name="firstLandmarkImageUrl" label={copy.firstLandmarkImageUrl} type="url" />
            <TextInput name="firstContactName" label={copy.firstContactName} />
            <TextInput name="firstContactRole" label={copy.firstContactRole} />
            <TextInput name="firstContactImageUrl" label={copy.firstContactImageUrl} type="url" />
          </div>
        </FormSection>

        <FormSection
          eyebrow={copy.mediaEyebrow}
          title={copy.mediaTitle}
          description={copy.mediaDescription}
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput name="coverImageUrl" label={copy.coverImageUrl} type="url" />
            <TextInput name="workspaceImageUrls" label={copy.workspaceImageUrls} placeholder={copy.commaPlaceholder} />
            <TextInput name="workspace3dEmbedUrl" label={copy.workspace3dEmbedUrl} type="url" />
          </div>
          <TextareaInput name="instructions" label={copy.instructions} rows={3} />
        </FormSection>

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
  children: React.ReactNode;
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
  type = "text",
  placeholder,
  defaultValue,
  min,
  required = false,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
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
        placeholder={placeholder}
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
  placeholder,
  rows,
  required = false,
}: {
  name: string;
  label: string;
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
}: {
  name: string;
  label: string;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <select
        name={name}
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

function opportunityFormCopy(locale: string) {
  if (locale === "ja") {
    return {
      intro: "ボランティアが応募前に安心して判断できるよう、場所、時間、作業内容、到着案内を登録します。",
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
      firstLandmarkImageUrl: "目印画像 URL",
      firstContactName: "最初に会う人",
      firstContactRole: "役割",
      firstContactImageUrl: "担当者画像 URL",
      mediaEyebrow: "メディア",
      mediaTitle: "写真と補足",
      mediaDescription: "活動場所の雰囲気が伝わる画像や補足情報を登録します。",
      coverImageUrl: "カバー画像 URL",
      workspaceImageUrls: "活動場所画像 URL",
      workspace3dEmbedUrl: "3D プレビュー URL",
      instructions: "追加メモ",
      saveDraft: "下書き保存",
      publish: "公開する",
    };
  }

  return {
    intro: "Publish a volunteer task with the details people need before applying: place, time, task flow, guidance, and workspace context.",
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
    firstLandmarkImageUrl: "Landmark image URL",
    firstContactName: "First contact name",
    firstContactRole: "First contact role",
    firstContactImageUrl: "Contact image URL",
    mediaEyebrow: "Media",
    mediaTitle: "Workspace photos and notes",
    mediaDescription: "Show the real environment and add practical notes.",
    coverImageUrl: "Cover image URL",
    workspaceImageUrls: "Workspace image URLs",
    workspace3dEmbedUrl: "3D preview URL",
    instructions: "Additional instructions",
    saveDraft: "Save draft",
    publish: "Publish",
  };
}
