"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, FileText, Pencil, Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";
import type { KnowledgeArticle, KnowledgeCategory } from "@/lib/types";
import { relativeTime } from "@/lib/format";

type CategoryDialogState = { mode: "create" } | { mode: "edit"; category: KnowledgeCategory } | null;
type ArticleDialogState =
  | { mode: "create"; categoryId: string }
  | { mode: "edit"; article: KnowledgeArticle }
  | null;

export function KnowledgeBaseView({
  categories,
  articles,
  locale,
  canManage,
}: {
  categories: KnowledgeCategory[];
  articles: KnowledgeArticle[];
  locale: string;
  canManage: boolean;
}) {
  const t = useTranslations("knowledgeBase");
  const tc = useTranslations("common");
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categories[0]?.id ?? null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialogState>(null);
  const [articleDialog, setArticleDialog] = useState<ArticleDialogState>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;

  const categoryArticles = useMemo(() => {
    const inCategory = articles.filter((a) => a.categoryId === selectedCategoryId);
    const q = query.trim().toLowerCase();
    if (!q) return inCategory;
    return inCategory.filter((a) => a.title.toLowerCase().includes(q));
  }, [articles, selectedCategoryId, query]);

  const selectedArticle = articles.find((a) => a.id === selectedArticleId) ?? null;

  function selectCategory(id: string) {
    setSelectedCategoryId(id);
    setSelectedArticleId(null);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">{t("title")}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <nav className="flex h-fit flex-col gap-0.5 rounded-xl border border-hairline bg-surface p-2">
          {categories.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-tertiary">{t("emptyCategories")}</p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className={`group flex items-center gap-1 rounded-lg text-sm transition-colors ${
                  category.id === selectedCategoryId
                    ? "bg-surface-raised text-text-primary"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                }`}
              >
                <button
                  onClick={() => selectCategory(category.id)}
                  className="flex flex-1 items-center justify-between gap-2 px-3 py-2 text-left"
                >
                  <span className="truncate">{category.name}</span>
                  <span className="font-mono text-xs text-text-tertiary">{category.articleCount}</span>
                </button>
                {canManage && (
                  <button
                    onClick={() => setCategoryDialog({ mode: "edit", category })}
                    className="mr-1.5 rounded-md p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-surface hover:text-text-primary group-hover:opacity-100"
                    title={t("editCategory")}
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            ))
          )}

          {canManage && (
            <button
              onClick={() => setCategoryDialog({ mode: "create" })}
              className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-hairline-strong px-3 py-2 text-left text-sm text-text-tertiary transition-colors hover:border-accent/60 hover:text-text-primary"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
              {t("newCategory")}
            </button>
          )}
        </nav>

        <div className="min-h-[320px] rounded-xl border border-hairline bg-surface">
          {selectedArticle ? (
            <div className="p-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setSelectedArticleId(null)}
                  className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-tertiary transition-colors hover:text-text-primary"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {t("back")}
                </button>
                {canManage && (
                  <button
                    onClick={() => setArticleDialog({ mode: "edit", article: selectedArticle })}
                    className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary transition-colors hover:text-text-primary"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {t("editArticle")}
                  </button>
                )}
              </div>
              <h2 className="mt-4 font-display text-lg font-semibold text-text-primary">{selectedArticle.title}</h2>
              <p className="mt-1 text-xs text-text-tertiary">
                {t("updated")} {relativeTime(selectedArticle.updatedAt, locale)}
              </p>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                {selectedArticle.body}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
                <Search className="h-4 w-4 text-text-tertiary" strokeWidth={1.75} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
                />
                {canManage && selectedCategory && (
                  <button
                    onClick={() => setArticleDialog({ mode: "create", categoryId: selectedCategory.id })}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent/60 hover:text-text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {t("newArticle")}
                  </button>
                )}
              </div>

              {!selectedCategory ? (
                <p className="px-4 py-16 text-center text-sm text-text-tertiary">{t("selectCategory")}</p>
              ) : categoryArticles.length === 0 ? (
                <p className="px-4 py-16 text-center text-sm text-text-tertiary">{t("emptyArticles")}</p>
              ) : (
                <div>
                  {categoryArticles.map((article) => (
                    <div
                      key={article.id}
                      className="group flex w-full items-center justify-between gap-3 border-b border-hairline px-4 py-3 transition-colors last:border-0 hover:bg-surface-raised"
                    >
                      <button
                        onClick={() => setSelectedArticleId(article.id)}
                        className="flex flex-1 items-center gap-3 overflow-hidden text-left"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-text-secondary">
                          <FileText className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        <div className="overflow-hidden">
                          <p className="truncate text-sm font-medium text-text-primary">{article.title}</p>
                          <p className="truncate text-xs text-text-tertiary">
                            {t("updated")} {relativeTime(article.updatedAt, locale)}
                          </p>
                        </div>
                      </button>
                      {canManage && (
                        <button
                          onClick={() => setArticleDialog({ mode: "edit", article })}
                          className="rounded-md p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-surface hover:text-text-primary group-hover:opacity-100"
                          title={t("editArticle")}
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        </button>
                      )}
                      <ChevronRight
                        className="h-4 w-4 shrink-0 text-text-tertiary"
                        strokeWidth={1.75}
                        onClick={() => setSelectedArticleId(article.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {categoryDialog && (
        <CategoryDialog
          state={categoryDialog}
          labels={{
            createTitle: t("newCategory"),
            editTitle: t("editCategory"),
            nameLabel: t("categoryNameLabel"),
            create: t("create"),
            save: tc("save"),
            cancel: tc("cancel"),
          }}
          onClose={() => setCategoryDialog(null)}
          onSaved={() => {
            setCategoryDialog(null);
            router.refresh();
          }}
        />
      )}

      {articleDialog && (
        <ArticleDialog
          state={articleDialog}
          categories={categories}
          labels={{
            createTitle: t("newArticle"),
            editTitle: t("editArticle"),
            titleLabel: t("articleTitleLabel"),
            bodyLabel: t("articleBodyLabel"),
            categoryLabel: t("categoryLabel"),
            visibilityLabel: t("visibilityLabel"),
            visibilityInternal: t("visibilityInternal"),
            visibilityPublic: t("visibilityPublic"),
            translationNote: t("translationNote"),
            create: t("create"),
            save: tc("save"),
            cancel: tc("cancel"),
          }}
          onClose={() => setArticleDialog(null)}
          onSaved={() => {
            setArticleDialog(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function CategoryDialog({
  state,
  labels,
  onClose,
  onSaved,
}: {
  state: Exclude<CategoryDialogState, null>;
  labels: {
    createTitle: string;
    editTitle: string;
    nameLabel: string;
    create: string;
    save: string;
    cancel: string;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = state.mode === "edit";
  const [nameFr, setNameFr] = useState(isEdit ? state.category.name : "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (isEdit) {
      await fetch(`/api/knowledge-base/categories/${state.category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameFr }),
      });
    } else {
      await fetch("/api/knowledge-base/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nameFr }),
      });
    }
    setSubmitting(false);
    onSaved();
  }

  return (
    <Modal title={isEdit ? labels.editTitle : labels.createTitle} onClose={onClose} widthClass="w-[380px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.nameLabel}</span>
          <input
            required
            autoFocus
            value={nameFr}
            onChange={(e) => setNameFr(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-70"
          >
            {isEdit ? labels.save : labels.create}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ArticleDialog({
  state,
  categories,
  labels,
  onClose,
  onSaved,
}: {
  state: Exclude<ArticleDialogState, null>;
  categories: KnowledgeCategory[];
  labels: {
    createTitle: string;
    editTitle: string;
    titleLabel: string;
    bodyLabel: string;
    categoryLabel: string;
    visibilityLabel: string;
    visibilityInternal: string;
    visibilityPublic: string;
    translationNote: string;
    create: string;
    save: string;
    cancel: string;
  };
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = state.mode === "edit";
  const [categoryId, setCategoryId] = useState(isEdit ? (state.article.categoryId ?? "") : state.categoryId);
  const [titleFr, setTitleFr] = useState(isEdit ? state.article.title : "");
  const [bodyFr, setBodyFr] = useState(isEdit ? state.article.body : "");
  const [visibility, setVisibility] = useState<"INTERNAL" | "PUBLIC">(
    isEdit ? state.article.visibility : "INTERNAL",
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = { categoryId, titleFr, bodyFr, visibility };
    if (isEdit) {
      await fetch(`/api/knowledge-base/articles/${state.article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/knowledge-base/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSubmitting(false);
    onSaved();
  }

  return (
    <Modal title={isEdit ? labels.editTitle : labels.createTitle} onClose={onClose} widthClass="w-[480px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.categoryLabel}</span>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.titleLabel}</span>
          <input
            required
            autoFocus
            value={titleFr}
            onChange={(e) => setTitleFr(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.bodyLabel}</span>
          <textarea
            required
            rows={6}
            value={bodyFr}
            onChange={(e) => setBodyFr(e.target.value)}
            className="w-full resize-none rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{labels.visibilityLabel}</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "INTERNAL" | "PUBLIC")}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          >
            <option value="INTERNAL">{labels.visibilityInternal}</option>
            <option value="PUBLIC">{labels.visibilityPublic}</option>
          </select>
        </label>

        <p className="text-xs text-text-tertiary">{labels.translationNote}</p>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-70"
          >
            {isEdit ? labels.save : labels.create}
          </button>
        </div>
      </form>
    </Modal>
  );
}
