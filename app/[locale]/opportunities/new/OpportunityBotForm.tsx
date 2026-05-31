"use client";

import { createOpportunity } from "./actions";
import {
  AssistantChatFrame,
  AssistantInputBar,
  AssistantReview,
  HiddenInputs,
  OptionalGroupsEditor,
  getAssistantCopy,
  opportunityOptionalGroups,
  useRequiredAssistantFlow,
} from "@/components/FormAssistantBot";
import { opportunityRequiredSteps, type AssistantValues } from "@/lib/formAssistant/flows";

export default function OpportunityBotForm({
  locale,
}: {
  locale: string;
}) {
  const copy = getAssistantCopy(locale);
  const flow = useRequiredAssistantFlow({ flowType: "opportunity", locale });
  const submitValues = withOpportunityDefaults(flow.values);

  return (
    <form action={createOpportunity}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="aiDrafted" value="true" />
      <input type="hidden" name="taskFlowJson" value={JSON.stringify([taskFromValues(submitValues)])} />
      <HiddenInputs values={submitValues} />

      <AssistantChatFrame
        flowType="opportunity"
        locale={locale}
        title={locale === "ja" ? "Task setup bot" : "Task setup bot"}
        messages={flow.messages}
        progress={`${Math.min(flow.stepIndex, opportunityRequiredSteps.length)}/${opportunityRequiredSteps.length}`}
        footer={
          <AssistantInputBar
            locale={locale}
            step={flow.isComplete ? undefined : flow.currentStep}
            input={flow.input}
            setInput={flow.setInput}
            isPending={flow.isPending}
            onSubmit={flow.submitAnswer}
            onBack={flow.goBack}
            onReport={flow.reportIssue}
            canBack={flow.stepIndex > 0}
          />
        }
      >
        {flow.isComplete ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                {copy.review}
              </p>
              <h3 className="mt-1 text-lg font-bold text-stone-950">
                {locale === "ja" ? "保存前の確認" : "Review before saving"}
              </h3>
            </div>
            <AssistantReview
              locale={locale}
              steps={opportunityRequiredSteps}
              values={submitValues}
            />
            <details className="rounded-lg border border-green-100 bg-green-50 p-4">
              <summary className="cursor-pointer text-sm font-bold text-green-950">
                {copy.optionalNow}
                <span className="mt-1 block text-xs font-normal leading-5 text-green-900">
                  {copy.optionalIntro}
                </span>
              </summary>
              <div className="mt-4">
                <OptionalGroupsEditor
                  locale={locale}
                  groups={opportunityOptionalGroups}
                  values={submitValues}
                  onChange={(field, value) =>
                    flow.setValues((current) => ({ ...current, [field]: value }))
                  }
                />
              </div>
            </details>
            <div className="grid gap-3 sm:grid-cols-2">
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
          </div>
        ) : (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-stone-500">
              {copy.requiredProgress}
            </p>
            <h3 className="mt-1 text-lg font-bold text-stone-950">
              {flow.currentStep
                ? locale === "ja"
                  ? flow.currentStep.labelJa
                  : flow.currentStep.labelEn
                : copy.review}
            </h3>
            <div className="mt-5">
              <AssistantReview
                locale={locale}
                steps={opportunityRequiredSteps.slice(0, flow.stepIndex)}
                values={submitValues}
              />
            </div>
          </div>
        )}
      </AssistantChatFrame>
    </form>
  );
}

function withOpportunityDefaults(values: AssistantValues): AssistantValues {
  return {
    allowWaitlist: true,
    taskTypeColor: "green",
    environmentShape: "relaxed",
    physicalEffort: "medium",
    mentalEffort: "medium",
    ...values,
  };
}

function taskFromValues(values: AssistantValues) {
  const peopleNeeded = positiveNumber(values.taskPeopleNeeded, 1);
  return {
    id: "task-1",
    name: String(values.taskName ?? ""),
    startTime: String(values.taskStartTime ?? ""),
    durationMinutes: positiveNumber(values.taskDurationMinutes, 60),
    peopleNeeded,
    shortDescription: String(values.taskShortDescription ?? ""),
    steps: String(values.taskSteps ?? ""),
    toolsProvided: String(values.toolsProvided ?? ""),
    thingsToBring: String(values.thingsToBring ?? ""),
    typeColor: String(values.taskTypeColor ?? "green"),
    environmentShape: String(values.environmentShape ?? "relaxed"),
    physicalEffort: String(values.physicalEffort ?? "medium"),
    mentalEffort: String(values.mentalEffort ?? "medium"),
  };
}

function positiveNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}
