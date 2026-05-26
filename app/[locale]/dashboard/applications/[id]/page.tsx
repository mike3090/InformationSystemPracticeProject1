import { redirect } from "next/navigation";

export default async function LegacyDashboardApplicationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect(`/${locale}/my-events/applications/${id}`);
}
