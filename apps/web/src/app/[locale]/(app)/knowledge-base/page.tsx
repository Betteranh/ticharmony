import { getSession } from "@/lib/auth";
import { listKnowledgeArticles, listKnowledgeCategories } from "@/lib/knowledge-base";
import { KnowledgeBaseView } from "@/components/knowledge-base/knowledge-base-view";

export default async function KnowledgeBasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [currentUser, categories, articles] = await Promise.all([
    getSession(),
    listKnowledgeCategories(locale),
    listKnowledgeArticles(locale),
  ]);

  const canManage = Boolean(
    currentUser?.roles.includes("ADMIN") || currentUser?.roles.includes("SUPER_ADMIN"),
  );

  return (
    <KnowledgeBaseView categories={categories} articles={articles} locale={locale} canManage={canManage} />
  );
}
