import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Bricolage_Grotesque, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const jbmono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "seo.home" });
  const title = t("title");
  const description = t("description");
  // Every locale is served under its own prefix here (/fr, /en) — the bare
  // "/" is only a redirect shim to the default locale, never a distinct page,
  // so it must not be used as a canonical URL.
  const path = `/${locale}`;

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: {
      canonical: path,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `/${l}`]),
      ),
    },
    icons: {
      icon: [
        { url: "/brand/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/brand/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      ],
    },
    openGraph: {
      title,
      description,
      url: path,
      siteName: "IT4U — TIC Harmony",
      locale: locale === "fr" ? "fr_BE" : "en_GB",
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => (l === "fr" ? "fr_BE" : "en_GB")),
      images: [{ url: "/brand/tic-harmony-logo.png", width: 512, height: 512 }],
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["/brand/tic-harmony-logo.png"],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${bricolage.variable} ${jakarta.variable} ${jbmono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="bg-noise" aria-hidden />
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
