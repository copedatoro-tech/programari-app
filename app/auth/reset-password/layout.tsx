import { NextIntlClientProvider } from "next-intl";
import { cookies } from "next/headers";
import { routing } from "@/i18n/routing";

// ⚠️ Acest folder (app/auth/...) e în afara structurii app/[locale]/...,
// deci nu primește automat contextul de traduceri din layout-ul principal.
// Acest layout mic oferă manual acel context, citind limba din cookie-ul
// setat de sistemul de traduceri (fallback: limba implicită).
export default async function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = (routing.locales as readonly string[]).includes(cookieLocale || "")
    ? (cookieLocale as string)
    : routing.defaultLocale;

  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}