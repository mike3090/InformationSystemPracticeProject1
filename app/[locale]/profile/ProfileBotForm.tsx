"use client";

import { saveProfile } from "./actions";
import {
  AssistantChatFrame,
  AssistantInputBar,
  AssistantReview,
  HiddenInputs,
  OptionalGroupsEditor,
  getAssistantCopy,
  profileOptionalGroups,
  useProfileEditAssistantFlow,
  useRequiredAssistantFlow,
} from "@/components/FormAssistantBot";
import {
  getAllProfileAssistantSteps,
  profileRequiredSteps,
  type AssistantValues,
} from "@/lib/formAssistant/flows";

export default function ProfileBotForm({
  locale,
  next,
  mode = "setup",
  initialValues,
}: {
  locale: string;
  next: string;
  mode?: "setup" | "edit";
  initialValues?: AssistantValues;
}) {
  const copy = getAssistantCopy(locale);
  const flow = useRequiredAssistantFlow({ flowType: "profile", locale });
  const editFlow = useProfileEditAssistantFlow({
    locale,
    initialValues: initialValues ?? {},
  });
  const isEdit = mode === "edit";
  const activeValues = isEdit ? editFlow.values : flow.values;
  const allProfileSteps = getAllProfileAssistantSteps(activeValues);

  return (
    <form action={saveProfile}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="profileType" value="requester" />
      <HiddenInputs values={activeValues} />

      <AssistantChatFrame
        flowType="profile"
        locale={locale}
        title={
          isEdit
            ? locale === "ja"
              ? "Organizer profile edit bot"
              : "Organizer profile edit bot"
            : locale === "ja"
              ? "Organizer profile bot"
              : "Organizer profile bot"
        }
        messages={isEdit ? editFlow.messages : flow.messages}
        progress={
          isEdit
            ? `${editFlow.changedFields.length} ${
                locale === "ja" ? "項目を変更" : "field(s) changed"
              }`
            : `${Math.min(flow.stepIndex, profileRequiredSteps.length)}/${profileRequiredSteps.length}`
        }
        footer={
          isEdit ? (
            <AssistantInputBar
              locale={locale}
              step={editFlow.isReview ? undefined : editFlow.currentStep}
              input={editFlow.input}
              setInput={editFlow.setInput}
              isPending={editFlow.isPending}
              onSubmit={editFlow.submitAnswer}
              onBack={editFlow.goBack}
              onReport={editFlow.reportIssue}
              canBack={editFlow.canBack}
            />
          ) : (
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
          )
        }
      >
        {isEdit ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                {editFlow.isReview
                  ? copy.review
                  : locale === "ja"
                    ? "変更する項目"
                    : "Fields to edit"}
              </p>
              <h3 className="mt-1 text-lg font-bold text-stone-950">
                {editFlow.isReview
                  ? locale === "ja"
                    ? "保存前の確認"
                    : "Review before saving"
                  : editFlow.selectedStep
                    ? locale === "ja"
                      ? editFlow.selectedStep.labelJa
                      : editFlow.selectedStep.labelEn
                    : locale === "ja"
                      ? "変更したい情報を選んでください"
                      : "Choose what to update"}
              </h3>
            </div>
            {!editFlow.selectedStep && !editFlow.isReview && (
              <div className="flex flex-wrap gap-2">
                {allProfileSteps.map((step) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => editFlow.submitAnswer(step.field)}
                    className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-green-700 hover:text-green-700"
                  >
                    {locale === "ja" ? step.labelJa : step.labelEn}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={editFlow.startReview}
                  className="rounded-full bg-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"
                >
                  {locale === "ja" ? "確認して保存" : "Review and save"}
                </button>
              </div>
            )}
            <AssistantReview
              locale={locale}
              steps={editFlow.isReview ? allProfileSteps : allProfileSteps.slice(0, 12)}
              values={activeValues}
            />
            {editFlow.isReview && (
              <button
                type="submit"
                className="w-full rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600"
              >
                {copy.submitProfile}
              </button>
            )}
          </div>
        ) : flow.isComplete ? (
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
              steps={profileRequiredSteps}
              values={flow.values}
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
                  groups={profileOptionalGroups}
                  values={flow.values}
                  onChange={(field, value) =>
                    flow.setValues((current) => ({ ...current, [field]: value }))
                  }
                />
              </div>
            </details>
            <button
              type="submit"
              className="w-full rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600"
            >
              {copy.submitProfile}
            </button>
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
            {flow.currentStep?.hintEn && (
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {locale === "ja" ? flow.currentStep.hintJa : flow.currentStep.hintEn}
              </p>
            )}
            <div className="mt-5">
              <AssistantReview
                locale={locale}
                steps={profileRequiredSteps.slice(0, flow.stepIndex)}
                values={flow.values}
              />
            </div>
          </div>
        )}
      </AssistantChatFrame>
    </form>
  );
}
