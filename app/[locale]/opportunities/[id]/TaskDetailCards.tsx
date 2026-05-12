"use client";

import { useState } from "react";
import type { EffortLevel, OpportunityTask } from "@/lib/mockOpportunities";

const colorStyles = {
  green: {
    rail: "border-l-green-600",
    tint: "bg-green-50",
    label: "Plant / outdoor",
  },
  blue: {
    rail: "border-l-sky-600",
    tint: "bg-sky-50",
    label: "Calm / indoor",
  },
  orange: {
    rail: "border-l-orange-500",
    tint: "bg-orange-50",
    label: "Social / collaborative",
  },
} as const;

const effortLabels: Record<EffortLevel, string> = {
  low: "Low",
  medium: "Moderate",
  high: "High",
};

const effortHeights: Record<EffortLevel, string> = {
  low: "min-h-36",
  medium: "min-h-44",
  high: "min-h-52",
};

export default function TaskDetailCards({ tasks }: { tasks: OpportunityTask[] }) {
  const [openTaskId, setOpenTaskId] = useState(tasks[0]?.id ?? "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs font-medium text-stone-700">
        {Object.entries(colorStyles).map(([key, style]) => (
          <span key={key} className="inline-flex items-center gap-2">
            <span className={`h-3 w-3 rounded-sm ${style.tint} border ${style.rail}`} />
            {style.label}
          </span>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {tasks.map((task) => {
          const isOpen = openTaskId === task.id;
          const color = colorStyles[task.typeColor];
          const rounded =
            task.environmentShape === "relaxed" ? "rounded-lg" : "rounded-sm";

          return (
            <article
              key={task.id}
              className={`${rounded} ${color.tint} ${effortHeights[task.physicalEffort]} border border-stone-200 border-l-4 ${color.rail} p-4 shadow-sm transition`}
            >
              <button
                type="button"
                onClick={() => setOpenTaskId(isOpen ? "" : task.id)}
                className="block w-full text-left"
                aria-expanded={isOpen}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-stone-950">
                      {task.name}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-stone-600">
                      {task.startTime} · {task.durationMinutes} min ·{" "}
                      {task.peopleNeeded} people
                    </p>
                  </div>
                  <span className="shrink-0 rounded-sm bg-white/80 px-2 py-1 text-xs font-semibold text-stone-700">
                    {task.spotsRemaining} left
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-700">
                  {task.shortDescription}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-stone-700">
                  <span className="rounded-sm bg-white/80 px-2 py-1">
                    Physical: {effortLabels[task.physicalEffort]}
                  </span>
                  <span className="rounded-sm bg-white/80 px-2 py-1">
                    Mental: {effortLabels[task.mentalEffort]}
                  </span>
                  <span className="rounded-sm bg-white/80 px-2 py-1">
                    {task.environmentShape === "relaxed" ? "Relaxed" : "Structured"}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="mt-5 border-t border-stone-300/70 pt-5">
                  <p className="text-sm leading-6 text-stone-800">
                    {task.fullDescription}
                  </p>

                  <div className="mt-4 grid gap-4 text-sm md:grid-cols-2">
                    <DetailList title="Steps" items={task.steps} />
                    <DetailList title="Tools provided" items={task.toolsProvided} />
                    <DetailList title="Bring" items={task.thingsToBring} />
                    <div>
                      <h4 className="font-semibold text-stone-900">Extra details</h4>
                      <dl className="mt-2 space-y-2">
                        {task.customFields.map((field) => (
                          <div key={field.label}>
                            <dt className="text-xs font-semibold uppercase text-stone-500">
                              {field.label}
                            </dt>
                            <dd className="text-stone-700">{field.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("start-event-application", {
                          detail: { taskId: task.id },
                        }),
                      )
                    }
                    className="mt-5 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                  >
                    Sign up for this task
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-semibold text-stone-900">{title}</h4>
      <ul className="mt-2 space-y-1 text-stone-700">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}
