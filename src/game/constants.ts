import { VariantConfig } from "./types";
import { newYorkVariant } from "./variants/new-york";

export const VARIANTS: Record<string, VariantConfig> = {
  "new-york": newYorkVariant,
};

export function getVariant(slug: string): VariantConfig {
  const variant = VARIANTS[slug];
  if (!variant) {
    throw new Error(`Unknown variant: ${slug}`);
  }
  return variant;
}
