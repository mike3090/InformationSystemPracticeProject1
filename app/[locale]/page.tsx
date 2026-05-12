import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");

  return (
    <div>
      {/* Hero */}
      <section className="bg-green-700 text-white py-24 px-6 text-center">
        <h1 className="text-4xl font-bold mb-4">{t("hero.title")}</h1>
        <p className="text-lg text-green-100 mb-8 max-w-xl mx-auto">
          {t("hero.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={`/${locale}/opportunities`}
            className="bg-white text-green-700 font-semibold px-6 py-3 rounded-full hover:bg-green-50 transition"
          >
            {t("hero.ctaVolunteer")}
          </Link>
          <Link
            href={`/${locale}/opportunities/new`}
            className="border border-white text-white font-semibold px-6 py-3 rounded-full hover:bg-green-600 transition"
          >
            {t("hero.ctaRequester")}
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto py-20 px-6">
        <h2 className="text-2xl font-bold text-center mb-12">{t("howItWorks.title")}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {(
            [
              { num: "01", title: t("howItWorks.step1Title"), desc: t("howItWorks.step1Desc") },
              { num: "02", title: t("howItWorks.step2Title"), desc: t("howItWorks.step2Desc") },
              { num: "03", title: t("howItWorks.step3Title"), desc: t("howItWorks.step3Desc") },
            ] as const
          ).map((step) => (
            <div key={step.num} className="text-center">
              <div className="text-4xl font-black text-green-200 mb-2">{step.num}</div>
              <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
              <p className="text-stone-600 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
