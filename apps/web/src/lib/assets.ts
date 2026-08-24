import { apiFetch } from "@/lib/api";
import type { Asset, AssetStatus, AssetType, UserRole } from "@/lib/types";

interface ApiAssignee {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  roles: UserRole[];
}

interface ApiAssetNote {
  id: string;
  label: string;
  value: string;
  sensitive: boolean;
  updatedAt: string;
}

interface ApiAsset {
  id: string;
  assetTag: string;
  type: AssetType;
  model: string;
  status: AssetStatus;
  location: string | null;
  serialNumber: string | null;
  assignee: ApiAssignee | null;
  notes: ApiAssetNote[];
  updatedAt: string;
}

export async function listAssets(tenantId: string): Promise<Asset[]> {
  const assets = await apiFetch<ApiAsset[]>(`/assets/${tenantId}`);
  return assets.map((asset) => ({
    id: asset.id,
    assetTag: asset.assetTag,
    type: asset.type,
    model: asset.model,
    status: asset.status,
    location: asset.location,
    serialNumber: asset.serialNumber,
    assignee: asset.assignee,
    notes: asset.notes,
    updatedAt: asset.updatedAt,
  }));
}
