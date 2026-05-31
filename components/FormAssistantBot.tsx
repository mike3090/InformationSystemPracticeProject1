"use client";

import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import {
  getOptionLabel,
  getAllProfileAssistantSteps,
  getStepLabel,
  getStepQuestion,
  profileOptionalGroups,
  profileRequiredSteps,
  opportunityOptionalGroups,
  opportunityRequiredSteps,
  validateAssistantAnswer,
  type AssistantFlowType,
  type AssistantOptionalGroup,
  type AssistantStep,
  type AssistantValues,
} from "@/lib/formAssistant/flows";

type Message = {
  id: string;
  role: "assistant" | "user" | "system";
  text: string;
};

type AssistantResponse =
  | {
      ok: true;
      data: {
        accepted: boolean;
        normalizedValue: string;
        assistantMessage: string;
      };
    }
  | { ok: false; error: string };

type PostalLookupResponse =
  | {
      ok: true;
      data: {
        postalCode: string;
        prefecture: string;
        city: string;
        town: string;
        addressLine: string;
      };
    }
  | { ok: false; error: string };

export type AssistantCopy = ReturnType<typeof getAssistantCopy>;

export function getAssistantCopy(locale: string) {
  const isJa = locale === "ja";
  return {
    send: isJa ? "送信" : "Send",
    back: isJa ? "一つ戻る" : "Back",
    report: isJa ? "報告" : "Report issue",
    reported: isJa ? "フィードバックを受け取りました。" : "Feedback received.",
    review: isJa ? "確認" : "Review",
    requiredProgress: isJa ? "必須項目" : "Required fields",
    optionalTitle: isJa ? "任意項目" : "Optional details",
    optionalNow: isJa ? "今入力する" : "Add optional details",
    optionalLater: isJa ? "あとで入力する" : "Skip for now",
    submitProfile: isJa ? "プロフィールを保存" : "Save profile",
    saveDraft: isJa ? "下書き保存" : "Save draft",
    publish: isJa ? "公開" : "Publish",
    currentAnswer: isJa ? "回答を入力" : "Type your answer",
    networkError: isJa
      ? "接続できませんでした。もう一度試してください。"
      : "Could not reach the assistant. Please try again.",
    requiredCompleteProfile: isJa
      ? "必須項目が揃いました。内容を確認してください。任意項目は今入力しても、後から編集しても大丈夫です。"
      : "Required profile fields are complete. Review the summary below. Optional details can be added now or later.",
    requiredCompleteOpportunity: isJa
      ? "必須項目が揃いました。内容を確認して、下書き保存または公開を選んでください。"
      : "Required task fields are complete. Review the summary, then save a draft or publish.",
    optionalIntro: isJa
      ? "必要なところだけ追加してください。空欄は保存されません。"
      : "Fill only what you know. Empty optional fields will be skipped.",
    assistantIntroProfile: isJa
      ? "organizer profile の必須項目を順番に確認します。"
      : "I will collect the required organizer profile fields step by step.",
    assistantIntroOpportunity: isJa
      ? "task 公開に必要な項目を順番に確認します。"
      : "I will collect the required task publishing fields step by step.",
  };
}

export function AssistantChatFrame({
  flowType,
  locale,
  title,
  children,
  footer,
  messages,
  progress,
}: {
  flowType: AssistantFlowType;
  locale: string;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  messages: Message[];
  progress: string;
}) {
  const copy = getAssistantCopy(locale);
  return (
    <section className="mt-8 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 bg-stone-50 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-green-700">
          {flowType === "profile" ? "Profile bot" : "Task bot"}
        </p>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-stone-950">{title}</h2>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-600 ring-1 ring-stone-200">
            {copy.requiredProgress}: {progress}
          </span>
        </div>
      </div>
      <div className="grid min-h-[560px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-[560px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[78%] rounded-lg bg-green-700 px-4 py-3 text-sm leading-6 text-white"
                    : message.role === "system"
                      ? "mx-auto max-w-[86%] rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 ring-1 ring-amber-100"
                      : "mr-auto max-w-[78%] rounded-lg bg-stone-100 px-4 py-3 text-sm leading-6 text-stone-800"
                }
              >
                {message.text}
              </div>
            ))}
          </div>
          <div className="border-t border-stone-200 bg-white p-4">{footer}</div>
        </div>
        <aside className="border-t border-stone-200 bg-stone-50 p-5 lg:border-l lg:border-t-0">
          {children}
        </aside>
      </div>
    </section>
  );
}

export function useRequiredAssistantFlow({
  flowType,
  locale,
}: {
  flowType: AssistantFlowType;
  locale: string;
}) {
  const copy = getAssistantCopy(locale);
  const steps = flowType === "profile" ? profileRequiredSteps : opportunityRequiredSteps;
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<AssistantValues>({});
  const [history, setHistory] = useState<{ stepIndex: number; field: string }[]>([]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      text:
        flowType === "profile"
          ? copy.assistantIntroProfile
          : copy.assistantIntroOpportunity,
    },
    {
      id: "first-question",
      role: "assistant",
      text: getStepQuestion(steps[0], locale),
    },
  ]);
  const [isPending, startTransition] = useTransition();
  const messageIdRef = useRef(0);
  const currentStep = steps[stepIndex];
  const isComplete = stepIndex >= steps.length;

  function nextMessageId(prefix: string) {
    messageIdRef.current += 1;
    return `${prefix}-${messageIdRef.current}`;
  }

  function submitAnswer(valueOverride?: string) {
    if (!currentStep || isPending) return;
    const answer = (valueOverride ?? input).trim();
    if (!answer) return;
    const answerForAssistant =
      currentStep.field === "address" &&
      typeof values.address === "string" &&
      values.address.trim() &&
      !extractPostalCode(answer)
        ? `${values.address.trim()} ${answer}`
        : answer;

    const userMessage: Message = {
      id: nextMessageId("user"),
      role: "user",
      text: displayAnswer(currentStep, answer, locale),
    };
    setMessages((current) => [...current, userMessage]);
    setInput("");

    startTransition(async () => {
      try {
        if (
          flowType === "opportunity" &&
          ["prefecture", "city", "address"].includes(currentStep.field) &&
          extractPostalCode(answer)
        ) {
          const handled = await tryApplyPostalCode(answer);
          if (handled) return;
        }

        const response = await fetch("/api/ai/form-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flowType,
            stepId: currentStep.id,
            value: answerForAssistant,
            values,
            locale,
          }),
        });
        const result = (await response.json()) as AssistantResponse;
        if (!result.ok) {
          pushAssistant(result.error);
          return;
        }
        if (!result.data.accepted) {
          pushAssistant(result.data.assistantMessage);
          return;
        }

        const nextValues = {
          ...values,
          [currentStep.field]: result.data.normalizedValue,
        };
        const nextIndex = stepIndex + 1;
        setValues(nextValues);
        setHistory((current) => [
          ...current,
          { stepIndex, field: currentStep.field },
        ]);
        setStepIndex(nextIndex);
        pushAssistant(
          nextIndex >= steps.length
            ? flowType === "profile"
              ? copy.requiredCompleteProfile
              : copy.requiredCompleteOpportunity
            : result.data.assistantMessage || getStepQuestion(steps[nextIndex], locale),
        );
        if (nextIndex < steps.length) {
          pushAssistant(getStepQuestion(steps[nextIndex], locale));
        }
      } catch {
        pushAssistant(copy.networkError);
      }
    });
  }

  async function tryApplyPostalCode(answer: string) {
    const postalCode = extractPostalCode(answer);
    if (!postalCode) return false;

    const response = await fetch(`/api/postal-code?zipcode=${postalCode}`);
    const result = (await response.json()) as PostalLookupResponse;
    if (!result.ok) {
      pushAssistant(
        locale === "ja"
          ? "郵便番号が見つかりませんでした。都道府県から入力してください。"
          : "I could not find that postal code. Please enter the prefecture instead.",
      );
      return true;
    }

    const nextValues = {
      ...values,
      prefecture: result.data.prefecture,
      city: result.data.city,
      address: result.data.addressLine,
    };
    const addressIndex = steps.findIndex((step) => step.field === "address");
    const nextIndex = addressIndex >= 0 ? addressIndex : stepIndex + 1;

    setValues(nextValues);
    setHistory((current) => [
      ...current,
      { stepIndex, field: currentStep.field },
    ]);
    setStepIndex(nextIndex);
    pushAssistant(
      locale === "ja"
        ? `${result.data.prefecture} ${result.data.city} ${result.data.town} を見つけました。詳しい住所や集合場所を追加入力してください。`
        : `I found ${result.data.addressLine}. Please add the precise address or meeting point.`,
    );
    if (nextIndex < steps.length) {
      pushAssistant(getStepQuestion(steps[nextIndex], locale));
    }

    return true;
  }

  function goBack() {
    const previous = history.at(-1);
    if (!previous || isPending) return;
    setValues((current) => {
      const next = { ...current };
      delete next[previous.field];
      return next;
    });
    setHistory((current) => current.slice(0, -1));
    setStepIndex(previous.stepIndex);
    setMessages((current) => [
      ...current,
      {
        id: nextMessageId("back"),
        role: "system",
        text:
          locale === "ja"
            ? "一つ前の質問に戻りました。"
            : "Returned to the previous question.",
      },
      {
        id: nextMessageId("back-question"),
        role: "assistant",
        text: getStepQuestion(steps[previous.stepIndex], locale),
      },
    ]);
  }

  async function reportIssue() {
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    await fetch("/api/ai/form-assistant/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flowType,
        stepId: currentStep?.id ?? "review",
        locale,
        userAnswer: input,
        botMessage: lastAssistant?.text ?? "",
        context: values,
      }),
    }).catch(() => undefined);
    setMessages((current) => [
      ...current,
      { id: nextMessageId("reported"), role: "system", text: copy.reported },
    ]);
  }

  function pushAssistant(text: string) {
    setMessages((current) => [
      ...current,
      { id: nextMessageId("assistant"), role: "assistant", text },
    ]);
  }

  return {
    steps,
    currentStep,
    stepIndex,
    values,
    setValues,
    input,
    setInput,
    messages,
    isPending,
    isComplete,
    submitAnswer,
    goBack,
    reportIssue,
  };
}

export function useProfileEditAssistantFlow({
  locale,
  initialValues,
}: {
  locale: string;
  initialValues: AssistantValues;
}) {
  const copy = getAssistantCopy(locale);
  const [values, setValues] = useState<AssistantValues>(initialValues);
  const steps = useMemo(() => getAllProfileAssistantSteps(values), [values]);
  const selectStep: AssistantStep = useMemo(
    () => ({
      id: "profile-edit-select",
      field: "profileEditSelect",
      type: "text",
      required: true,
      labelEn: "Field to edit",
      labelJa: "変更する項目",
      questionEn: "Which profile information would you like to change?",
      questionJa: "どのプロフィール情報を変更しますか？",
      hintEn: "Choose a field on the right, or type a field name.",
      hintJa: "右側の項目を選ぶか、項目名を入力してください。",
    }),
    [],
  );
  const [selectedStep, setSelectedStep] = useState<AssistantStep | undefined>();
  const [isReview, setIsReview] = useState(false);
  const [changedFields, setChangedFields] = useState<string[]>([]);
  const [history, setHistory] = useState<
    { values: AssistantValues; selectedStep?: AssistantStep; isReview: boolean }[]
  >([]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "intro",
      role: "assistant",
      text:
        locale === "ja"
          ? "変更したい organizer profile の項目を選んでください。現在値を確認してから、新しい値を入力できます。"
          : "Tell me which organizer profile field you want to update. I will show the current value before asking for the new one.",
    },
    {
      id: "first-question",
      role: "assistant",
      text: locale === "ja" ? selectStep.questionJa : selectStep.questionEn,
    },
  ]);
  const [isPending, startTransition] = useTransition();
  const messageIdRef = useRef(0);

  function nextMessageId(prefix: string) {
    messageIdRef.current += 1;
    return `${prefix}-${messageIdRef.current}`;
  }

  function submitAnswer(valueOverride?: string) {
    if (isPending || isReview) return;
    const answer = (valueOverride ?? input).trim();
    if (!answer) return;

    setMessages((current) => [
      ...current,
      {
        id: nextMessageId("user"),
        role: "user",
        text: selectedStep ? displayAnswer(selectedStep, answer, locale) : answer,
      },
    ]);
    setInput("");

    if (!selectedStep) {
      chooseField(answer);
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/ai/form-assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flowType: "profile",
            stepId: selectedStep.id,
            value: answer,
            values,
            locale,
          }),
        });
        const result = (await response.json()) as AssistantResponse;
        if (!result.ok) {
          pushAssistant(result.error);
          return;
        }
        if (!result.data.accepted) {
          pushAssistant(result.data.assistantMessage);
          return;
        }

        setHistory((current) => [
          ...current,
          { values, selectedStep, isReview: false },
        ]);
        setValues((current) => {
          const local = validateAssistantAnswer(selectedStep, answer, current);
          const normalized =
            selectedStep.type === "choice" && local.ok
              ? local.normalizedValue
              : result.data.normalizedValue;
          const isBooleanChoice = selectedStep.options?.every((option) =>
            ["true", "false"].includes(option.value),
          );

          return {
            ...current,
            [selectedStep.field]: isBooleanChoice ? normalized === "true" : normalized,
          };
        });
        setChangedFields((current) =>
          current.includes(selectedStep.field)
            ? current
            : [...current, selectedStep.field],
        );
        pushAssistant(
          locale === "ja"
            ? `${getStepLabel(selectedStep, locale)} を更新しました。他に変更したい項目を選ぶか、確認して保存してください。`
            : `${getStepLabel(selectedStep, locale)} updated. Choose another field, or review and save.`,
        );
        setSelectedStep(undefined);
      } catch {
        pushAssistant(copy.networkError);
      }
    });
  }

  function chooseField(answer: string) {
    const lower = answer.toLowerCase();
    if (["review", "save", "done"].includes(lower)) {
      startReview();
      return;
    }

    const step = steps.find((item) => {
      const labels = [item.field, item.labelEn, item.labelJa].map((value) =>
        value.toLowerCase(),
      );
      return labels.some((label) => label === lower || label.includes(lower));
    });

    if (!step) {
      pushAssistant(
        locale === "ja"
          ? "変更する項目が見つかりませんでした。右側の項目ボタンから選んでください。"
          : "I could not find that field. Please choose one of the field buttons on the right.",
      );
      return;
    }

    setHistory((current) => [
      ...current,
      { values, selectedStep: undefined, isReview: false },
    ]);
    setSelectedStep(step);
    const currentValue = String(values[step.field] ?? "") || "-";
    pushAssistant(
      locale === "ja"
        ? `現在の ${getStepLabel(step, locale)} は「${currentValue}」です。新しい値を入力してください。`
        : `Current ${getStepLabel(step, locale)}: ${currentValue}. What should the new value be?`,
    );
  }

  function startReview() {
    setHistory((current) => [
      ...current,
      { values, selectedStep, isReview },
    ]);
    setSelectedStep(undefined);
    setIsReview(true);
    pushAssistant(
      locale === "ja"
        ? "保存前の確認です。内容に問題がなければ保存してください。"
        : "Review the profile before saving. Submit when it looks right.",
    );
  }

  function goBack() {
    const previous = history.at(-1);
    if (!previous || isPending) return;
    setValues(previous.values);
    setSelectedStep(previous.selectedStep);
    setIsReview(previous.isReview);
    setHistory((current) => current.slice(0, -1));
    setMessages((current) => [
      ...current,
      {
        id: nextMessageId("back"),
        role: "system",
        text:
          locale === "ja"
            ? "一つ前の状態に戻りました。"
            : "Returned to the previous step.",
      },
    ]);
  }

  async function reportIssue() {
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    await fetch("/api/ai/form-assistant/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        flowType: "profile",
        stepId: selectedStep?.id ?? (isReview ? "review" : "edit-select"),
        locale,
        userAnswer: input,
        botMessage: lastAssistant?.text ?? "",
        context: values,
      }),
    }).catch(() => undefined);
    setMessages((current) => [
      ...current,
      { id: nextMessageId("reported"), role: "system", text: copy.reported },
    ]);
  }

  function pushAssistant(text: string) {
    setMessages((current) => [
      ...current,
      { id: nextMessageId("assistant"), role: "assistant", text },
    ]);
  }

  return {
    values,
    setValues,
    messages,
    input,
    setInput,
    selectedStep,
    currentStep: selectedStep ?? selectStep,
    isPending,
    isReview,
    changedFields,
    canBack: history.length > 0,
    submitAnswer,
    startReview,
    goBack,
    reportIssue,
  };
}

export function AssistantInputBar({
  locale,
  step,
  input,
  setInput,
  isPending,
  onSubmit,
  onBack,
  onReport,
  canBack,
}: {
  locale: string;
  step: AssistantStep | undefined;
  input: string;
  setInput: (value: string) => void;
  isPending: boolean;
  onSubmit: (valueOverride?: string) => void;
  onBack: () => void;
  onReport: () => void;
  canBack: boolean;
}) {
  const copy = getAssistantCopy(locale);
  if (!step) {
    return (
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={!canBack || isPending}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-green-700 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copy.back}
        </button>
        <button
          type="button"
          onClick={onReport}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-red-500 hover:text-red-700"
        >
          {copy.report}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {step.options && (
        <div className="flex flex-wrap gap-2">
          {step.options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSubmit(option.value)}
              disabled={isPending}
              className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-green-700 hover:text-green-700 disabled:opacity-50"
            >
              {getOptionLabel(option, locale)}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              onSubmit();
            }
          }}
          placeholder={copy.currentAnswer}
          className="min-w-0 flex-1 rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="button"
          onClick={() => onSubmit()}
          disabled={isPending || !input.trim()}
          className="rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {isPending ? "..." : copy.send}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={!canBack || isPending}
          className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:border-green-700 hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {copy.back}
        </button>
        <button
          type="button"
          onClick={onReport}
          className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:border-red-500 hover:text-red-700"
        >
          {copy.report}
        </button>
      </div>
    </div>
  );
}

export function AssistantReview({
  locale,
  steps,
  values,
}: {
  locale: string;
  steps: AssistantStep[];
  values: AssistantValues;
}) {
  return (
    <dl className="space-y-2 text-sm">
      {steps.map((step) => (
        <div key={step.id} className="rounded-lg border border-stone-200 bg-white px-4 py-3">
          <dt className="text-xs font-semibold uppercase text-stone-500">
            {getStepLabel(step, locale)}
          </dt>
          <dd className="mt-1 font-medium text-stone-900">
            {String(values[step.field] ?? "") || "-"}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function OptionalGroupsEditor({
  locale,
  groups,
  values,
  onChange,
}: {
  locale: string;
  groups: AssistantOptionalGroup[];
  values: AssistantValues;
  onChange: (field: string, value: string | boolean) => void;
}) {
  const visibleGroups = useMemo(
    () => groups.filter((group) => !group.showWhen || group.showWhen(values)),
    [groups, values],
  );

  return (
    <div className="space-y-4">
      {visibleGroups.map((group) => (
        <details key={group.id} className="rounded-lg border border-stone-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-bold text-stone-950">
            {locale === "ja" ? group.titleJa : group.titleEn}
            <span className="mt-1 block text-xs font-normal leading-5 text-stone-500">
              {locale === "ja" ? group.descriptionJa : group.descriptionEn}
            </span>
          </summary>
          <div className="mt-4 space-y-3">
            {group.fields.map((field) => (
              <OptionalField
                key={field.field}
                locale={locale}
                field={field}
                value={values[field.field]}
                onChange={onChange}
              />
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export function OptionalField({
  locale,
  field,
  value,
  onChange,
}: {
  locale: string;
  field: AssistantStep;
  value: string | boolean | undefined;
  onChange: (field: string, value: string | boolean) => void;
}) {
  const label = getStepLabel(field, locale);
  if (field.options) {
    return (
      <label className="block">
        <span className="text-sm font-medium text-stone-700">{label}</span>
        <select
          value={String(value ?? "")}
          onChange={(event) => {
            const nextValue = event.target.value;
            onChange(
              field.field,
              nextValue === "true" ? true : nextValue === "false" ? false : nextValue,
            );
          }}
          className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">{locale === "ja" ? "未入力" : "Not set"}</option>
          {field.options.map((option) => (
            <option key={option.value || "empty"} value={option.value}>
              {getOptionLabel(option, locale)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
        value={String(value ?? "")}
        onChange={(event) => onChange(field.field, event.target.value)}
        className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

export function HiddenInputs({ values }: { values: AssistantValues }) {
  return (
    <>
      {Object.entries(values).map(([key, value]) => {
        if (typeof value === "boolean") {
          return value ? <input key={key} type="hidden" name={key} value="on" /> : null;
        }
        return <input key={key} type="hidden" name={key} value={value} />;
      })}
    </>
  );
}

function displayAnswer(step: AssistantStep, answer: string, locale: string) {
  const option = step.options?.find((item) => item.value === answer);
  return option ? getOptionLabel(option, locale) : answer;
}

function extractPostalCode(value: string) {
  const match = value.match(/\b\d{3}-?\d{4}\b/);
  return match ? match[0].replace(/\D/g, "") : "";
}

export { profileOptionalGroups, opportunityOptionalGroups };
