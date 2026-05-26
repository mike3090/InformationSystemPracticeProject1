import { getTranslations } from "next-intl/server";
import Link from "next/link";
import Image from "next/image";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const isJa = locale === "ja";

  const steps = [
    {
      num: "01",
      icon: "📋",
      title: t("howItWorks.step1Title"),
      desc: t("howItWorks.step1Desc"),
      bestFor: isJa ? "主催者向け" : "Organizers",
    },
    {
      num: "02",
      icon: "🔍",
      title: t("howItWorks.step2Title"),
      desc: t("howItWorks.step2Desc"),
      bestFor: isJa ? "ボランティア向け" : "Volunteers",
    },
    {
      num: "03",
      icon: "✨",
      title: t("howItWorks.step3Title"),
      desc: t("howItWorks.step3Desc"),
      bestFor: isJa ? "すべての人向け" : "Everyone",
    },
  ];

  const activityTypes = isJa
    ? [
        "🌾 収穫サポート",
        "🏞️ 公園清掃",
        "🎏 お祭り支援",
        "👴 高齢者ケア",
        "🏫 学校イベント",
        "🌊 河川清掃",
      ]
    : [
        "🌾 Harvest help",
        "🏞️ Park cleanup",
        "🎏 Festival support",
        "👴 Elderly care",
        "🏫 School events",
        "🌊 River cleanup",
      ];

  const featurePills = isJa
    ? ["🆓 無料で使える", "📍 位置情報対応", "🤖 AI搭載", "🌐 日本語 / EN"]
    : ["🆓 Free to use", "📍 Location-aware", "🤖 AI-powered", "🌐 EN / 日本語"];

  const requesterFeatures = isJa
    ? [
        "AIで募集文を自動下書き — すぐに公開",
        "場所・日程・必要スキル・人数を設定",
        "応募メッセージをすべて確認してから決定",
        "承認・辞退をワンクリックで完了",
        "リストをいつでも編集・終了できる",
        "日本語・英語どちらでも投稿可能",
      ]
    : [
        "AI drafts your listing — live in minutes",
        "Set location, date, required skills & headcount",
        "Review every applicant's message before deciding",
        "Accept or decline with one click",
        "Edit or close listings at any time",
        "Post in English or Japanese",
      ];

  const volunteerFeatures = isJa
    ? [
        "場所・カテゴリ・日程・負荷で絞り込み",
        "AIがあなたのプロフィールに合う活動をランク付け",
        "応募前に過去の体験投稿を読める",
        "1分以内に個人メッセージ付きで応募",
        "マイイベントで予定を一元管理",
        "経験をシェアして次の人を後押し",
      ]
    : [
        "Filter by location, category, date, or effort",
        "AI ranks opportunities to match your profile",
        "Read real experience posts before applying",
        "Apply with a personal note in under a minute",
        "Track upcoming commitments in My Events",
        "Share your experience to inspire others",
      ];

  return (
    <div className="bg-stone-50">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-green-800">
        <div className="pointer-events-none absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full bg-green-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-lime-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          {/* Logo + headline row */}
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:gap-16">
            <div className="flex-shrink-0">
              <div className="relative h-44 w-44 overflow-hidden rounded-3xl border-4 border-white/20 bg-white shadow-2xl shadow-black/40 lg:h-56 lg:w-56">
                <Image
                  src="/gtg_logo1.png"
                  alt="Go Touch Grass logo"
                  fill
                  className="object-contain p-3"
                  priority
                />
              </div>
            </div>

            <div className="text-center lg:text-left">
              <span className="inline-block rounded-full bg-white/10 px-4 py-1 text-xs font-bold uppercase tracking-widest text-green-200 ring-1 ring-white/20">
                🌿 Go Touch Grass
              </span>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                {t("hero.title")}
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-green-100">
                {t("hero.subtitle")}
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href={`/${locale}/opportunities`}
                  className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-green-900 shadow-lg shadow-black/20 transition hover:bg-green-50 hover:shadow-xl"
                >
                  {t("hero.ctaVolunteer")}
                </Link>
                <Link
                  href={`/${locale}/opportunities/new`}
                  className="rounded-full border-2 border-white/50 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  {t("hero.ctaRequester")}
                </Link>
              </div>

              {/* Feature pills */}
              <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                {featurePills.map((pill) => (
                  <span
                    key={pill}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-green-200 ring-1 ring-white/15"
                  >
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Activity types strip */}
          <div className="mt-12 border-t border-white/10 pt-8">
            <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-green-400 lg:text-left">
              {isJa ? "活動の種類（例）" : "Activities on the platform"}
            </p>
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {activityTypes.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm text-green-100"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">
            {isJa ? "シンプルな流れ" : "Simple process"}
          </p>
          <h2 className="mt-2 text-3xl font-black text-stone-900">
            {t("howItWorks.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
            {isJa
              ? "主催者もボランティアも、3ステップで始められます。"
              : "Whether you're organizing or volunteering, three steps get you started."}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="relative flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white p-7 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{step.icon}</span>
                <span className="text-xs font-black tracking-widest text-green-700/50">
                  {step.num}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-stone-900">
                {step.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">
                {step.desc}
              </p>
              {/* Best for badge */}
              <div className="mt-5 border-t border-stone-100 pt-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  {isJa ? "対象：" : "Best for: "}
                  {step.bestFor}
                </span>
              </div>
              {/* Watermark */}
              <div className="pointer-events-none absolute -bottom-3 -right-3 select-none text-7xl opacity-[0.04]">
                {step.icon}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── For Requesters / For Volunteers ── */}
      <section className="bg-green-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-green-700">
              {isJa ? "だれでも使える" : "Built for everyone"}
            </p>
            <h2 className="mt-2 text-3xl font-black text-stone-900">
              {isJa ? "あなたの役割に合わせて" : "Whether you give or receive"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-stone-500">
              {isJa
                ? "一つのプラットフォームで、主催者もボランティアも必要なものがすべて揃っています。"
                : "One platform, two sides — everything organizers and volunteers need to make it work."}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Requesters */}
            <div className="flex flex-col rounded-2xl border border-green-200 bg-white p-8 shadow-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl">
                🏘️
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                {isJa ? "活動主催者向け" : "For Requesters"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {isJa
                  ? "個人・事業者・学校・NPOを問わず、人手が必要なら Go Touch Grass が適切なボランティアを探します。一度投稿すれば、あとはすべて一か所で管理できます。"
                  : "Whether you're a resident, business, school, or nonprofit — if you need a hand, we'll find you the right volunteer. Post once, manage everything in one place."}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-stone-700">
                {requesterFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 font-bold text-green-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/opportunities/new`}
                className="mt-7 block rounded-full bg-green-700 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-green-600"
              >
                {t("hero.ctaRequester")}
              </Link>
            </div>

            {/* Volunteers */}
            <div className="flex flex-col rounded-2xl border border-green-200 bg-white p-8 shadow-sm">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl">
                🌱
              </div>
              <h3 className="text-xl font-bold text-stone-900">
                {isJa ? "ボランティア向け" : "For Volunteers"}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                {isJa
                  ? "週末の単発イベントから季節の農作業まで、スケジュール・スキル・体力に合った活動を見つけて、本当に必要とされている人を助けられます。"
                  : "From one-off weekend events to seasonal farm work, find meaningful contributions near you that fit your schedule, skills, and energy — and real people who need you."}
              </p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-stone-700">
                {volunteerFeatures.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 font-bold text-green-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/opportunities`}
                className="mt-7 block rounded-full bg-green-700 px-5 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-green-600"
              >
                {t("hero.ctaVolunteer")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative overflow-hidden bg-green-900 py-20 text-center text-white">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center select-none opacity-5">
          <span className="text-[20rem] leading-none">🌿</span>
        </div>
        <div className="relative mx-auto max-w-2xl px-6">
          <p className="text-4xl">🌿</p>
          <h2 className="mt-4 text-3xl font-black">
            {isJa ? "さあ、始めましょう" : "Ready to make a difference?"}
          </h2>
          <p className="mt-4 text-lg text-green-200">
            {isJa
              ? "地域をつなぐコミュニティに参加しましょう。"
              : "Join the community connecting neighbors across small-town Japan."}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/${locale}/opportunities`}
              className="rounded-full bg-white px-7 py-3.5 text-sm font-bold text-green-900 shadow-lg transition hover:bg-green-50"
            >
              {t("hero.ctaVolunteer")}
            </Link>
            <Link
              href={`/${locale}/opportunities/new`}
              className="rounded-full border-2 border-white/50 px-7 py-3.5 text-sm font-bold text-white transition hover:bg-white/10"
            >
              {t("hero.ctaRequester")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
