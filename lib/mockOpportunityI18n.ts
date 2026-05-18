import type { MockOpportunity, OpportunityTask } from "@/lib/mockOpportunities";

type OpportunityCopy = Partial<
  Pick<MockOpportunity, "title" | "category" | "shortDescription" | "description">
> & {
  tasks?: Record<string, Partial<Pick<OpportunityTask, "name" | "shortDescription" | "fullDescription">>>;
};

const jaOpportunityCopy: Record<string, OpportunityCopy> = {
  "garden-cleanup": {
    title: "地域の花壇整備",
    category: "屋外整備",
    shortDescription:
      "川沿いのコミュニティガーデンで、軽い植え付けや通路の掃除を手伝います。",
    description:
      "初夏に向けて川沿いの花壇を整える活動です。植え付け、通路の掃除、休憩スペースづくりなど、少人数のグループに分かれて作業します。園芸経験がなくても参加できます。",
    tasks: {
      "plant-seedlings": {
        name: "苗を植える",
        shortDescription: "ハーブや夏の花を花壇に植えます。",
        fullDescription:
          "小さなグループで苗を配置し、土をならして水やりをします。始める前に担当者が植え方を説明します。",
      },
      "path-tidying": {
        name: "園路を整える",
        shortDescription: "落ち葉を掃き、歩きやすい通路に整えます。",
        fullDescription:
          "メインの通路を掃き、落ち葉や小枝を集めてコンポスト置き場へ運びます。",
      },
      "tea-table": {
        name: "お茶テーブルの準備",
        shortDescription: "参加者用の休憩テーブルを準備します。",
        fullDescription:
          "カップや軽食、簡単な受付スペースを整え、作業後にみんなが休める場を作ります。",
      },
    },
  },
  "market-support": {
    title: "地域マーケットの運営サポート",
    category: "イベント補助",
    shortDescription:
      "週末マーケットで来場者案内、ブース整理、片付けをサポートします。",
    description:
      "午後の地域マーケット運営チームに参加します。来場者案内から備品補充まで、にぎやかな作業と落ち着いた作業の両方があります。",
    tasks: {
      "visitor-guide": {
        name: "来場者案内",
        shortDescription: "来場者の質問に答え、ブースや休憩所を案内します。",
      },
      "booth-reset": {
        name: "ブース備品の補充",
        shortDescription: "チラシや袋など共有備品を補充します。",
      },
    },
  },
  "craft-workshop": {
    title: "クラフト教室サポート",
    category: "創作ワークショップ",
    shortDescription:
      "落ち着いた地域スタジオで、子どもや高齢者のクラフト作業を手伝います。",
    description:
      "材料の準備、参加者への簡単な手順説明、終了後の片付けを手伝う夕方のワークショップです。",
    tasks: {
      "materials-prep": {
        name: "材料準備",
        shortDescription: "紙、糸、見本作品を各席に並べます。",
      },
      "participant-help": {
        name: "参加者サポート",
        shortDescription: "作業手順で困っている参加者を手伝います。",
      },
    },
  },
  "temple-morning-sweep": {
    title: "お寺の朝掃除",
    category: "屋外整備",
    shortDescription: "朝の静かな時間に、境内の通路や灯籠まわりを掃除します。",
    description:
      "観光客が増える前の時間帯に、お寺の境内を整える活動です。静かな屋外作業が好きな人に向いています。",
    tasks: {
      "stone-path": {
        name: "石畳の掃き掃除",
        shortDescription: "参道の落ち葉やほこりを掃きます。",
      },
      "lantern-wipe": {
        name: "灯籠まわりの拭き掃除",
        shortDescription: "屋外灯籠の台座をやさしく拭きます。",
      },
    },
  },
  "library-shelf-refresh": {
    title: "図書館の棚整理",
    category: "落ち着いた屋内サポート",
    shortDescription:
      "静かな図書館で、返却本の分類や棚ラベルの更新を手伝います。",
    description:
      "手順がはっきりした屋内作業です。静かな環境で集中して作業したいボランティアに向いています。",
    tasks: {
      "book-sorting": {
        name: "返却本の分類",
        shortDescription: "返却本をジャンルや棚ごとに仕分けます。",
      },
      "label-refresh": {
        name: "棚ラベル更新",
        shortDescription: "古くなった棚ラベルを見やすい表示に交換します。",
      },
    },
  },
  "riverbank-picnic-setup": {
    title: "川辺ピクニック設営",
    category: "イベント補助",
    shortDescription:
      "地域の家族向けピクニックで、設営や工作コーナー、片付けを手伝います。",
    description:
      "川辺で開かれるリラックスした地域イベントです。シート設営や簡単なアクティビティ運営をサポートします。",
    tasks: {
      "picnic-layout": {
        name: "ピクニックエリア設営",
        shortDescription: "日陰にマットや低いテーブルを配置します。",
      },
      "kids-craft": {
        name: "子ども工作コーナー",
        shortDescription: "お絵かきや紙工作の簡単な活動をサポートします。",
      },
    },
  },
  "bike-repair-pop-up": {
    title: "自転車修理ポップアップ補助",
    category: "地域修理",
    shortDescription:
      "地域の自転車修理会で、受付、工具運び、安全確認を手伝います。",
    description:
      "修理の専門家と一緒に、地域の人が自転車を安全に使えるよう支える活動です。修理経験がなくても受付や道具運びで参加できます。",
    tasks: {
      "repair-checkin": {
        name: "修理受付",
        shortDescription: "来場者を迎え、必要な修理内容を記録します。",
      },
      "tool-runner": {
        name: "工具運び",
        shortDescription: "工具や小さな部品を修理テーブルへ届けます。",
      },
      "safety-check": {
        name: "安全チェック",
        shortDescription: "チェックリストで修理後の自転車を確認します。",
      },
    },
  },
};

export function localizeMockOpportunity(
  opportunity: MockOpportunity,
  locale: string,
): MockOpportunity {
  if (locale === "en") return opportunity;

  const copy = jaOpportunityCopy[opportunity.id];
  if (!copy) return opportunity;

  return {
    ...opportunity,
    title: copy.title ?? opportunity.title,
    category: copy.category ?? opportunity.category,
    shortDescription: copy.shortDescription ?? opportunity.shortDescription,
    description: copy.description ?? opportunity.description,
    taskFlow: opportunity.taskFlow.map((task) => {
      const taskCopy = copy.tasks?.[task.id];
      return taskCopy ? { ...task, ...taskCopy } : task;
    }),
  };
}

export function localizeMockOpportunities(
  opportunities: MockOpportunity[],
  locale: string,
) {
  return opportunities.map((opportunity) =>
    localizeMockOpportunity(opportunity, locale),
  );
}
