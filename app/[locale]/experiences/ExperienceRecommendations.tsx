"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getLikedExperiencesFromStorage,
  listenForLikedExperienceUpdates,
  type LikedExperience,
} from "./ExperienceLikeButton";
import {
  getOpportunityCoverImage,
  mockOpportunities,
} from "@/lib/mockOpportunities";

export default function ExperienceRecommendations({
  locale,
}: {
  locale: string;
}) {
  const [likedExperiences, setLikedExperiences] = useState<LikedExperience[]>([]);
  const copy = locale === "en" ? englishCopy : japaneseCopy;

  useEffect(() => {
    function syncLikedExperiences() {
      setLikedExperiences(getLikedExperiencesFromStorage());
    }

    syncLikedExperiences();
    return listenForLikedExperienceUpdates(syncLikedExperiences);
  }, []);

  const recommendedOpportunities = useMemo(() => {
    if (likedExperiences.length === 0) return [];

    const likedOpportunityIds = new Set(
      likedExperiences.map((experience) => experience.opportunityId),
    );
    const likedSourceOpportunities = mockOpportunities.filter((opportunity) =>
      likedOpportunityIds.has(opportunity.id),
    );
    const interestTerms = getInterestTerms(likedExperiences, likedSourceOpportunities);

    const scoredOpportunities = mockOpportunities
      .filter((opportunity) => !likedOpportunityIds.has(opportunity.id))
      .map((opportunity) => ({
        opportunity,
        score: scoreOpportunity(opportunity, interestTerms),
      }))
      .sort((first, second) => second.score - first.score)
      .filter(({ score }) => score > 0);

    const fallbackOpportunities = mockOpportunities
      .filter((opportunity) => !likedOpportunityIds.has(opportunity.id))
      .filter(
        (opportunity) =>
          likedSourceOpportunities.length === 0 ||
          likedSourceOpportunities.some(
            (likedOpportunity) =>
              likedOpportunity.city === opportunity.city ||
              likedOpportunity.prefecture === opportunity.prefecture ||
              likedOpportunity.category === opportunity.category,
          ),
      )
      .map((opportunity) => ({ opportunity, score: 0 }));

    return [...scoredOpportunities, ...fallbackOpportunities]
      .filter(
        ({ opportunity }, index, all) =>
          all.findIndex((item) => item.opportunity.id === opportunity.id) === index,
      )
      .slice(0, 3)
      .map(({ opportunity }) => opportunity);
  }, [likedExperiences]);

  return (
    <section className="mt-8 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-rose-600">
            {copy.eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-bold text-stone-950">
            {copy.title}
          </h2>
        </div>
        {likedExperiences.length > 0 && (
          <p className="text-sm text-stone-500">
            {copy.basedOn} {likedExperiences.length}
          </p>
        )}
      </div>

      {likedExperiences.length === 0 ? (
        <p className="mt-4 rounded-lg bg-stone-50 p-4 text-sm leading-6 text-stone-600">
          {copy.empty}
        </p>
      ) : recommendedOpportunities.length === 0 ? (
        <p className="mt-4 rounded-lg bg-stone-50 p-4 text-sm leading-6 text-stone-600">
          {copy.noMatches}
        </p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {recommendedOpportunities.map((opportunity) => (
            <Link
              key={opportunity.id}
              href={`/${locale}/opportunities/${opportunity.id}`}
              className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50 transition hover:border-green-300 hover:bg-green-50"
            >
              <div
                className="aspect-[16/10] bg-stone-200 bg-cover bg-center"
                style={{
                  backgroundImage: `url(${getOpportunityCoverImage(opportunity)})`,
                }}
                aria-hidden="true"
              />
              <div className="p-3">
                <h3 className="text-sm font-bold leading-snug text-stone-950">
                  {opportunity.title}
                </h3>
                <p className="mt-1 text-xs text-stone-500">
                  {opportunity.city}, {opportunity.prefecture}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600">
                  {opportunity.shortDescription}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function getInterestTerms(
  likedExperiences: LikedExperience[],
  likedSourceOpportunities: typeof mockOpportunities,
) {
  const terms = new Set<string>();

  for (const experience of likedExperiences) {
    for (const tag of experience.tags) {
      addTerm(terms, tag);
    }
  }

  for (const opportunity of likedSourceOpportunities) {
    addTerm(terms, opportunity.category);
    addTerm(terms, opportunity.city);
    addTerm(terms, opportunity.prefecture);

    for (const tag of opportunity.tags) {
      addTerm(terms, tag);
    }

    for (const task of opportunity.taskFlow) {
      addTerm(terms, task.name);
      addTerm(terms, task.physicalEffort);
      addTerm(terms, task.mentalEffort);
      addTerm(terms, task.typeColor);
      addTerm(terms, task.environmentShape);
    }
  }

  return [...terms];
}

function addTerm(terms: Set<string>, value: string) {
  for (const term of value.toLowerCase().split(/[^a-z0-9]+/)) {
    if (term.length >= 4) {
      terms.add(term);
    }
  }
}

function scoreOpportunity(
  opportunity: (typeof mockOpportunities)[number],
  interestTerms: string[],
) {
  const searchableText = [
    opportunity.title,
    opportunity.category,
    opportunity.city,
    opportunity.prefecture,
    opportunity.shortDescription,
    opportunity.description,
    ...opportunity.tags,
    ...opportunity.taskFlow.flatMap((task) => [
      task.name,
      task.shortDescription,
      task.fullDescription,
      task.physicalEffort,
      task.mentalEffort,
      task.environmentShape,
      task.typeColor,
    ]),
  ]
    .join(" ")
    .toLowerCase();

  return interestTerms.reduce(
    (score, term) => score + (searchableText.includes(term) ? 1 : 0),
    0,
  );
}

const englishCopy = {
  eyebrow: "Personalized discovery",
  title: "Recommended from your liked experiences",
  basedOn: "Based on liked posts:",
  empty:
    "Like one or more experience posts. The platform will use their tags and activity style to recommend related volunteer opportunities here.",
  noMatches:
    "No close matches yet, but your liked experiences have been saved for recommendation.",
};

const japaneseCopy = {
  eyebrow: "パーソナル推薦",
  title: "好きな経験からおすすめ",
  basedOn: "好きな投稿数:",
  empty:
    "経験投稿に好きボタンを押すと、そのタグや活動スタイルをもとに関連する志愿活动をここにおすすめします。",
  noMatches:
    "近い活動はまだ見つかりませんが、好きな経験は推薦用に保存されています。",
};
