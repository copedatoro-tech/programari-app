import Image from "next/image";
import Link from "next/link";
import { FileText, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

export const metadata = {
  title: "Terms and Conditions | Chronos Productivity",
  description: "Terms and conditions for using Chronos Productivity.",
};

export default function TermsPage() {
  const t = useTranslations("termeniModal");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-10 sm:px-8">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo-chronos.png" alt="Chronos Productivity" width={44} height={44} className="rounded-xl" />
            <div>
              <p className="text-sm font-black uppercase italic tracking-tight">Chronos Productivity</p>
              <p className="text-xs font-bold text-slate-500">
                {t("title")}{t("titleHighlight")}
              </p>
            </div>
          </Link>
        </header>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <FileText className="h-7 w-7" />
          </div>

          <h1 className="mb-8 text-3xl font-black tracking-tight sm:text-4xl">
            {t("title")}{t("titleHighlight")}
          </h1>

          <div className="space-y-4 text-sm font-medium leading-7 text-slate-600">
            <p>{t("text1")}</p>
            <p>{t("text2")}</p>
            <p>{t("text3")}</p>
            <p>{t("text4")}</p>
            <p>{t("text5")}</p>
            <p className="text-xs font-bold italic text-slate-400">{t("lastUpdated")}</p>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <h2 className="mb-2 flex items-center gap-2 text-base font-black">
              <Mail className="h-5 w-5 text-cyan-600" />
              Contact
            </h2>
            <p className="text-sm font-medium leading-7 text-slate-600">
              {t("contactLabel")}
              <a className="font-black text-slate-900 underline" href="mailto:copedatoro@gmail.com">copedatoro@gmail.com</a>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
