import Link from "next/link";
import Image from "next/image";
import { Mail, ShieldCheck, Trash2 } from "lucide-react";

export const metadata = {
  title: "Data Deletion Instructions | Chronos Productivity",
  description: "How to request deletion of your Chronos Productivity account data and Meta/WhatsApp platform data.",
};

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-5 py-10 sm:px-8">
        <header className="mb-10 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo-chronos.png" alt="Chronos Productivity" width={44} height={44} className="rounded-xl" />
            <div>
              <p className="text-sm font-black uppercase italic tracking-tight">Chronos Productivity</p>
              <p className="text-xs font-bold text-slate-500">Data deletion instructions</p>
            </div>
          </Link>
        </header>

        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Trash2 className="h-7 w-7" />
          </div>

          <h1 className="mb-4 text-3xl font-black tracking-tight sm:text-4xl">Data Deletion Instructions</h1>
          <p className="mb-8 max-w-2xl text-sm font-medium leading-7 text-slate-600">
            Chronos Productivity allows users and businesses to request deletion of their account data,
            booking data, WhatsApp integration data, and Meta Platform Data processed by Chronos.
          </p>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h2 className="mb-2 flex items-center gap-2 text-base font-black">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                How to request deletion
              </h2>
              <p className="text-sm font-medium leading-7 text-slate-600">
                Send an email to <a className="font-black text-slate-900 underline" href="mailto:copedatoro@gmail.com">copedatoro@gmail.com</a> with
                the subject <span className="font-black">Data Deletion Request</span>. Please include the email address used for your Chronos account
                and, if applicable, the business name connected to WhatsApp.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h2 className="mb-2 text-base font-black">What we delete</h2>
              <p className="text-sm font-medium leading-7 text-slate-600">
                After verifying the request, we delete or anonymize account information, profile data,
                connected WhatsApp Business configuration, booking data, customer data, AI receptionist conversation data,
                and Meta Platform Data that Chronos received through approved Meta permissions.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h2 className="mb-2 text-base font-black">Processing time</h2>
              <p className="text-sm font-medium leading-7 text-slate-600">
                We normally process deletion requests within 30 days. Some records may be retained only where required
                by law, fraud prevention, security, tax, accounting, or dispute-resolution obligations.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <h2 className="mb-2 flex items-center gap-2 text-base font-black">
                <Mail className="h-5 w-5 text-cyan-600" />
                Contact
              </h2>
              <p className="text-sm font-medium leading-7 text-slate-600">
                For privacy or data deletion questions, contact us at{" "}
                <a className="font-black text-slate-900 underline" href="mailto:copedatoro@gmail.com">copedatoro@gmail.com</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
