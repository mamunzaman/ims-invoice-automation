import { redirect } from "next/navigation";
import { getAppSettingsPageData } from "@/lib/actions/app-settings";
import { AppSettingsForm } from "@/components/settings/AppSettingsForm";

export default async function AppSettingsRoutePage() {
  const data = await getAppSettingsPageData();
  if (!data) redirect("/login");

  return <AppSettingsForm initialData={data} />;
}
