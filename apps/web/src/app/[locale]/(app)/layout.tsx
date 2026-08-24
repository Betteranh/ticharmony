import { redirect } from "@/i18n/navigation";
import { AppShell } from "@/components/app-shell/app-shell";
import { getSession } from "@/lib/auth";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getSession();
  if (!user) {
    redirect({ href: "/login", locale });
  }

  return (
    <AppShell user={user!} locale={locale}>
      {children}
    </AppShell>
  );
}
