export type AssistantFlowType = "profile" | "opportunity";

export type AssistantFieldType =
  | "text"
  | "textarea"
  | "email"
  | "url"
  | "number"
  | "datetime"
  | "time"
  | "list"
  | "choice";

export type AssistantOption = {
  value: string;
  labelEn: string;
  labelJa: string;
};

export type AssistantStep = {
  id: string;
  field: string;
  type: AssistantFieldType;
  required: boolean;
  labelEn: string;
  labelJa: string;
  questionEn: string;
  questionJa: string;
  hintEn?: string;
  hintJa?: string;
  options?: AssistantOption[];
};

export type AssistantOptionalGroup = {
  id: string;
  titleEn: string;
  titleJa: string;
  descriptionEn: string;
  descriptionJa: string;
  fields: AssistantStep[];
  showWhen?: (values: AssistantValues) => boolean;
};

export type AssistantValues = Record<string, string | boolean>;

export type AssistantValidationResult =
  | { ok: true; normalizedValue: string; displayValue: string }
  | { ok: false; messageEn: string; messageJa: string };

export const organizationTypeOptions: AssistantOption[] = [
  { value: "INDIVIDUAL", labelEn: "Individual", labelJa: "個人" },
  { value: "VOLUNTARY_GROUP", labelEn: "Voluntary group", labelJa: "任意団体" },
  { value: "NPO", labelEn: "NPO", labelJa: "NPO法人" },
  {
    value: "GENERAL_ASSOCIATION",
    labelEn: "General association",
    labelJa: "一般社団法人",
  },
  { value: "CORPORATION", labelEn: "Corporation", labelJa: "株式会社" },
  { value: "SCHOOL", labelEn: "School", labelJa: "学校" },
  { value: "MUNICIPAL", labelEn: "Municipal office", labelJa: "行政機関" },
];

const recruitmentStatusOptions: AssistantOption[] = [
  { value: "recruiting", labelEn: "Recruiting", labelJa: "募集中" },
  { value: "paused", labelEn: "Paused", labelJa: "一時停止" },
  { value: "internal_only", labelEn: "Internal only", labelJa: "内部募集のみ" },
];

const environmentOptions: AssistantOption[] = [
  { value: "mixed", labelEn: "Mixed", labelJa: "混合" },
  { value: "relaxed", labelEn: "Relaxed", labelJa: "ゆるやか" },
  { value: "strict", labelEn: "Structured", labelJa: "しっかり管理" },
];

const legalEntityOptions: AssistantOption[] = [
  { value: "", labelEn: "Not sure / skip", labelJa: "未定 / スキップ" },
  { value: "npo", labelEn: "NPO", labelJa: "NPO法人" },
  {
    value: "general_association",
    labelEn: "General association",
    labelJa: "一般社団法人",
  },
  { value: "corporation", labelEn: "Corporation", labelJa: "株式会社" },
  { value: "school", labelEn: "School", labelJa: "学校" },
  { value: "municipal", labelEn: "Municipal office", labelJa: "行政機関" },
  { value: "other", labelEn: "Other", labelJa: "その他" },
];

export const profileRequiredSteps: AssistantStep[] = [
  {
    id: "profile-name",
    field: "name",
    type: "text",
    required: true,
    labelEn: "Your name",
    labelJa: "お名前",
    questionEn: "What is your name?",
    questionJa: "あなたのお名前を教えてください。",
  },
  {
    id: "profile-organization-type",
    field: "organizationType",
    type: "choice",
    required: true,
    labelEn: "Organizer type",
    labelJa: "組織者タイプ",
    questionEn: "Which type best describes your organizer account?",
    questionJa: "組織者タイプを選んでください。",
    options: organizationTypeOptions,
  },
  {
    id: "profile-organization-name",
    field: "organizationName",
    type: "text",
    required: true,
    labelEn: "Organization name",
    labelJa: "組織/団体名",
    questionEn: "What public organization or group name should volunteers see?",
    questionJa: "ボランティアに表示する組織/団体名を教えてください。",
  },
  {
    id: "profile-representative-name",
    field: "representativeName",
    type: "text",
    required: true,
    labelEn: "Representative name",
    labelJa: "代表者名",
    questionEn: "Who is the representative of this organizer?",
    questionJa: "代表者のお名前を教えてください。",
  },
  {
    id: "profile-purpose",
    field: "purpose",
    type: "textarea",
    required: true,
    labelEn: "Activity purpose",
    labelJa: "活動目的",
    questionEn: "What is the main purpose of your activities?",
    questionJa: "主な活動目的を教えてください。",
    hintEn: "For example: environmental protection, children support, international exchange.",
    hintJa: "例: 環境保護、子ども支援、国際交流など。",
  },
  {
    id: "profile-description",
    field: "description",
    type: "textarea",
    required: true,
    labelEn: "Activity summary",
    labelJa: "活動内容の概要",
    questionEn: "Briefly describe what your organization usually does.",
    questionJa: "普段どのような活動をしているか、簡単に説明してください。",
  },
  {
    id: "profile-activity-areas",
    field: "activityAreas",
    type: "list",
    required: true,
    labelEn: "Main activity fields",
    labelJa: "主な活動分野",
    questionEn: "What are your main activity fields?",
    questionJa: "主な活動分野を教えてください。",
    hintEn: "Comma-separated is fine: environment, education, welfare.",
    hintJa: "カンマ区切りで大丈夫です: 環境、教育、福祉。",
  },
  {
    id: "profile-activity-regions",
    field: "activityRegions",
    type: "list",
    required: true,
    labelEn: "Main activity areas",
    labelJa: "主な活動地域",
    questionEn: "Where do you mainly run activities?",
    questionJa: "主に活動する地域を教えてください。",
    hintEn: "For example: Kyoto citywide, Sakyo Ward, online.",
    hintJa: "例: 京都市全域、左京区、オンライン。",
  },
  {
    id: "profile-public-email",
    field: "publicEmail",
    type: "email",
    required: true,
    labelEn: "Public contact email",
    labelJa: "公開連絡先メール",
    questionEn: "What public email address can volunteers use to contact you?",
    questionJa: "ボランティアが連絡できる公開メールアドレスを教えてください。",
  },
];

export const profileOptionalGroups: AssistantOptionalGroup[] = [
  {
    id: "public-extra",
    titleEn: "Public profile extras",
    titleJa: "公開プロフィール補足",
    descriptionEn: "Add details that help volunteers trust and understand the organizer.",
    descriptionJa: "ボランティアが安心して理解できる追加情報です。",
    fields: [
      simpleStep("nameKana", "Name kana", "名称かな", "text"),
      simpleStep("nameEn", "English name", "英語名", "text"),
      simpleStep("publicPhone", "Public phone", "公開電話番号", "text"),
      simpleStep("contactFormUrl", "Contact form URL", "問い合わせフォームURL", "url"),
      simpleStep("website", "Website", "公式サイト", "url"),
      simpleStep("snsLinks", "SNS links", "SNSリンク", "list"),
      simpleStep("founded", "Founded year/month", "設立年月", "text"),
      choiceStep("recruitmentStatus", "Recruitment status", "募集状況", recruitmentStatusOptions),
      choiceStep("environmentStyle", "Activity environment", "活動環境", environmentOptions),
    ],
  },
  {
    id: "facilities",
    titleEn: "Facilities and images",
    titleJa: "施設・画像",
    descriptionEn: "These are optional, but they make on-site participation easier to imagine.",
    descriptionJa: "任意ですが、参加時のイメージがしやすくなります。",
    fields: [
      simpleStep("activitySpaceSize", "Activity space size", "活動スペースの広さ", "text"),
      simpleStep("profileImageUrl", "Profile image URL", "プロフィール画像URL", "url"),
      simpleStep("workspaceImageUrls", "Workspace image URLs", "活動場所画像URL", "list"),
      booleanStep("hasWaterDispenser", "Water dispenser available", "給水設備あり"),
      booleanStep("hasRestRoom", "Restroom available", "トイレあり"),
      booleanStep("hasAirConditioning", "Air conditioning available", "空調あり"),
    ],
  },
  {
    id: "private-review",
    titleEn: "Private responsible person details",
    titleJa: "非公開の负责人情報",
    descriptionEn: "Used by the platform for review and urgent contact. Not public by default.",
    descriptionJa: "審査・緊急連絡用です。標準では公開されません。",
    fields: [
      simpleStep("managerLegalName", "Responsible person's legal name", "负责人実名", "text"),
      simpleStep("managerPhone", "Responsible person's phone", "负责人電話番号", "text"),
      simpleStep("contactPersonName", "Contact person name", "連絡担当者名", "text"),
      simpleStep("contactPersonRole", "Contact person role", "連絡担当者役割", "text"),
      simpleStep("contactPersonPhone", "Contact person phone", "連絡担当者電話", "text"),
      simpleStep("contactPersonEmail", "Contact person email", "連絡担当者メール", "email"),
      simpleStep("prefecture", "Organization prefecture", "所在地 都道府県", "text"),
      simpleStep("city", "Organization city", "所在地 市区町村", "text"),
      simpleStep("address", "Organization address", "所在地 住所", "text"),
      booleanStep("isLocationPublic", "Make location public", "所在地を公開する"),
      booleanStep("antiSocialForcesConfirmed", "Anti-social forces confirmation", "反社会勢力排除確認"),
      booleanStep("termsAccepted", "Agree to platform terms", "利用規約に同意"),
    ],
  },
  {
    id: "certification",
    titleEn: "Legal entity certification",
    titleJa: "法人/団体认证情報",
    descriptionEn: "Shown only for non-individual organizer types.",
    descriptionJa: "個人以外の組織者タイプの場合のみ対象です。",
    showWhen: (values) => String(values.organizationType ?? "INDIVIDUAL") !== "INDIVIDUAL",
    fields: [
      choiceStep("legalEntityType", "Legal entity type", "法人格タイプ", legalEntityOptions),
      simpleStep("corporateNumber", "Corporate number", "法人番号", "text"),
      simpleStep("legalName", "Registered legal name", "法人正式名称", "text"),
      simpleStep("legalAddress", "Registered legal address", "法人所在地", "text"),
      simpleStep("registrationDocumentUrl", "Registration document URL", "登記証明URL", "url"),
      simpleStep("bylawsUrl", "Bylaws URL", "定款/規約URL", "url"),
    ],
  },
];

export const opportunityRequiredSteps: AssistantStep[] = [
  requiredStep("opportunity-title", "title", "Activity title", "活動タイトル", "What is the title of this volunteer opportunity?", "活動タイトルを教えてください。"),
  {
    ...requiredStep(
      "opportunity-category",
      "category",
      "Category keywords",
      "カテゴリキーワード",
      "Enter category keywords as separate words.",
      "カテゴリを独立したキーワードで入力してください。",
      "list",
    ),
    hintEn: "Use comma-separated words, for example: environment, cleanup, children.",
    hintJa: "カンマ区切りの単語で入力してください。例: 環境, 清掃, 子ども。",
  },
  requiredStep("opportunity-short-description", "shortDescription", "Short description", "短い説明", "Write one short sentence for the listing card.", "一覧カード用の短い説明を1文で書いてください。", "textarea"),
  requiredStep("opportunity-description", "description", "Full description", "詳細説明", "Describe the activity in more detail for volunteers.", "ボランティア向けに活動内容を詳しく説明してください。", "textarea"),
  requiredStep("opportunity-start-at", "startAt", "Start time", "開始日時", "When does it start?", "開始日時を教えてください。", "datetime"),
  requiredStep("opportunity-end-at", "endAt", "End time", "終了日時", "When does it end?", "終了日時を教えてください。", "datetime"),
  requiredStep("opportunity-volunteers-needed", "volunteersNeeded", "Volunteers needed", "必要人数", "How many volunteers do you need?", "何人のボランティアが必要ですか？", "number"),
  {
    ...requiredStep("opportunity-prefecture", "prefecture", "Prefecture", "都道府県", "Which prefecture is the activity in?", "活動する都道府県を教えてください。"),
    hintEn: "You can also enter a Japanese postal code, for example 606-8171.",
    hintJa: "郵便番号でも入力できます。例: 606-8171。",
  },
  {
    ...requiredStep("opportunity-city", "city", "City / ward", "市区町村", "Which city or ward is it in?", "市区町村を教えてください。"),
    hintEn: "You can also enter a Japanese postal code and I will fill the location.",
    hintJa: "郵便番号を入力すると所在地を自動入力できます。",
  },
  {
    ...requiredStep("opportunity-address", "address", "Address / meeting place", "住所/集合場所", "What is the address or exact meeting place?", "住所または正確な集合場所を教えてください。"),
    hintEn: "Postal code lookup can fill prefecture and city; then add the precise meeting point.",
    hintJa: "郵便番号で都道府県・市区町村を補完できます。その後、詳しい集合場所を追加してください。",
  },
  requiredStep("opportunity-task-name", "taskName", "First task name", "最初の作業名", "What is the first task volunteers will do?", "最初に行う作業名を教えてください。"),
  requiredStep("opportunity-task-start-time", "taskStartTime", "Task start time", "作業開始時刻", "What time does this task start?", "この作業は何時に始まりますか？", "time"),
  requiredStep("opportunity-task-duration", "taskDurationMinutes", "Task duration minutes", "作業時間（分）", "How many minutes will this task take?", "この作業は何分くらいですか？", "number"),
  requiredStep("opportunity-task-people", "taskPeopleNeeded", "People needed for task", "作業人数", "How many people are needed for this task?", "この作業には何人必要ですか？", "number"),
  requiredStep("opportunity-task-description", "taskShortDescription", "Task description", "作業説明", "Briefly describe this task.", "この作業の内容を簡単に説明してください。", "textarea"),
];

export const opportunityOptionalGroups: AssistantOptionalGroup[] = [
  {
    id: "discovery",
    titleEn: "Discovery and matching",
    titleJa: "検索・マッチング",
    descriptionEn: "Optional tags and skills help volunteers find the task.",
    descriptionJa: "タグやスキルはボランティアが見つけやすくするための任意項目です。",
    fields: [
      simpleStep("tags", "Tags", "タグ", "list"),
      simpleStep("skills", "Helpful skills", "役立つスキル", "list"),
      simpleStep("arrivalTime", "Arrival time", "集合日時", "datetime"),
      simpleStep("googleMapsUrl", "Google Maps URL", "Google Maps URL", "url"),
      simpleStep("maxApplicants", "Max applicants", "応募上限", "number"),
      booleanStep("allowWaitlist", "Allow waitlist", "キャンセル待ちを許可"),
    ],
  },
  {
    id: "task-extra",
    titleEn: "Task details",
    titleJa: "作業詳細",
    descriptionEn: "Add steps and practical preparation details.",
    descriptionJa: "作業手順や準備物を追加できます。",
    fields: [
      simpleStep("taskSteps", "Task steps", "作業手順", "list"),
      simpleStep("toolsProvided", "Tools provided", "提供する道具", "list"),
      simpleStep("thingsToBring", "Things to bring", "持ち物", "list"),
      choiceStep("taskTypeColor", "Task color", "作業カラー", [
        { value: "green", labelEn: "Green / outdoor", labelJa: "緑 / 屋外" },
        { value: "blue", labelEn: "Blue / indoor", labelJa: "青 / 屋内" },
        { value: "orange", labelEn: "Orange / social", labelJa: "橙 / 交流" },
      ]),
      choiceStep("environmentShape", "Environment", "環境", [
        { value: "relaxed", labelEn: "Relaxed", labelJa: "ゆるやか" },
        { value: "structured", labelEn: "Structured", labelJa: "しっかり管理" },
      ]),
    ],
  },
  {
    id: "arrival-media",
    titleEn: "Arrival guidance and media",
    titleJa: "到着案内・画像",
    descriptionEn: "Reduce volunteer anxiety with arrival guidance and photos.",
    descriptionJa: "到着案内や写真で参加前の不安を減らします。",
    fields: [
      simpleStep("arrivalGuidance", "Arrival guidance", "到着案内", "textarea"),
      simpleStep("firstLandmarkDescription", "First landmark", "最初の目印", "textarea"),
      simpleStep("firstLandmarkImageUrl", "Landmark image URL", "目印画像URL", "url"),
      simpleStep("firstContactName", "First contact name", "最初の連絡先名", "text"),
      simpleStep("firstContactRole", "First contact role", "最初の連絡先役割", "text"),
      simpleStep("firstContactImageUrl", "Contact image URL", "連絡先画像URL", "url"),
      simpleStep("coverImageUrl", "Cover image URL", "カバー画像URL", "url"),
      simpleStep("workspaceImageUrls", "Workspace image URLs", "活動場所画像URL", "list"),
      simpleStep("instructions", "Internal instructions", "補足指示", "textarea"),
      simpleStep("preApplicationQuestions", "Pre-application questions", "応募前質問", "list"),
    ],
  },
];

export function getStepLabel(step: AssistantStep, locale: string) {
  return locale === "ja" ? step.labelJa : step.labelEn;
}

export function getStepQuestion(step: AssistantStep, locale: string) {
  return locale === "ja" ? step.questionJa : step.questionEn;
}

export function getOptionLabel(option: AssistantOption, locale: string) {
  return locale === "ja" ? option.labelJa : option.labelEn;
}

export function getAllProfileAssistantSteps(values: AssistantValues = {}) {
  const optionalSteps = profileOptionalGroups
    .filter((group) => !group.showWhen || group.showWhen(values))
    .flatMap((group) => group.fields);
  const steps = [...profileRequiredSteps, ...optionalSteps];

  return steps.filter(
    (step, index) => steps.findIndex((candidate) => candidate.field === step.field) === index,
  );
}

export function validateAssistantAnswer(
  step: AssistantStep,
  rawValue: string,
  values: AssistantValues = {},
): AssistantValidationResult {
  const value = rawValue.trim();
  if (step.required && !value) {
    return invalid("Please answer this required field.", "必須項目です。入力してください。");
  }

  if (!value && !step.required) {
    return { ok: true, normalizedValue: "", displayValue: "" };
  }

  if (step.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return invalid("That does not look like an email address. Please check it.", "メールアドレスの形式を確認してください。");
  }

  if (step.type === "url" && value) {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol)) {
        return invalid("Please use an http or https URL.", "http または https のURLを入力してください。");
      }
    } catch {
      return invalid("That does not look like a valid URL.", "URLの形式を確認してください。");
    }
  }

  if (step.type === "number") {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
      return invalid("Please enter a positive number.", "1以上の数字を入力してください。");
    }
    const normalized = String(Math.floor(number));
    return { ok: true, normalizedValue: normalized, displayValue: normalized };
  }

  if (step.type === "datetime") {
    const normalized = normalizeDateTimeInput(value);
    if (!normalized) {
      return invalid("Please enter a valid date and time.", "有効な日時を入力してください。");
    }
    if (step.field === "endAt" && values.startAt) {
      const start = new Date(String(values.startAt));
      const end = new Date(normalized);
      if (Number.isFinite(start.getTime()) && end <= start) {
        return invalid("End time must be after start time.", "終了日時は開始日時より後にしてください。");
      }
    }
    return { ok: true, normalizedValue: normalized, displayValue: normalized.replace("T", " ") };
  }

  if (step.type === "time" && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(value)) {
    return invalid("Please use HH:MM format, for example 09:30.", "09:30 のように HH:MM 形式で入力してください。");
  }

  if (step.type === "choice") {
    const match = step.options?.find(
      (option) =>
        option.value === value ||
        option.labelEn.toLowerCase() === value.toLowerCase() ||
        option.labelJa === value,
    );
    if (!match) {
      return invalid("Please choose one of the listed options.", "表示された選択肢から選んでください。");
    }
    return { ok: true, normalizedValue: match.value, displayValue: match.labelEn };
  }

  if (step.type === "list") {
    const items = splitList(value);
    if (step.required && items.length === 0) {
      return invalid("Please enter at least one item.", "少なくとも1つ入力してください。");
    }
    const normalized = items.join(", ");
    return { ok: true, normalizedValue: normalized, displayValue: normalized };
  }

  return { ok: true, normalizedValue: value, displayValue: value };
}

export function splitList(value: string) {
  return value
    .split(/[,\n、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeDateTimeInput(value: string) {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const date = new Date(value.replace(" ", "T"));
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (number: number) => String(number).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function invalid(messageEn: string, messageJa: string): AssistantValidationResult {
  return { ok: false, messageEn, messageJa };
}

function requiredStep(
  id: string,
  field: string,
  labelEn: string,
  labelJa: string,
  questionEn: string,
  questionJa: string,
  type: AssistantFieldType = "text",
): AssistantStep {
  return { id, field, type, required: true, labelEn, labelJa, questionEn, questionJa };
}

function simpleStep(
  field: string,
  labelEn: string,
  labelJa: string,
  type: AssistantFieldType,
): AssistantStep {
  return {
    id: `optional-${field}`,
    field,
    type,
    required: false,
    labelEn,
    labelJa,
    questionEn: labelEn,
    questionJa: labelJa,
  };
}

function choiceStep(
  field: string,
  labelEn: string,
  labelJa: string,
  options: AssistantOption[],
): AssistantStep {
  return {
    ...simpleStep(field, labelEn, labelJa, "choice"),
    options,
  };
}

function booleanStep(field: string, labelEn: string, labelJa: string): AssistantStep {
  return {
    ...simpleStep(field, labelEn, labelJa, "choice"),
    options: [
      { value: "true", labelEn: "Yes", labelJa: "はい" },
      { value: "false", labelEn: "No", labelJa: "いいえ" },
    ],
  };
}
