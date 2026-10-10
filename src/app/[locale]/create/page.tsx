import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/routing";
import AppBar from "@/components/app/AppBar";
import CreateFlow from "./CreateFlow";

export default async function CreatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      <AppBar />
      <main className="app-big mx-auto max-w-2xl px-6 py-8">
        <CreateFlow />
      </main>
    </>
  );
}
