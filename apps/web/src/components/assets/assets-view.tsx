"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import type { Asset, AssetNote, AssetStatus, AssetType, DirectoryUser } from "@/lib/types";
import { relativeTime } from "@/lib/format";

const ASSIGNABLE_TYPES: AssetType[] = ["LAPTOP", "DESKTOP", "OTHER"];
const ASSET_TYPES: AssetType[] = ["LAPTOP", "DESKTOP", "SWITCH", "ROUTER", "SERVER", "PRINTER", "OTHER"];
const ASSET_STATUSES: AssetStatus[] = ["DEPLOYED", "IN_STOCK", "DISABLED", "RETIRED"];

const STATUS_DOT: Record<AssetStatus, string> = {
  DEPLOYED: "bg-status-resolved",
  IN_STOCK: "bg-status-open",
  DISABLED: "bg-status-closed",
  RETIRED: "bg-priority-urgent",
};

type DialogState = { mode: "create" } | { mode: "edit"; asset: Asset } | null;

export function AssetsView({
  tenantId,
  tenantName,
  assets,
  users,
  locale,
  canManage,
}: {
  tenantId: string;
  tenantName: string;
  assets: Asset[];
  users: DirectoryUser[];
  locale: string;
  canManage: boolean;
}) {
  const t = useTranslations("assets");
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "ALL">("ALL");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [viewingAsset, setViewingAsset] = useState<Asset | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((asset) => {
      if (typeFilter !== "ALL" && asset.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && asset.status !== statusFilter) return false;
      if (!q) return true;
      const assigneeName = asset.assignee ? `${asset.assignee.firstName} ${asset.assignee.lastName}` : "";
      return (
        asset.assetTag.toLowerCase().includes(q) ||
        asset.model.toLowerCase().includes(q) ||
        assigneeName.toLowerCase().includes(q)
      );
    });
  }, [assets, query, typeFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/assets"
          className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-tertiary transition-colors hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t("back")}
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">{tenantName}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface p-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 px-2">
          <Search className="h-4 w-4 text-text-tertiary" strokeWidth={1.75} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as AssetType | "ALL")}
          className="rounded-lg border border-hairline bg-surface-raised px-2.5 py-1.5 text-xs text-text-secondary outline-none focus:border-accent/60"
        >
          <option value="ALL">{t("allTypes")}</option>
          {ASSET_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`type.${type}`)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AssetStatus | "ALL")}
          className="rounded-lg border border-hairline bg-surface-raised px-2.5 py-1.5 text-xs text-text-secondary outline-none focus:border-accent/60"
        >
          <option value="ALL">{t("allStatuses")}</option>
          {ASSET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`status.${status}`)}
            </option>
          ))}
        </select>
        {canManage && (
          <button
            onClick={() => setDialog({ mode: "create" })}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent/60 hover:text-text-primary"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
            {t("newAsset")}
          </button>
        )}
      </div>

      {assets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-16 text-center text-sm text-text-tertiary">
          {t("empty")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline-strong bg-surface/50 py-16 text-center text-sm text-text-tertiary">
          {t("noResults")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-hairline bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                <th className="px-5 py-3 font-mono">{t("columns.assetTag")}</th>
                <th className="px-3 py-3">{t("columns.type")}</th>
                <th className="px-3 py-3">{t("columns.model")}</th>
                <th className="px-3 py-3">{t("columns.assignedOrLocation")}</th>
                <th className="px-3 py-3">{t("columns.status")}</th>
                <th className="px-3 py-3 text-right">{t("columns.updatedAt")}</th>
                {canManage && <th className="px-3 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset, i) => (
                <tr
                  key={asset.id}
                  onClick={() => setViewingAsset(asset)}
                  className="animate-rise-in cursor-pointer border-b border-hairline last:border-0 transition-colors hover:bg-surface-hover"
                  style={{ animationDelay: `${i * 25}ms` }}
                >
                  <td className="px-5 py-3.5 font-mono text-text-tertiary">{asset.assetTag}</td>
                  <td className="px-3 py-3.5 text-text-secondary">{t(`type.${asset.type}`)}</td>
                  <td className="px-3 py-3.5 text-text-primary">{asset.model}</td>
                  <td className="px-3 py-3.5">
                    {asset.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar person={asset.assignee} size="sm" />
                        <span className="text-text-secondary">
                          {asset.assignee.firstName} {asset.assignee.lastName}
                        </span>
                      </div>
                    ) : asset.location ? (
                      <span className="text-text-secondary">{asset.location}</span>
                    ) : (
                      <span className="text-text-tertiary">{t("unassigned")}</span>
                    )}
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-raised px-2.5 py-1 text-xs font-medium text-text-primary whitespace-nowrap">
                      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[asset.status]}`} />
                      {t(`status.${asset.status}`)}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-right font-mono text-xs text-text-tertiary">
                    {relativeTime(asset.updatedAt, locale)}
                  </td>
                  {canManage && (
                    <td className="px-3 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDialog({ mode: "edit", asset });
                        }}
                        className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
                        title={t("editAsset")}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog && (
        <AssetDialog
          state={dialog}
          tenantId={tenantId}
          users={users}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      )}

      {viewingAsset && (
        <AssetViewDialog
          asset={viewingAsset}
          locale={locale}
          canManage={canManage}
          onClose={() => setViewingAsset(null)}
          onEdit={() => {
            setDialog({ mode: "edit", asset: viewingAsset });
            setViewingAsset(null);
          }}
        />
      )}
    </div>
  );
}

function AssetViewDialog({
  asset,
  locale,
  canManage,
  onClose,
  onEdit,
}: {
  asset: Asset;
  locale: string;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const t = useTranslations("assets");
  const tf = useTranslations("assets.form");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  return (
    <Modal title={asset.assetTag} onClose={onClose} widthClass="w-[440px]">
      <div className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-medium text-text-tertiary">{tf("typeLabel")}</p>
            <p className="text-text-primary">{t(`type.${asset.type}`)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-text-tertiary">{tf("statusLabel")}</p>
            <p className="flex items-center gap-1.5 text-text-primary">
              <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[asset.status]}`} />
              {t(`status.${asset.status}`)}
            </p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium text-text-tertiary">{tf("modelLabel")}</p>
            <p className="text-text-primary">{asset.model}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium text-text-tertiary">{t("columns.assignedOrLocation")}</p>
            {asset.assignee ? (
              <div className="mt-1 flex items-center gap-2">
                <Avatar person={asset.assignee} size="sm" />
                <span className="text-text-primary">
                  {asset.assignee.firstName} {asset.assignee.lastName}
                </span>
              </div>
            ) : asset.location ? (
              <p className="text-text-primary">{asset.location}</p>
            ) : (
              <p className="text-text-tertiary">{t("unassigned")}</p>
            )}
          </div>
          {asset.serialNumber && (
            <div className="col-span-2">
              <p className="text-xs font-medium text-text-tertiary">{tf("serialNumberLabel")}</p>
              <p className="font-mono text-text-primary">{asset.serialNumber}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="text-xs font-medium text-text-tertiary">{t("updated")}</p>
            <p className="text-text-primary">{relativeTime(asset.updatedAt, locale)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-hairline pt-4">
          <span className="text-xs font-medium text-text-secondary">{t("notes.title")}</span>
          {asset.notes.length === 0 ? (
            <p className="text-xs text-text-tertiary">{t("notes.empty")}</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {asset.notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-hairline bg-surface-raised px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-text-primary">{note.label}</p>
                    <p className="break-words font-mono text-xs text-text-secondary">
                      {note.sensitive && !revealed[note.id]
                        ? "•".repeat(Math.min(note.value.length, 24))
                        : note.value}
                    </p>
                  </div>
                  {note.sensitive && (
                    <button
                      type="button"
                      onClick={() => setRevealed((r) => ({ ...r, [note.id]: !r[note.id] }))}
                      className="shrink-0 rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface hover:text-text-primary"
                    >
                      {revealed[note.id] ? (
                        <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                      ) : (
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
          >
            {tf("cancel")}
          </button>
          {canManage && (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong"
            >
              {t("editAsset")}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function AssetDialog({
  state,
  tenantId,
  users,
  onClose,
  onSaved,
}: {
  state: Exclude<DialogState, null>;
  tenantId: string;
  users: DirectoryUser[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("assets");
  const tf = useTranslations("assets.form");
  const isEdit = state.mode === "edit";

  const [assetTag, setAssetTag] = useState(isEdit ? state.asset.assetTag : "");
  const [type, setType] = useState<AssetType>(isEdit ? state.asset.type : "LAPTOP");
  const [model, setModel] = useState(isEdit ? state.asset.model : "");
  const [status, setStatus] = useState<AssetStatus>(isEdit ? state.asset.status : "IN_STOCK");
  const [assigneeId, setAssigneeId] = useState(isEdit ? (state.asset.assignee?.id ?? "") : "");
  const [location, setLocation] = useState(isEdit ? (state.asset.location ?? "") : "");
  const [serialNumber, setSerialNumber] = useState(isEdit ? (state.asset.serialNumber ?? "") : "");
  const [notes, setNotes] = useState<AssetNote[]>(isEdit ? state.asset.notes : []);
  const [submitting, setSubmitting] = useState(false);

  const isAssignable = ASSIGNABLE_TYPES.includes(type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      assetTag,
      type,
      model,
      status,
      assigneeId: isAssignable && assigneeId ? assigneeId : undefined,
      location: !isAssignable && location ? location : undefined,
      serialNumber: serialNumber || undefined,
    };
    if (isEdit) {
      await fetch(`/api/assets/${tenantId}/${state.asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch(`/api/assets/${tenantId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSubmitting(false);
    onSaved();
  }

  return (
    <Modal title={isEdit ? t("editAsset") : t("newAsset")} onClose={onClose} widthClass="w-[440px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{tf("assetTagLabel")}</span>
            <input
              required
              autoFocus
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{tf("typeLabel")}</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AssetType)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            >
              {ASSET_TYPES.map((assetType) => (
                <option key={assetType} value={assetType}>
                  {t(`type.${assetType}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{tf("modelLabel")}</span>
          <input
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{tf("statusLabel")}</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AssetStatus)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          >
            {ASSET_STATUSES.map((assetStatus) => (
              <option key={assetStatus} value={assetStatus}>
                {t(`status.${assetStatus}`)}
              </option>
            ))}
          </select>
        </label>

        {isAssignable ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{tf("assigneeLabel")}</span>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            >
              <option value="">{t("unassigned")}</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
            <span className="text-xs text-text-tertiary">{tf("assigneeHint")}</span>
          </label>
        ) : (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{tf("locationLabel")}</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
            />
            <span className="text-xs text-text-tertiary">{tf("locationHint")}</span>
          </label>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-secondary">{tf("serialNumberLabel")}</span>
          <input
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            className="w-full rounded-lg border border-hairline bg-surface-raised px-3 py-2 text-sm text-text-primary outline-none focus:border-accent/60"
          />
        </label>

        {isEdit && (
          <AssetNotesSection
            tenantId={tenantId}
            assetId={state.asset.id}
            notes={notes}
            onNotesChange={setNotes}
          />
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary"
          >
            {tf("cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-canvas transition-colors hover:bg-accent-strong disabled:opacity-70"
          >
            {isEdit ? tf("save") : tf("create")}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AssetNotesSection({
  tenantId,
  assetId,
  notes,
  onNotesChange,
}: {
  tenantId: string;
  assetId: string;
  notes: AssetNote[];
  onNotesChange: (notes: AssetNote[]) => void;
}) {
  const tn = useTranslations("assets.notes");
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const [adding, setAdding] = useState(false);

  function preventEnterSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") e.preventDefault();
  }

  async function handleAdd() {
    if (!label.trim() || !value.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/assets/${tenantId}/${assetId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, value, sensitive }),
    });
    setAdding(false);
    if (res.ok) {
      const note = await res.json();
      onNotesChange([...notes, note]);
      setLabel("");
      setValue("");
      setSensitive(false);
    }
  }

  async function handleDelete(noteId: string) {
    const res = await fetch(`/api/assets/${tenantId}/${assetId}/notes/${noteId}`, { method: "DELETE" });
    if (res.ok) {
      onNotesChange(notes.filter((n) => n.id !== noteId));
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-hairline pt-4">
      <span className="text-xs font-medium text-text-secondary">{tn("title")}</span>

      {notes.length === 0 ? (
        <p className="text-xs text-text-tertiary">{tn("empty")}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {notes.map((note) => (
            <div
              key={note.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-hairline bg-surface-raised px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-text-primary">{note.label}</p>
                <p className="break-words font-mono text-xs text-text-secondary">
                  {note.sensitive && !revealed[note.id] ? "•".repeat(Math.min(note.value.length, 24)) : note.value}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {note.sensitive && (
                  <button
                    type="button"
                    onClick={() => setRevealed((r) => ({ ...r, [note.id]: !r[note.id] }))}
                    className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface hover:text-text-primary"
                  >
                    {revealed[note.id] ? (
                      <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
                    ) : (
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="rounded-md p-1 text-text-tertiary transition-colors hover:bg-surface hover:text-priority-urgent"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-hairline-strong p-2.5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={preventEnterSubmit}
          placeholder={tn("labelPlaceholder")}
          className="w-full rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/60"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={preventEnterSubmit}
          placeholder={tn("valuePlaceholder")}
          className="w-full rounded-md border border-hairline bg-surface px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/60"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs text-text-tertiary">
            <input
              type="checkbox"
              checked={sensitive}
              onChange={(e) => setSensitive(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-hairline"
            />
            {tn("sensitive")}
          </label>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !label.trim() || !value.trim()}
            className="flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-accent/60 hover:text-text-primary disabled:opacity-50"
          >
            <Plus className="h-3 w-3" strokeWidth={1.75} />
            {tn("add")}
          </button>
        </div>
      </div>
    </div>
  );
}
