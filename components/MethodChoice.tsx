import Link from "next/link";

export default function MethodChoice({
  title,
  body,
  manualHref,
  botHref,
  manualTitle,
  manualBody,
  botTitle,
  botBody,
}: {
  title: string;
  body: string;
  manualHref: string;
  botHref: string;
  manualTitle: string;
  manualBody: string;
  botTitle: string;
  botBody: string;
}) {
  return (
    <section className="mt-8 rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-stone-950">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{body}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Link
          href={manualHref}
          className="rounded-lg border border-stone-200 bg-stone-50 p-5 transition hover:border-green-600 hover:bg-green-50"
        >
          <p className="text-lg font-bold text-stone-950">{manualTitle}</p>
          <p className="mt-2 text-sm leading-6 text-stone-600">{manualBody}</p>
        </Link>
        <Link
          href={botHref}
          className="rounded-lg border border-green-700 bg-green-50 p-5 transition hover:bg-green-100"
        >
          <p className="text-lg font-bold text-green-900">{botTitle}</p>
          <p className="mt-2 text-sm leading-6 text-green-950">{botBody}</p>
        </Link>
      </div>
    </section>
  );
}
