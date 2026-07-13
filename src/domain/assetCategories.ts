import type { AssetCategory, AssetType } from "@/types/entities";

export const ASSET_CATEGORY_OPTIONS: Array<{ value: AssetCategory; label: string }> = [
  { value: "currency", label: "ارز" },
  { value: "metal", label: "فلز گران‌بها" },
  { value: "crypto", label: "رمزارز" },
  { value: "stock", label: "سهام بورسی" },
  { value: "other", label: "سایر" },
];

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = Object.fromEntries(
  ASSET_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
) as Record<AssetCategory, string>;

const CODE_CATEGORY_FALLBACK: Record<string, AssetCategory> = {
  USD: "currency",
  TRY: "currency",
  GOLD: "metal",
  SILVER: "metal",
};

/** Asset types created before `category` existed don't have it set; infer a sensible one from their code. */
export function resolveAssetCategory(assetType: Pick<AssetType, "category" | "code">): AssetCategory {
  return assetType.category ?? CODE_CATEGORY_FALLBACK[assetType.code] ?? "other";
}
