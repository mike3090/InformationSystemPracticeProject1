import {
  getOpportunityCoverImage,
  mockOpportunities,
} from "@/lib/mockOpportunities";

export type ExperienceView = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  tags: string[];
  rating: number | null;
  createdAt: Date;
  authorName: string | null;
  authorImage: string | null;
  opportunityId: string;
  opportunityTitle: string;
  opportunityCity: string | null;
  opportunityPrefecture: string | null;
};

export function getDemoExperiences(locale: string): ExperienceView[] {
  const demoCopy = locale === "en" ? englishDemoPosts : japaneseDemoPosts;

  return mockOpportunities.slice(0, 3).map((opportunity, index) => ({
    id: `demo-${opportunity.id}`,
    title: demoCopy[index].title,
    body: demoCopy[index].body,
    imageUrl: getOpportunityCoverImage(opportunity),
    tags: demoCopy[index].tags,
    rating: demoCopy[index].rating,
    createdAt: new Date(Date.now() - index * 86400000),
    authorName: demoCopy[index].authorName,
    authorImage: null,
    opportunityId: opportunity.id,
    opportunityTitle: opportunity.title,
    opportunityCity: opportunity.city,
    opportunityPrefecture: opportunity.prefecture,
  }));
}

const englishDemoPosts = [
  {
    title: "A warm morning helping the community garden",
    body:
      "The organizer explained each task clearly, so it was easy to join even as a first-timer. I helped prepare soil and label seedlings. The best part was chatting with local residents during the break. I could understand the atmosphere before applying, and after joining I felt the activity was exactly as described.",
    tags: ["beginner friendly", "gardening", "local people"],
    rating: 5,
    authorName: "Mina",
  },
  {
    title: "Event support felt more relaxed than I expected",
    body:
      "I joined the reception team and helped visitors find the right booth. The schedule was organized, but the atmosphere stayed friendly. I would recommend bringing comfortable shoes and arriving ten minutes early. This kind of experience post would have helped me decide faster before joining.",
    tags: ["event support", "organized", "community"],
    rating: 4,
    authorName: "Ren",
  },
  {
    title: "Small task, real connection",
    body:
      "The activity only took a few hours, but it made the town feel much closer. I liked that the task page had photos and arrival guidance, because I could picture the place before going. After reading posts like this, new volunteers can decide whether the activity fits their energy and schedule.",
    tags: ["short activity", "easy to join", "travel tips"],
    rating: 5,
    authorName: "Aoi",
  },
];

const japaneseDemoPosts = [
  {
    title: "地域ガーデンで過ごした穏やかな朝",
    body:
      "主催者の説明がわかりやすく、初めてでも参加しやすかったです。土づくりと苗のラベル付けを手伝いました。休憩中に地域の方と話せたのが一番印象に残っています。投稿を読んでから参加できると、活動の雰囲気を事前に想像しやすいと感じました。",
    tags: ["初心者向け", "ガーデニング", "地域交流"],
    rating: 5,
    authorName: "Mina",
  },
  {
    title: "イベント受付は思ったより参加しやすかった",
    body:
      "受付チームとして、来場者を案内しました。流れはしっかり決まっていましたが、雰囲気はとても柔らかかったです。歩きやすい靴で、少し早めに行くのがおすすめです。こうした経験投稿があると、参加前の不安が減ると思います。",
    tags: ["イベント補助", "安心", "地域"],
    rating: 4,
    authorName: "Ren",
  },
  {
    title: "短い作業でも町との距離が近くなる",
    body:
      "数時間の活動でしたが、町のことを前より身近に感じました。活動ページに写真と到着案内があったので、行く前に場所のイメージを持てたのがよかったです。このような投稿から、自分に合う活動かどうか判断しやすくなります。",
    tags: ["短時間", "参加しやすい", "アクセス"],
    rating: 5,
    authorName: "Aoi",
  },
];
