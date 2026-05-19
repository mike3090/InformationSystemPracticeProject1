"use client";

import { useState } from "react";

export type LikedExperience = {
  id: string;
  title: string;
  tags: string[];
  opportunityId: string;
};

const storageKey = "gotouchgrass.likedExperiences";
const updateEvent = "gotouchgrass:liked-experiences-updated";

export function getLikedExperiencesFromStorage(): LikedExperience[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(storageKey);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ExperienceLikeButton({
  experience,
  locale,
}: {
  experience: LikedExperience;
  locale: string;
}) {
  const [liked, setLiked] = useState(() =>
    getLikedExperiencesFromStorage().some((item) => item.id === experience.id),
  );
  const copy = locale === "en" ? englishCopy : japaneseCopy;

  function toggleLike() {
    const current = getLikedExperiencesFromStorage();
    const next = liked
      ? current.filter((item) => item.id !== experience.id)
      : [...current.filter((item) => item.id !== experience.id), experience];

    window.localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event(updateEvent));
    setLiked(!liked);
  }

  return (
    <button
      type="button"
      onClick={toggleLike}
      aria-pressed={liked}
      className={
        liked
          ? "inline-flex items-center justify-center rounded-full bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
          : "inline-flex items-center justify-center rounded-full border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
      }
    >
      <span aria-hidden="true">{liked ? "♥" : "♡"}</span>
      <span className="ml-1">{liked ? copy.liked : copy.like}</span>
    </button>
  );
}

export function listenForLikedExperienceUpdates(callback: () => void) {
  window.addEventListener(updateEvent, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(updateEvent, callback);
    window.removeEventListener("storage", callback);
  };
}

const englishCopy = {
  like: "Like",
  liked: "Liked",
};

const japaneseCopy = {
  like: "好き",
  liked: "好き済み",
};
