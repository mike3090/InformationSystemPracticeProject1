import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reviewOrganizationCertification } from "../actions";

type CertificationOrganization = {
  id: string;
  name: string;
  type: string;
  legalName: string | null;
  legalAddress: string | null;
  corporateNumber: string | null;
  representativeName: string | null;
  managerLegalName: string | null;
  managerPhone: string | null;
  contactPersonName: string | null;
  contactPersonEmail: string | null;
  contactPersonPhone: string | null;
  registrationDocumentUrl: string | null;
  bylawsUrl: string | null;
  certificationStatus: string;
  certificationSubmittedAt: Date | null;
  certificationReviewedAt: Date | null;
  certificationReviewNote: string | null;
  user: {
    email: string;
    name: string | null;
  };
};

export default async function CertificationQueuePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/${locale}/auth/signin?callbackUrl=/${locale}/dashboard/certifications`);
  }

  const reviewer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (reviewer?.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  const organizations = await prisma.organization.findMany({
    where: {
      certificationStatus: {
        in: ["under_review", "changes_requested", "rejected", "certified"],
      },
    },
    orderBy: [{ certificationSubmittedAt: "asc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      name: true,
      type: true,
      legalName: true,
      legalAddress: true,
      corporateNumber: true,
      representativeName: true,
      managerLegalName: true,
      managerPhone: true,
      contactPersonName: true,
      contactPersonEmail: true,
      contactPersonPhone: true,
      registrationDocumentUrl: true,
      bylawsUrl: true,
      certificationStatus: true,
      certificationSubmittedAt: true,
      certificationReviewedAt: true,
      certificationReviewNote: true,
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  return (
    <div className="bg-stone-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link
          href={`/${locale}/dashboard`}
          className="text-sm font-semibold text-green-700 hover:text-green-600"
        >
          {locale === "en" ? "Back to dashboard" : "ダッシュボードへ戻る"}
        </Link>

        <header className="mt-6">
          <p className="text-xs font-bold uppercase tracking-wide text-green-700">
            {locale === "en" ? "Admin review" : "管理者レビュー"}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-stone-950">
            {locale === "en" ? "Organizer certification queue" : "主催者認証キュー"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {locale === "en"
              ? "Review private organizer details and grant certification only after the account is trustworthy enough for higher-risk events."
              : "非公開の主催者情報を確認し、高リスク活動にも十分信頼できる場合のみ認証します。"}
          </p>
        </header>

        <section className="mt-8 grid gap-4">
          {organizations.length === 0 ? (
            <p className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">
              {locale === "en"
                ? "No certification requests yet."
                : "認証申請はまだありません。"}
            </p>
          ) : (
            organizations.map((organization) => (
              <CertificationCard
                key={organization.id}
                locale={locale}
                organization={organization}
              />
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function CertificationCard({
  locale,
  organization,
}: {
  locale: string;
  organization: CertificationOrganization;
}) {
  return (
    <article className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-stone-950">{organization.name}</h2>
            <span className={certificationBadgeClass(organization.certificationStatus)}>
              {organization.certificationStatus.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {organization.user.email} · {organization.type}
          </p>
        </div>
        <p className="text-sm text-stone-500">
          {locale === "en" ? "Submitted " : "申請日 "}
          {organization.certificationSubmittedAt
            ? formatDateTime(organization.certificationSubmittedAt, locale)
            : locale === "en"
              ? "not submitted"
              : "未申請"}
        </p>
      </div>

      <dl className="mt-5 grid gap-3 md:grid-cols-3">
        <InfoItem label={locale === "en" ? "Legal name" : "法人正式名称"} value={organization.legalName} />
        <InfoItem label={locale === "en" ? "Legal address" : "法人所在地"} value={organization.legalAddress} />
        <InfoItem label={locale === "en" ? "Corporate number" : "法人番号"} value={organization.corporateNumber} />
        <InfoItem label={locale === "en" ? "Representative" : "代表者"} value={organization.representativeName} />
        <InfoItem label={locale === "en" ? "Manager" : "責任者"} value={organization.managerLegalName} />
        <InfoItem label={locale === "en" ? "Manager phone" : "責任者電話"} value={organization.managerPhone} />
        <InfoItem label={locale === "en" ? "Contact person" : "担当者"} value={organization.contactPersonName} />
        <InfoItem label={locale === "en" ? "Contact email" : "担当者メール"} value={organization.contactPersonEmail} />
        <InfoItem label={locale === "en" ? "Contact phone" : "担当者電話"} value={organization.contactPersonPhone} />
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {organization.registrationDocumentUrl && (
          <a
            href={organization.registrationDocumentUrl}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-green-700 hover:text-green-700"
          >
            {locale === "en" ? "Registration document" : "登記証明"}
          </a>
        )}
        {organization.bylawsUrl && (
          <a
            href={organization.bylawsUrl}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:border-green-700 hover:text-green-700"
          >
            {locale === "en" ? "Bylaws" : "定款/規約"}
          </a>
        )}
      </div>

      {organization.certificationReviewNote && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          {organization.certificationReviewNote}
        </p>
      )}

      <form action={reviewOrganizationCertification} className="mt-5 grid gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="organizationId" value={organization.id} />
        <label className="text-xs font-semibold text-stone-600">
          {locale === "en" ? "Review note" : "審査メモ"}
          <textarea
            name="reviewNote"
            rows={3}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-900 outline-none focus:border-green-700"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            name="certificationAction"
            value="approve"
            className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white hover:bg-green-600"
          >
            {locale === "en" ? "Approve" : "承認"}
          </button>
          <button
            name="certificationAction"
            value="request_changes"
            className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50"
          >
            {locale === "en" ? "Request changes" : "修正依頼"}
          </button>
          <button
            name="certificationAction"
            value="reject"
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            {locale === "en" ? "Reject" : "却下"}
          </button>
        </div>
      </form>
    </article>
  );
}

function InfoItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <dt className="text-xs font-bold uppercase text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-stone-900">
        {value || "—"}
      </dd>
    </div>
  );
}

function certificationBadgeClass(status: string) {
  if (status === "certified") {
    return "rounded-full bg-green-700 px-2.5 py-1 text-xs font-semibold text-white";
  }
  if (status === "under_review") {
    return "rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-800";
  }
  return "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900";
}

function formatDateTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ja-JP", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}
