"use client";

import type { ReactNode } from "react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import UserAvatar from "@/components/UserAvatar";
import {
  submitEventApplication,
  withdrawEventApplication,
  type ApplicationFormState,
} from "./actions";
import type { MockOpportunity, OpportunityTask } from "@/lib/mockOpportunities";

type ExistingApplication = {
  status: string;
  selectedTaskItems: unknown;
  waitlistPosition: number | null;
} | null;

type EventApplicationPanelProps = {
  locale: string;
  opportunity: MockOpportunity;
  isSignedIn: boolean;
  signInHref: string;
  existingApplication: ExistingApplication;
  profileSkills: string[];
  hasScheduleConflict: boolean;
};

type Step = "tasks" | "time" | "skills" | "summary";

const initialState: ApplicationFormState = {
  status: "idle",
};

export default function EventApplicationPanel({
  locale,
  opportunity,
  isSignedIn,
  signInHref,
  existingApplication,
  profileSkills,
  hasScheduleConflict,
}: EventApplicationPanelProps) {
  const t = useTranslations("opportunities.applicationFlow");
  const router = useRouter();
  const isFull = opportunity.spotsRemaining <= 0;
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("tasks");
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [timeConfirmed, setTimeConfirmed] = useState(false);
  const [skills, setSkills] = useState(profileSkills);
  const [skillDraft, setSkillDraft] = useState("");
  const [experienceNote, setExperienceNote] = useState("");
  const [state, formAction, isPending] = useActionState(
    submitEventApplication,
    initialState,
  );

  const selectedTasks = useMemo(
    () =>
      selectedTaskIds
        .map((taskId) => opportunity.taskFlow.find((task) => task.id === taskId))
        .filter((task): task is OpportunityTask => Boolean(task)),
    [opportunity.taskFlow, selectedTaskIds],
  );
  const totalMinutes = selectedTasks.reduce(
    (total, task) => total + task.durationMinutes,
    0,
  );
  const canChooseMultiple = opportunity.allowMultipleTaskSelection ?? false;
  const stepLabels: Record<Step, string> = {
    tasks: t("steps.task"),
    time: t("steps.time"),
    skills: t("steps.experience"),
    summary: t("steps.review"),
  };

  useEffect(() => {
    function handleTaskCardApply(event: Event) {
      const taskId = (event as CustomEvent<{ taskId?: string }>).detail?.taskId;
      if (!taskId) return;

      if (!isSignedIn) {
        window.location.href = signInHref;
        return;
      }

      if (existingApplication) {
        setIsOpen(true);
        return;
      }

      const task = opportunity.taskFlow.find((item) => item.id === taskId);
      if (task && (task.spotsRemaining > 0 || isFull)) {
        setSelectedTaskIds([taskId]);
      }
      setStep("tasks");
      setIsOpen(true);
    }

    window.addEventListener("start-event-application", handleTaskCardApply);
    return () =>
      window.removeEventListener("start-event-application", handleTaskCardApply);
  }, [existingApplication, isFull, isSignedIn, opportunity.taskFlow, signInHref]);

  function handlePrimaryAction() {
    if (!isSignedIn) return;
    setIsOpen(true);
  }

  function toggleTask(task: OpportunityTask) {
    const taskIsFull = task.spotsRemaining <= 0;
    if (taskIsFull && !isFull) return;

    setSelectedTaskIds((currentIds) => {
      if (currentIds.includes(task.id)) {
        return currentIds.filter((taskId) => taskId !== task.id);
      }
      if (!canChooseMultiple) return [task.id];
      return [...currentIds, task.id];
    });
  }

  function addSkill() {
    const nextSkill = skillDraft.trim();
    if (!nextSkill || skills.includes(nextSkill)) {
      setSkillDraft("");
      return;
    }
    setSkills((currentSkills) => [...currentSkills, nextSkill].slice(0, 12));
    setSkillDraft("");
  }

  function closeFlow() {
    setIsOpen(false);
    if (state.status === "success") {
      router.refresh();
    }
  }

  const actionLabel = existingApplication
    ? t("actions.viewApplication")
    : isFull
      ? t("actions.joinWaitlist")
      : t("actions.apply");

  return (
    <>
      <aside className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-6 py-4 shadow-lg backdrop-blur md:inset-x-auto md:right-6 md:bottom-6 md:w-96 md:rounded-lg md:border md:p-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:mx-0">
          <div>
            <p className="text-xs font-semibold uppercase text-stone-500">
              {isFull ? t("waitlistAvailable") : t("readyToJoin")}
            </p>
            <p className="mt-1 text-sm font-medium text-stone-800">
              {existingApplication
                ? statusCopy(
                    existingApplication.status,
                    existingApplication.waitlistPosition,
                    locale,
                  )
                : t("spotsAcrossTasks", {
                    spots: opportunity.spotsRemaining,
                    tasks: opportunity.taskFlow.length,
                  })}
            </p>
          </div>

          {isSignedIn ? (
            existingApplication ? (
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="inline-flex items-center justify-center rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-700"
              >
                {actionLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="inline-flex items-center justify-center rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600"
              >
                {actionLabel}
              </button>
            )
          ) : (
            <a
              href={signInHref}
              className="inline-flex items-center justify-center rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-600"
            >
              {actionLabel}
            </a>
          )}
        </div>
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 bg-stone-950/50 px-4 py-6 md:flex md:items-center md:justify-center">
          <div className="mx-auto flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-stone-200 p-5">
              <div>
                <p className="text-xs font-semibold uppercase text-green-700">
                  {isFull ? t("waitlistApplication") : t("eventApplication")}
                </p>
                <h2 className="mt-1 text-xl font-bold text-stone-950">
                  {opportunity.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeFlow}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                {t("actions.close")}
              </button>
            </div>

            {existingApplication ? (
              <ExistingApplicationScreen
                locale={locale}
                opportunityId={opportunity.id}
                existingApplication={existingApplication}
                onClose={closeFlow}
              />
            ) : state.status === "success" ? (
              <SuccessScreen
                locale={locale}
                opportunity={opportunity}
                selectedTasks={selectedTasks}
                message={state.message ?? ""}
                isWaitlist={isFull}
                onClose={closeFlow}
              />
            ) : (
              <form action={formAction} className="flex min-h-0 flex-1 flex-col">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="opportunityId" value={opportunity.id} />
                <input type="hidden" name="skillTags" value={skills.join(", ")} />
                <input type="hidden" name="experienceNote" value={experienceNote} />
                {selectedTaskIds.map((taskId) => (
                  <input
                    key={taskId}
                    type="hidden"
                    name="selectedTaskIds"
                    value={taskId}
                  />
                ))}
                {timeConfirmed && (
                  <input
                    type="hidden"
                    name="confirmedTimeCommitment"
                    value="on"
                  />
                )}

                <div className="border-b border-stone-200 px-5 py-3">
                  <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-stone-500">
                    {(Object.keys(stepLabels) as Step[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setStep(item)}
                        className={`rounded-sm px-2 py-2 text-left ${
                          step === item
                            ? "bg-green-700 text-white"
                            : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {stepLabels[item]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-5">
                  {step === "tasks" && (
                    <TaskSelectionStep
                      tasks={opportunity.taskFlow}
                      locale={locale}
                      selectedTaskIds={selectedTaskIds}
                      isWaitlist={isFull}
                      canChooseMultiple={canChooseMultiple}
                      onToggleTask={toggleTask}
                    />
                  )}

                  {step === "time" && (
                    <TimeCommitmentStep
                      opportunity={opportunity}
                      locale={locale}
                      selectedTasks={selectedTasks}
                      totalMinutes={totalMinutes}
                      timeConfirmed={timeConfirmed}
                      hasScheduleConflict={hasScheduleConflict}
                      onConfirmChange={setTimeConfirmed}
                    />
                  )}

                  {step === "skills" && (
                    <SkillsStep
                      skills={skills}
                      locale={locale}
                      skillDraft={skillDraft}
                      experienceNote={experienceNote}
                      onSkillDraftChange={setSkillDraft}
                      onAddSkill={addSkill}
                      onRemoveSkill={(skill) =>
                        setSkills((currentSkills) =>
                          currentSkills.filter((item) => item !== skill),
                        )
                      }
                      onExperienceNoteChange={setExperienceNote}
                    />
                  )}

                  {step === "summary" && (
                    <SummaryStep
                      selectedTasks={selectedTasks}
                      locale={locale}
                      totalMinutes={totalMinutes}
                      skills={skills}
                      experienceNote={experienceNote}
                      timeConfirmed={timeConfirmed}
                      isWaitlist={isFull}
                      onEdit={setStep}
                    />
                  )}

                  {state.status === "error" && state.message && (
                    <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {state.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-stone-200 p-5">
                  <button
                    type="button"
                    onClick={() => setStep(previousStep(step))}
                    disabled={step === "tasks"}
                    className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("actions.back")}
                  </button>

                  {step === "summary" ? (
                    <button
                      type="submit"
                      disabled={
                        isPending ||
                        selectedTaskIds.length === 0 ||
                        !timeConfirmed ||
                        experienceNote.length > 300
                      }
                      className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-stone-400"
                    >
                      {isPending
                        ? t("actions.submitting")
                        : isFull
                          ? t("actions.joinWaitlist")
                          : t("actions.submitApplication")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStep(nextStep(step))}
                      disabled={
                        (step === "tasks" && selectedTaskIds.length === 0) ||
                        (step === "time" && !timeConfirmed)
                      }
                      className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-stone-400"
                    >
                      {t("actions.next")}
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TaskSelectionStep({
  tasks,
  locale,
  selectedTaskIds,
  isWaitlist,
  canChooseMultiple,
  onToggleTask,
}: {
  tasks: OpportunityTask[];
  locale: string;
  selectedTaskIds: string[];
  isWaitlist: boolean;
  canChooseMultiple: boolean;
  onToggleTask: (task: OpportunityTask) => void;
}) {
  const t = useTranslations("opportunities.applicationFlow");
  return (
    <div>
      <h3 className="text-lg font-bold text-stone-950">{t("task.title")}</h3>
      <p className="mt-1 text-sm text-stone-600">
        {canChooseMultiple
          ? t("task.multiple")
          : t("task.single")}
      </p>
      <div className="mt-4 grid gap-3">
        {tasks.map((task) => {
          const selected = selectedTaskIds.includes(task.id);
          const taskIsFull = task.spotsRemaining <= 0;
          const disabled = taskIsFull && !isWaitlist;

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onToggleTask(task)}
              disabled={disabled}
              className={`rounded-lg border p-4 text-left transition ${
                selected
                  ? "border-green-700 bg-green-50"
                  : "border-stone-200 bg-white hover:border-green-500"
              } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-stone-950">{task.name}</h4>
                  <p className="mt-1 text-sm text-stone-600">
                    {task.startTime} · {formatMinutes(task.durationMinutes, locale)} ·{" "}
                    {t("people", { count: task.peopleNeeded })}
                  </p>
                </div>
                <span className="rounded-sm bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
                  {taskIsFull
                    ? isWaitlist
                      ? t("task.waitlist")
                      : t("task.full")
                    : t("task.left", { count: task.spotsRemaining })}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-stone-700">
                <span className={`rounded-sm px-2 py-1 ${taskColorClass(task.typeColor)}`}>
                  {task.typeColor}
                </span>
                <span className="rounded-sm bg-stone-100 px-2 py-1">
                  {task.environmentShape}
                </span>
                <span className="rounded-sm bg-stone-100 px-2 py-1">
                  {t("task.physical")} {task.physicalEffort}
                </span>
                <span className="rounded-sm bg-stone-100 px-2 py-1">
                  {t("task.mental")} {task.mentalEffort}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TimeCommitmentStep({
  opportunity,
  locale,
  selectedTasks,
  totalMinutes,
  timeConfirmed,
  hasScheduleConflict,
  onConfirmChange,
}: {
  opportunity: MockOpportunity;
  locale: string;
  selectedTasks: OpportunityTask[];
  totalMinutes: number;
  timeConfirmed: boolean;
  hasScheduleConflict: boolean;
  onConfirmChange: (value: boolean) => void;
}) {
  const t = useTranslations("opportunities.applicationFlow");
  return (
    <div>
      <h3 className="text-lg font-bold text-stone-950">{t("time.title")}</h3>
      <dl className="mt-4 grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm sm:grid-cols-2">
        <SummaryFact
          label={t("time.eventDate")}
          value={formatDateRange(opportunity.startsAt, opportunity.endsAt, locale)}
        />
        <SummaryFact label={t("time.arrival")} value={formatTime(opportunity.startsAt, locale)} />
        <SummaryFact label={t("time.eventEnds")} value={formatTime(opportunity.endsAt, locale)} />
        <SummaryFact label={t("time.selectedTime")} value={formatMinutes(totalMinutes, locale)} />
      </dl>
      <div className="mt-4 space-y-2">
        {selectedTasks.map((task) => (
          <p key={task.id} className="text-sm text-stone-700">
            {task.name}: {task.startTime}, {formatMinutes(task.durationMinutes, locale)}
          </p>
        ))}
      </div>
      {hasScheduleConflict && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("time.conflict")}
        </p>
      )}
      <label className="mt-5 flex items-start gap-3 rounded-lg border border-stone-200 p-4 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={timeConfirmed}
          onChange={(event) => onConfirmChange(event.target.checked)}
          className="mt-1"
        />
        <span>{t("time.confirm")}</span>
      </label>
    </div>
  );
}

function SkillsStep({
  skills,
  locale,
  skillDraft,
  experienceNote,
  onSkillDraftChange,
  onAddSkill,
  onRemoveSkill,
  onExperienceNoteChange,
}: {
  skills: string[];
  locale: string;
  skillDraft: string;
  experienceNote: string;
  onSkillDraftChange: (value: string) => void;
  onAddSkill: () => void;
  onRemoveSkill: (skill: string) => void;
  onExperienceNoteChange: (value: string) => void;
}) {
  const t = useTranslations("opportunities.applicationFlow");
  void locale;
  return (
    <div>
      <h3 className="text-lg font-bold text-stone-950">{t("skills.title")}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {skills.length > 0 ? (
          skills.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => onRemoveSkill(skill)}
              className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-800 hover:border-green-600"
            >
              {skill} x
            </button>
          ))
        ) : (
          <p className="text-sm text-stone-500">{t("skills.noTags")}</p>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={skillDraft}
          onChange={(event) => onSkillDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddSkill();
            }
          }}
          className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder={t("skills.placeholder")}
        />
        <button
          type="button"
          onClick={onAddSkill}
          className="rounded-lg border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
        >
          {t("skills.add")}
        </button>
      </div>
      <label className="mt-5 block">
        <span className="text-sm font-semibold text-stone-800">
          {t("skills.noteLabel")}
        </span>
        <textarea
          value={experienceNote}
          maxLength={300}
          onChange={(event) => onExperienceNoteChange(event.target.value)}
          rows={5}
          className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder={t("skills.notePlaceholder")}
        />
      </label>
      <p className="mt-1 text-right text-xs text-stone-500">
        {experienceNote.length}/300
      </p>
    </div>
  );
}

function SummaryStep({
  selectedTasks,
  locale,
  totalMinutes,
  skills,
  experienceNote,
  timeConfirmed,
  isWaitlist,
  onEdit,
}: {
  selectedTasks: OpportunityTask[];
  locale: string;
  totalMinutes: number;
  skills: string[];
  experienceNote: string;
  timeConfirmed: boolean;
  isWaitlist: boolean;
  onEdit: (step: Step) => void;
}) {
  const t = useTranslations("opportunities.applicationFlow");
  return (
    <div>
      <h3 className="text-lg font-bold text-stone-950">{t("summary.title")}</h3>
      <div className="mt-4 space-y-4">
        <SummarySection title={t("summary.selectedTask")} onEdit={() => onEdit("tasks")}>
          {selectedTasks.map((task) => (
            <p key={task.id} className="text-sm text-stone-700">
              {task.name} · {task.startTime} · {formatMinutes(task.durationMinutes, locale)}
            </p>
          ))}
        </SummarySection>
        <SummarySection title={t("summary.timeCommitment")} onEdit={() => onEdit("time")}>
          <p className="text-sm text-stone-700">
            {t("summary.total", { duration: formatMinutes(totalMinutes, locale) })} ·{" "}
            {timeConfirmed ? t("summary.confirmed") : t("summary.notConfirmed")}
          </p>
        </SummarySection>
        <SummarySection title={t("summary.skills")} onEdit={() => onEdit("skills")}>
          <p className="text-sm text-stone-700">
            {skills.length > 0 ? skills.join(", ") : t("summary.noTags")}
          </p>
          <p className="mt-2 text-sm text-stone-700">
            {experienceNote || t("summary.noNote")}
          </p>
        </SummarySection>
      </div>
      {isWaitlist && (
        <p className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-800">
          {t("summary.waitlistNotice")}
        </p>
      )}
    </div>
  );
}

function SuccessScreen({
  locale,
  opportunity,
  selectedTasks,
  message,
  isWaitlist,
  onClose,
}: {
  locale: string;
  opportunity: MockOpportunity;
  selectedTasks: OpportunityTask[];
  message: string;
  isWaitlist: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("opportunities.applicationFlow");
  const { data: session } = useSession();
  return (
    <div className="p-6">
      {session?.user && (
        <div className="mb-4 flex items-center gap-3">
          <UserAvatar image={session.user.image} name={session.user.name} size="md" />
          <span className="text-sm font-semibold text-stone-800">
            {session.user.name ?? session.user.email}
          </span>
        </div>
      )}
      <p className="text-xs font-semibold uppercase text-green-700">
        {isWaitlist ? t("success.waitlistJoined") : t("success.submitted")}
      </p>
      <h3 className="mt-2 text-2xl font-bold text-stone-950">{message}</h3>
      <dl className="mt-5 grid gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm">
        <SummaryFact label={t("success.event")} value={opportunity.title} />
        <SummaryFact
          label={t("success.task")}
          value={selectedTasks.map((task) => task.name).join(", ")}
        />
        <SummaryFact
          label={t("success.dateTime")}
          value={formatDateRange(opportunity.startsAt, opportunity.endsAt, locale)}
        />
        <SummaryFact
          label={t("success.next")}
          value={
            isWaitlist
              ? t("success.waitlistNext")
              : t("success.pendingNext")
          }
        />
      </dl>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-600"
      >
        {t("actions.done")}
      </button>
    </div>
  );
}

function ExistingApplicationScreen({
  locale,
  opportunityId,
  existingApplication,
  onClose,
}: {
  locale: string;
  opportunityId: string;
  existingApplication: NonNullable<ExistingApplication>;
  onClose: () => void;
}) {
  const t = useTranslations("opportunities.applicationFlow");
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectedTasks = Array.isArray(existingApplication.selectedTaskItems)
    ? existingApplication.selectedTaskItems
    : [];

  function leaveWaitlist() {
    startTransition(async () => {
      const result = await withdrawEventApplication(opportunityId, locale);
      setMessage(result.message);
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  return (
    <div className="p-6">
      <p className="text-xs font-semibold uppercase text-green-700">
        {t("existing.status")}
      </p>
      <h3 className="mt-2 text-2xl font-bold text-stone-950">
        {statusCopy(
          existingApplication.status,
          existingApplication.waitlistPosition,
          locale,
        )}
      </h3>
      <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
        <h4 className="font-semibold text-stone-950">
          {t("existing.selectedTask")}
        </h4>
        <div className="mt-3 space-y-2">
          {selectedTasks.length > 0 ? (
            selectedTasks.map((task, index) => (
              <p key={index} className="text-sm text-stone-700">
                {formatSelectedTask(task, locale)}
              </p>
            ))
          ) : (
            <p className="text-sm text-stone-700">
              {t("existing.noTaskDetails")}
            </p>
          )}
        </div>
      </div>
      {message && (
        <p className="mt-4 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700">
          {message}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {existingApplication.status === "WAITLISTED" && (
          <button
            type="button"
            onClick={leaveWaitlist}
            disabled={isPending}
            className="rounded-lg border border-red-300 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? t("existing.leaving") : t("existing.leaveWaitlist")}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-700"
        >
          {t("actions.done")}
        </button>
      </div>
    </div>
  );
}

function SummarySection({
  title,
  children,
  onEdit,
}: {
  title: string;
  children: ReactNode;
  onEdit: () => void;
}) {
  const t = useTranslations("opportunities.applicationFlow");
  return (
    <section className="rounded-lg border border-stone-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold text-stone-950">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-semibold text-green-700 hover:text-green-600"
        >
          {t("actions.edit")}
        </button>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 font-semibold text-stone-900">{value}</dd>
    </div>
  );
}

function statusCopy(status: string, waitlistPosition: number | null, locale: string) {
  if (status === "WAITLISTED") {
    if (locale !== "en") {
      return waitlistPosition
        ? `ウェイトリスト ${waitlistPosition} 番目です。`
        : "ウェイトリストに登録されています。";
    }
    return waitlistPosition
      ? `You are on the waitlist at position ${waitlistPosition}.`
      : "You are on the waitlist.";
  }
  if (status === "ACCEPTED") {
    return locale === "en" ? "Your spot is confirmed." : "参加が確定しています。";
  }
  if (status === "REJECTED") {
    return locale === "en"
      ? "The organizer did not select this application."
      : "この応募は不採用になりました。";
  }
  if (status === "WITHDRAWN") {
    return locale === "en"
      ? "This application was withdrawn."
      : "この応募は取り下げ済みです。";
  }
  return locale === "en"
    ? "Your application is waiting for organizer review."
    : "主催者の確認待ちです。";
}

function previousStep(step: Step): Step {
  if (step === "summary") return "skills";
  if (step === "skills") return "time";
  if (step === "time") return "tasks";
  return "tasks";
}

function nextStep(step: Step): Step {
  if (step === "tasks") return "time";
  if (step === "time") return "skills";
  if (step === "skills") return "summary";
  return "summary";
}

function formatTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatMinutes(minutes: number, locale: string) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (locale === "en") {
    if (hours === 0) return `${remainingMinutes} min`;
    if (remainingMinutes === 0) return `${hours} hr`;
    return `${hours} hr ${remainingMinutes} min`;
  }
  if (hours === 0) return `${remainingMinutes}分`;
  if (remainingMinutes === 0) return `${hours}時間`;
  return `${hours}時間${remainingMinutes}分`;
}

function taskColorClass(color: OpportunityTask["typeColor"]) {
  if (color === "green") return "bg-green-100 text-green-800";
  if (color === "blue") return "bg-sky-100 text-sky-800";
  return "bg-orange-100 text-orange-800";
}

function formatSelectedTask(task: unknown, locale: string) {
  const fallback = locale === "en" ? "Saved task" : "保存されたタスク";
  if (!task || typeof task !== "object") return fallback;
  const item = task as {
    name?: unknown;
    startTime?: unknown;
    durationMinutes?: unknown;
  };
  const name = typeof item.name === "string" ? item.name : fallback;
  const startTime = typeof item.startTime === "string" ? item.startTime : "";
  const duration =
    typeof item.durationMinutes === "number"
      ? ` · ${formatMinutes(item.durationMinutes, locale)}`
      : "";
  return `${name}${startTime ? ` · ${startTime}` : ""}${duration}`;
}

function formatDateRange(startValue: string, endValue: string, locale: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const startLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);
  const endLabel = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(end);

  return `${startLabel} - ${endLabel}`;
}
