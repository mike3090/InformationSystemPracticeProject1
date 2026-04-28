import { redirect } from "next/navigation";

// Root "/" redirects to the default locale home
export default function RootPage() {
  redirect("/ja");
}
